from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
import pyotp
import qrcode
import io
import base64
import secrets
import hashlib

from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.models.recovery_code import RecoveryCode

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/totp", tags=["totp"])

RECOVERY_CODE_COUNT = 10


# ── Helpers ───────────────────────────────────────────────────
def _generate_recovery_codes() -> tuple[list[str], list[str]]:
    """Returns (plain_codes, hashed_codes). Plain shown once, hashes stored."""
    plain  = [secrets.token_hex(4).upper() + '-' + secrets.token_hex(4).upper() for _ in range(RECOVERY_CODE_COUNT)]
    hashed = [hashlib.sha256(c.encode()).hexdigest() for c in plain]
    return plain, hashed


async def _save_recovery_codes(db: AsyncSession, user_id, hashed_codes: list[str]) -> None:
    """Delete existing codes and insert fresh ones."""
    await db.execute(delete(RecoveryCode).where(RecoveryCode.user_id == user_id))
    for h in hashed_codes:
        db.add(RecoveryCode(user_id=user_id, code_hash=h))
    await db.commit()


# ── Schemas ───────────────────────────────────────────────────
class TOTPSetupResponse(BaseModel):
    secret:         str
    qr_code:        str
    otpauth_url:    str
    recovery_codes: list[str]


class TOTPVerifyRequest(BaseModel):
    code: str


class TOTPStatusResponse(BaseModel):
    enabled:                  bool
    remaining_recovery_codes: int


class RecoveryCodesResponse(BaseModel):
    recovery_codes: list[str]


# ── POST /auth/totp/setup ─────────────────────────────────────
@router.post("/setup", response_model=TOTPSetupResponse)
async def totp_setup(
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    secret = pyotp.random_base32()
    totp   = pyotp.TOTP(secret)
    otpauth_url = totp.provisioning_uri(
        name        = current_user.email,
        issuer_name = "War Room Bid Intelligence",
    )

    qr  = qrcode.make(otpauth_url)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    plain_codes, hashed_codes = _generate_recovery_codes()
    await _save_recovery_codes(db, current_user.id, hashed_codes)

    current_user.totp_secret  = secret
    current_user.totp_enabled = False
    await db.commit()

    logger.info(f"TOTP setup initiated for {current_user.email}")
    return TOTPSetupResponse(
        secret         = secret,
        qr_code        = qr_b64,
        otpauth_url    = otpauth_url,
        recovery_codes = plain_codes,
    )


# ── POST /auth/totp/verify ────────────────────────────────────
@router.post("/verify", response_model=TOTPStatusResponse)
async def totp_verify(
    body:         TOTPVerifyRequest,
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA setup not initiated.")

    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid or expired code. Please try again.")

    current_user.totp_enabled = True
    await db.commit()

    result = await db.execute(
        select(RecoveryCode).where(
            RecoveryCode.user_id == current_user.id,
            ~RecoveryCode.is_used,
        )
    )
    remaining = len(result.scalars().all())
    logger.info(f"2FA enabled for {current_user.email}")
    return TOTPStatusResponse(enabled=True, remaining_recovery_codes=remaining)


# ── DELETE /auth/totp ─────────────────────────────────────────
@router.delete("", response_model=TOTPStatusResponse)
async def totp_disable(
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is not currently enabled.")

    current_user.totp_secret  = None
    current_user.totp_enabled = False
    await db.execute(delete(RecoveryCode).where(RecoveryCode.user_id == current_user.id))
    await db.commit()

    logger.info(f"2FA disabled for {current_user.email}")
    return TOTPStatusResponse(enabled=False, remaining_recovery_codes=0)


# ── GET /auth/totp/status ─────────────────────────────────────
@router.get("/status", response_model=TOTPStatusResponse)
async def totp_status(
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(RecoveryCode).where(
            RecoveryCode.user_id == current_user.id,
            ~RecoveryCode.is_used,
        )
    )
    remaining = len(result.scalars().all())
    return TOTPStatusResponse(
        enabled                  = bool(current_user.totp_enabled),
        remaining_recovery_codes = remaining,
    )


# ── POST /auth/totp/recovery-codes/regenerate ─────────────────
@router.post("/recovery-codes/regenerate", response_model=RecoveryCodesResponse)
async def regenerate_recovery_codes(
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA must be enabled to regenerate recovery codes.")

    plain_codes, hashed_codes = _generate_recovery_codes()
    await _save_recovery_codes(db, current_user.id, hashed_codes)

    logger.info(f"Recovery codes regenerated for {current_user.email}")
    return RecoveryCodesResponse(recovery_codes=plain_codes)