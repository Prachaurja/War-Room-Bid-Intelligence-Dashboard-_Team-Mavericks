from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.core.dependencies import get_db
from app.core.security import get_current_user, verify_password, hash_password
from app.services.auth_service import (
    authenticate_user, create_user, build_token_response, get_user_by_email
)
from app.models.recovery_code import RecoveryCode
import pyotp
import hashlib
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email:    str
    name:     str
    password: str
    role:     str = "analyst"


class UserResponse(BaseModel):
    id:    str
    email: str
    name:  str
    role:  str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str
    user:         UserResponse


class TOTPLoginRequest(BaseModel):
    email:    str
    password: str
    code:     str   # either 6-digit TOTP or 8-char recovery code (XXXX-XXXX)


# ── POST /auth/login ──────────────────────────────────────────
@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db:        AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Email or Password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.totp_enabled and user.totp_secret:
        logger.info(f"2FA required for login: {user.email}")
        return {"totp_required": True, "email": user.email}

    logger.info(f"Login Successful: {user.email}")
    return build_token_response(user)


# ── POST /auth/login/totp ─────────────────────────────────────
@router.post("/login/totp", response_model=TokenResponse)
async def login_totp(
    body: TOTPLoginRequest,
    db:   AsyncSession = Depends(get_db),
):
    """
    Second login step when 2FA is enabled.
    Accepts either:
      - A 6-digit TOTP code from an authenticator app
      - An 8-char recovery code in format XXXX-XXXX
    """
    user = await authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect Email or Password")

    if not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA is not Enabled for This Account")

    code = body.code.strip().upper()

    # ── Recovery code path (format: XXXX-XXXX, 9 chars with dash) ──
    if len(code) == 9 and '-' in code:
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        result    = await db.execute(
            select(RecoveryCode).where(
                RecoveryCode.user_id   == user.id,
                RecoveryCode.code_hash == code_hash,
                ~RecoveryCode.is_used,
            )
        )
        recovery = result.scalar_one_or_none()

        if not recovery:
            raise HTTPException(
                status_code=401,
                detail="Invalid or Already Used Recovery Code.",
            )

        # Mark as used
        recovery.is_used = True
        recovery.used_at = datetime.now(timezone.utc)
        await db.commit()

        logger.info(f"Login via Recovery Code: {user.email}")
        return build_token_response(user)

    # ── TOTP path (6-digit code) ──────────────────────────────
    totp  = pyotp.TOTP(user.totp_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(
            status_code=401,
            detail="Invalid or Expired 2FA Code. Please Try Again.",
        )

    logger.info(f"Login with 2FA Successful: {user.email}")
    return build_token_response(user)


# ── POST /auth/register ───────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await create_user(
            db, email=body.email, name=body.name,
            password=body.password, role=body.role,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return build_token_response(user)


# ── GET /auth/me ──────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def me(current_user=Depends(get_current_user)):
    return {
        "id":    str(current_user.id),
        "email": current_user.email,
        "name":  current_user.name,
        "role":  current_user.role,
    }


# ── PATCH /auth/me ────────────────────────────────────────────
class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    body:         UpdateProfileRequest,
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name Cannot be Empty")
        current_user.name = name

    await db.commit()
    await db.refresh(current_user)
    logger.info(f"Profile Updated: {current_user.email}")
    return {
        "id":    str(current_user.id),
        "email": current_user.email,
        "name":  current_user.name,
        "role":  current_user.role,
    }


# ── POST /auth/change-password ────────────────────────────────
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str


@router.post("/change-password")
async def change_password(
    body:         ChangePasswordRequest,
    db:           AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current Password is Incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=422, detail="New Password Must be at Least 8 Characters")
    if body.new_password == body.current_password:
        raise HTTPException(status_code=422, detail="New Password Must be Different from Current Password")

    current_user.hashed_password = hash_password(body.new_password)
    await db.commit()
    logger.info(f"Password Changed: {current_user.email}")
    return {"message": "Password Updated Successfully"}


# ── POST /auth/logout ─────────────────────────────────────────
@router.post("/logout")
async def logout():
    return {"message": "Logged Out Successfully"}


# ── POST /auth/forgot-password ────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    db:   AsyncSession = Depends(get_db),
):
    user = await get_user_by_email(db, body.email)
    if user:
        logger.info(f"Password Reset Requested for: {body.email}")
    return {"message": "If That Email Exists, a Reset Link Has Been Sent"}