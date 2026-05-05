from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.services.auth_service import (
    authenticate_user, create_user, build_token_response, get_user_by_email
)
from app.core.security import verify_password, hash_password
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


# ── POST /auth/login ──────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Email or Password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    logger.info(f"Login Successful: {user.email}")
    return build_token_response(user)


# ── POST /auth/register ───────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await create_user(
            db,
            email=body.email,
            name=body.name,
            password=body.password,
            role=body.role,
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
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update the current user's profile (name only — email changes need verification)."""
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Name Cannot be Empty",
            )
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
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Verify current password then set new hashed password."""
    # Verify current password
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current Password is Incorrect",
        )

    # Validate new password
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New Password Must be at Least 8 Characters",
        )

    if body.new_password == body.current_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New Password Must be Different from Current Password",
        )

    current_user.hashed_password = hash_password(body.new_password)
    await db.commit()

    logger.info(f"Password changed: {current_user.email}")
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
    db: AsyncSession = Depends(get_db),
):
    """
    Always returns success — never reveals if email exists.
    In production this would send a real reset email.
    """
    user = await get_user_by_email(db, body.email)
    if user:
        logger.info(f"Password Reset Requested for: {body.email}")
        # TODO Phase 3: send real reset email via SMTP
    return {"message": "If That Email Exists, a Reset Link Has Been Sent"}