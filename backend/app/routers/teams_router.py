from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta, timezone
import secrets

from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.models.team import Team, Invitation, InvitationStatus

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teams", tags=["teams"])


# ── Schemas ───────────────────────────────────────────────────
class TeamResponse(BaseModel):
    id:         str
    name:       str
    owner_id:   Optional[str]
    created_at: datetime


class InvitationRequest(BaseModel):
    email: EmailStr
    role:  str = "analyst"


class InvitationResponse(BaseModel):
    id:         str
    email:      str
    role:       str
    status:     str
    expires_at: datetime
    created_at: datetime


# ── GET /teams ────────────────────────────────────────────────
@router.get("", response_model=list[TeamResponse])
async def list_teams(
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all teams the current user owns."""
    result = await db.execute(
        select(Team).where(Team.owner_id == current_user.id)
    )
    return [
        TeamResponse(
            id         = str(t.id),
            name       = t.name,
            owner_id   = str(t.owner_id) if t.owner_id else None,
            created_at = t.created_at,
        )
        for t in result.scalars().all()
    ]


# ── POST /teams ───────────────────────────────────────────────
class CreateTeamRequest(BaseModel):
    name: str


@router.post("", response_model=TeamResponse, status_code=201)
async def create_team(
    body:         CreateTeamRequest,
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new team owned by the current user."""
    team = Team(name=body.name.strip(), owner_id=current_user.id)
    db.add(team)
    await db.commit()
    await db.refresh(team)
    logger.info(f"Team '{team.name}' created by {current_user.email}")
    return TeamResponse(
        id         = str(team.id),
        name       = team.name,
        owner_id   = str(team.owner_id),
        created_at = team.created_at,
    )


# ── GET /teams/{team_id}/invitations ──────────────────────────
@router.get("/{team_id}/invitations", response_model=list[InvitationResponse])
async def list_invitations(
    team_id:      str,
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all invitations for a team. Only the team owner can view."""
    team = await _get_owned_team(db, team_id, current_user.id)
    result = await db.execute(
        select(Invitation)
        .where(Invitation.team_id == team.id)
        .order_by(Invitation.created_at.desc())
    )
    return [_inv_response(inv) for inv in result.scalars().all()]


# ── POST /teams/{team_id}/invitations ─────────────────────────
@router.post("/{team_id}/invitations", response_model=InvitationResponse, status_code=201)
async def send_invitation(
    team_id:      str,
    body:         InvitationRequest,
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Invite someone to a team by email.
    Generates a secure token — in production this token would be emailed.
    """
    team = await _get_owned_team(db, team_id, current_user.id)

    # Check for existing pending invite
    existing = await db.execute(
        select(Invitation).where(
            Invitation.team_id == team.id,
            Invitation.email   == body.email,
            Invitation.status  == InvitationStatus.pending,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A pending invitation already exists for {body.email}",
        )

    inv = Invitation(
        team_id    = team.id,
        email      = body.email,
        role       = body.role,
        token      = secrets.token_urlsafe(32),
        status     = InvitationStatus.pending,
        expires_at = datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)

    logger.info(f"Invitation sent to {body.email} for team {team.name} by {current_user.email}")
    # TODO Phase 3: send email with inv.token via SMTP
    return _inv_response(inv)


# ── DELETE /teams/{team_id}/invitations/{inv_id} ──────────────
@router.delete("/{team_id}/invitations/{inv_id}", status_code=204)
async def revoke_invitation(
    team_id:      str,
    inv_id:       str,
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Revoke a pending invitation."""
    await _get_owned_team(db, team_id, current_user.id)

    result = await db.execute(
        select(Invitation).where(
            Invitation.id      == inv_id,
            Invitation.team_id == team_id,
        )
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    inv.status = InvitationStatus.revoked
    await db.commit()
    logger.info(f"Invitation {inv_id} revoked by {current_user.email}")


# ── Helpers ───────────────────────────────────────────────────
async def _get_owned_team(db: AsyncSession, team_id: str, user_id) -> Team:
    result = await db.execute(
        select(Team).where(Team.id == team_id, Team.owner_id == user_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found or access denied")
    return team


def _inv_response(inv: Invitation) -> InvitationResponse:
    return InvitationResponse(
        id         = str(inv.id),
        email      = inv.email,
        role       = inv.role,
        status     = inv.status.value,
        expires_at = inv.expires_at,
        created_at = inv.created_at,
    )