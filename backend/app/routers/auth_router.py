from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.services.auth_service import authenticate_user, create_user, build_token_response
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str
    role: str = "analyst"

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Email or Password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    logger.info(f"Login Successful: {user.email}")
    return build_token_response(user)

@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await create_user(db, email=body.email, name=body.name, password=body.password, role=body.role)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return build_token_response(user)

@router.get("/me", response_model=UserResponse)
async def me(current_user=Depends(get_current_user)):
    return {"id": str(current_user.id), "email": current_user.email, "name": current_user.name, "role": current_user.role}

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
    For now it logs the request and returns success.
    """
    from app.services.auth_service import get_user_by_email
    user = await get_user_by_email(db, body.email)
    if user:
        logger.info(f"Password reset requested for: {body.email}")
        # TODO Phase 3: send real reset email via SMTP
    return {"message": "If that email exists, a reset link has been sent"}
