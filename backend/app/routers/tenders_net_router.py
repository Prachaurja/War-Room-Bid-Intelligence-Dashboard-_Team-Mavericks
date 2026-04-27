from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.models.tenders_net_urls import TendersNetURL
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tendersnet", tags=["tendersnet"])


class URLCreate(BaseModel):
    url: str
    label: Optional[str] = None


class URLResponse(BaseModel):
    id: int
    url: str
    label: Optional[str]
    is_active: bool
    last_fetched_at: Optional[datetime]
    record_count: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/urls", response_model=List[URLResponse])
async def list_urls(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(TendersNetURL).order_by(TendersNetURL.created_at.desc()))
    return result.scalars().all()


@router.post("/urls", response_model=URLResponse, status_code=201)
async def add_url(
    body: URLCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Check for duplicate
    existing = await db.execute(
        select(TendersNetURL).where(TendersNetURL.url == body.url)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="URL already exists")

    entry = TendersNetURL(url=body.url, label=body.label, is_active=True)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info(f"TendersNet URL added: {body.url[:60]}")
    return entry


@router.delete("/urls/{url_id}", status_code=204)
async def delete_url(
    url_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(TendersNetURL).where(TendersNetURL.id == url_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="URL not found")
    await db.delete(entry)
    await db.commit()


@router.patch("/urls/{url_id}/toggle", response_model=URLResponse)
async def toggle_url(
    url_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(TendersNetURL).where(TendersNetURL.id == url_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="URL not found")
    entry.is_active = not entry.is_active
    await db.commit()
    await db.refresh(entry)
    return entry