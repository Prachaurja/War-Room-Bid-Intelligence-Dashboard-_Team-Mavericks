from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import secrets
import hashlib

from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.models.api_key import ApiKey

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api-keys", tags=["api-keys"])

# Key format: wr_live_<32 random chars>
KEY_PREFIX = "wr_live_"
MAX_KEYS_PER_USER = 10


# ── Helpers ───────────────────────────────────────────────────
def generate_api_key() -> tuple[str, str, str]:
    """Returns (full_key, key_hash, prefix_shown_in_ui)."""
    random_part = secrets.token_urlsafe(32)
    full_key    = f"{KEY_PREFIX}{random_part}"
    key_hash    = hashlib.sha256(full_key.encode()).hexdigest()
    prefix      = full_key[:12]   # e.g. "wr_live_AbCd"
    return full_key, key_hash, prefix


# ── Schemas ───────────────────────────────────────────────────
class CreateApiKeyRequest(BaseModel):
    name: str   # human label e.g. "Zapier Integration"


class ApiKeyCreatedResponse(BaseModel):
    id:         str
    name:       str
    key:        str   # full key — shown ONCE only
    prefix:     str
    created_at: datetime


class ApiKeyResponse(BaseModel):
    id:           str
    name:         str
    prefix:       str
    is_active:    bool
    last_used_at: Optional[datetime]
    created_at:   datetime


# ── GET /api-keys ─────────────────────────────────────────────
@router.get("", response_model=list[ApiKeyResponse])
async def list_api_keys(
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all API keys for the current user. Full key is never returned."""
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .order_by(ApiKey.created_at.desc())
    )
    return [
        ApiKeyResponse(
            id           = str(k.id),
            name         = k.name,
            prefix       = k.prefix,
            is_active    = k.is_active,
            last_used_at = k.last_used_at,
            created_at   = k.created_at,
        )
        for k in result.scalars().all()
    ]


# ── POST /api-keys ────────────────────────────────────────────
@router.post("", response_model=ApiKeyCreatedResponse, status_code=201)
async def create_api_key(
    body:         CreateApiKeyRequest,
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Generate a new API key.
    The full key is returned ONCE — it cannot be retrieved again.
    Store it securely immediately.
    """
    # Enforce per-user key limit
    count_result = await db.execute(
        select(ApiKey).where(
            ApiKey.user_id   == current_user.id,
            ApiKey.is_active,
        )
    )
    if len(count_result.scalars().all()) >= MAX_KEYS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum of {MAX_KEYS_PER_USER} active API keys allowed. Revoke one first.",
        )

    full_key, key_hash, prefix = generate_api_key()

    api_key = ApiKey(
        user_id  = current_user.id,
        name     = body.name.strip(),
        key_hash = key_hash,
        prefix   = prefix,
        is_active = True,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    logger.info(f"API key '{body.name}' created for {current_user.email}")

    return ApiKeyCreatedResponse(
        id         = str(api_key.id),
        name       = api_key.name,
        key        = full_key,   # returned ONCE
        prefix     = api_key.prefix,
        created_at = api_key.created_at,
    )


# ── DELETE /api-keys/{key_id} ─────────────────────────────────
@router.delete("/{key_id}", status_code=204)
async def revoke_api_key(
    key_id:       str,
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Revoke (deactivate) an API key. Does not delete — preserves audit trail."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id      == key_id,
            ApiKey.user_id == current_user.id,
        )
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    key.is_active = False
    await db.commit()
    logger.info(f"API key {key_id} revoked by {current_user.email}")