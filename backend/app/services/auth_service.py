from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import timedelta
from app.models.user import User
from app.core.security import verify_password, hash_password, create_access_token
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


async def create_user(db: AsyncSession, email: str, name: str, password: str, role: str = "analyst") -> User:
    existing = await get_user_by_email(db, email)
    if existing:
        raise ValueError(f"User With Email {email} Already Exists")
    user = User(
        email=email,
        name=name,
        role=role,
        hashed_password=hash_password(password),
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info(f"Created New User: {email} ({role})")
    return user


def build_token_response(user: User) -> dict:
    access_token = create_access_token(
        data={"sub": user.email, "name": user.name, "role": user.role, "id": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id":    str(user.id),
            "email": user.email,
            "name":  user.name,
            "role":  user.role,
        },
    }