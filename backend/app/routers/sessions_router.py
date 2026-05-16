from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import hashlib

from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.models.session import Session

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ── Helpers ───────────────────────────────────────────────────
def hash_token(token: str) -> str:
    """SHA-256 hash of a JWT for safe storage."""
    return hashlib.sha256(token.encode()).hexdigest()


# ── Schemas ───────────────────────────────────────────────────
class SessionResponse(BaseModel):
    id:             str
    ip_address:     Optional[str]
    user_agent:     Optional[str]
    created_at:     datetime
    last_active_at: datetime
    is_active:      bool
    is_current:     bool  # True if this is the session making the request


# ── Register session on login ─────────────────────────────────
async def record_session(
    db:         AsyncSession,
    user_id:    str,
    token:      str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """Called from auth_router after successful login to record the session."""
    session = Session(
        user_id      = user_id,
        token_hash   = hash_token(token),
        ip_address   = ip_address,
        user_agent   = user_agent,
        is_active    = True,
    )
    db.add(session)
    await db.commit()
    logger.info(f"Session recorded for user {user_id} from {ip_address}")


# ── GET /sessions ─────────────────────────────────────────────
@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    request:      Request,
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all active sessions for the current user."""
    result = await db.execute(
        select(Session)
        .where(Session.user_id == current_user.id, Session.is_active)
        .order_by(Session.last_active_at.desc())
    )
    sessions = result.scalars().all()

    # Identify the current session by matching the request token
    auth_header = request.headers.get("Authorization", "")
    current_token_hash = ""
    if auth_header.startswith("Bearer "):
        current_token_hash = hash_token(auth_header[7:])

    return [
        SessionResponse(
            id             = str(s.id),
            ip_address     = s.ip_address,
            user_agent     = s.user_agent,
            created_at     = s.created_at,
            last_active_at = s.last_active_at,
            is_active      = s.is_active,
            is_current     = s.token_hash == current_token_hash,
        )
        for s in sessions
    ]


# ── DELETE /sessions/{session_id} ─────────────────────────────
@router.delete("/{session_id}", status_code=204)
async def revoke_session(
    session_id:   str,
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Revoke a specific session. Users can only revoke their own sessions."""
    result = await db.execute(
        select(Session).where(
            Session.id      == session_id,
            Session.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session.is_active = False
    await db.commit()
    logger.info(f"Session {session_id} revoked by user {current_user.email}")


# ── DELETE /sessions ──────────────────────────────────────────
@router.delete("", status_code=204)
async def revoke_all_sessions(
    request:      Request,
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Revoke all sessions except the current one."""
    auth_header = request.headers.get("Authorization", "")
    current_token_hash = ""
    if auth_header.startswith("Bearer "):
        current_token_hash = hash_token(auth_header[7:])

    result = await db.execute(
        select(Session).where(
            Session.user_id  == current_user.id,
            Session.is_active,
            Session.token_hash != current_token_hash,
        )
    )
    sessions = result.scalars().all()
    for s in sessions:
        s.is_active = False
    await db.commit()
    logger.info(f"All other sessions revoked for user {current_user.email}")