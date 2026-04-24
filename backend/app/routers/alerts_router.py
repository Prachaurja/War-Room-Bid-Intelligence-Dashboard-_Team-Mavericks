from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from typing import Optional
from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.models.alert import Alert, SavedSearch
from app.models.user import User
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts", tags=["alerts"])


# ── Schemas ───────────────────────────────────────────────────

class AlertOut(BaseModel):
    id:          str
    title:       str
    description: Optional[str]
    type:        str
    priority:    str
    read:        bool
    created_at:  str
    class Config:
        from_attributes = True

class CreateAlertRequest(BaseModel):
    title:       str
    description: Optional[str] = None
    type:        str = "tender"
    priority:    str = "medium"

class SavedSearchOut(BaseModel):
    id:            str
    name:          str
    sector:        Optional[str]
    state:         Optional[str]
    min_value:     Optional[float]
    max_value:     Optional[float]
    notifications: bool
    match_count:   int
    last_matched:  Optional[str]
    created_at:    str
    class Config:
        from_attributes = True

class CreateSavedSearchRequest(BaseModel):
    name:          str
    sector:        Optional[str] = None
    state:         Optional[str] = None
    min_value:     Optional[float] = 0
    max_value:     Optional[float] = 0
    notifications: bool = True


# ── Helpers ───────────────────────────────────────────────────

def fmt_dt(dt):
    """Serialize a datetime to ISO string, always UTC-aware."""
    if dt is None:
        return ""
    if dt.tzinfo is None:
        from datetime import timezone
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

def format_alert(a: Alert) -> dict:
    return {
        "id":          str(a.id),
        "title":       a.title,
        "description": a.description,
        "type":        a.type,
        "priority":    a.priority,
        "read":        a.read,
        "created_at":  fmt_dt(a.created_at),
    }

def format_search(s: SavedSearch) -> dict:
    return {
        "id":            str(s.id),
        "name":          s.name,
        "sector":        s.sector,
        "state":         s.state,
        "min_value":     s.min_value or 0,
        "max_value":     s.max_value or 0,
        "notifications": s.notifications,
        "match_count":   s.match_count,
        "last_matched":  fmt_dt(s.last_matched),
        "created_at":    fmt_dt(s.created_at),
    }


# BLOCK 1 — /alerts/saved-searches/* (most specific, must come first) --------------------------------

@router.get("/saved-searches")
async def get_saved_searches(
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedSearch)
        .where(SavedSearch.user_id == current_user.id)
        .order_by(SavedSearch.created_at.desc())
    )
    return [format_search(s) for s in result.scalars().all()]


@router.post("/saved-searches", status_code=201)
async def create_saved_search(
    body:         CreateSavedSearchRequest,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    search = SavedSearch(
        user_id=       current_user.id,
        name=          body.name,
        sector=        body.sector,
        state=         body.state,
        min_value=     body.min_value,
        max_value=     body.max_value,
        notifications= body.notifications,
        match_count=   0,
    )
    db.add(search)
    await db.commit()
    await db.refresh(search)
    logger.info(f"Saved search created for {current_user.email}: {body.name}")
    return format_search(search)


@router.delete("/saved-searches/{search_id}", status_code=204)
async def delete_saved_search(
    search_id:    str,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedSearch)
        .where(SavedSearch.id == search_id)
        .where(SavedSearch.user_id == current_user.id)
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    await db.delete(search)
    await db.commit()


@router.patch("/saved-searches/{search_id}/toggle")
async def toggle_saved_search_notifications(
    search_id:    str,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedSearch)
        .where(SavedSearch.id == search_id)
        .where(SavedSearch.user_id == current_user.id)
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    search.notifications = not search.notifications
    await db.commit()
    return format_search(search)


# BLOCK 2 — /alerts/mark-all-read (literal, before /{alert_id}) --------------------------------

@router.patch("/mark-all-read")
async def mark_all_read(
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        update(Alert)
        .where(Alert.user_id == current_user.id)
        .where(Alert.read.is_(False))
        .values(read=True)
    )
    await db.commit()
    return {"message": "All alerts marked as read"}


# BLOCK 3 — /alerts collection (no path param) --------------------------------

@router.get("")
async def get_alerts(
    type:         Optional[str] = None,
    priority:     Optional[str] = None,
    unread:       Optional[bool] = None,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Alert).where(Alert.user_id == current_user.id)
    if type:
        query = query.where(Alert.type == type)
    if priority:
        query = query.where(Alert.priority == priority)
    if unread is True:
        query = query.where(Alert.read.is_(False))
    query = query.order_by(Alert.created_at.desc())
    result = await db.execute(query)
    return [format_alert(a) for a in result.scalars().all()]


@router.post("", status_code=201)
async def create_alert(
    body:         CreateAlertRequest,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = Alert(
        user_id=     current_user.id,
        title=       body.title,
        description= body.description,
        type=        body.type,
        priority=    body.priority,
        read=        False,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    logger.info(f"Alert created for {current_user.email}: {body.title}")
    return format_alert(alert)


# BLOCK 4 — /alerts/{alert_id}/* (dynamic, always last) --------------------------------

@router.patch("/{alert_id}/read")
async def mark_read(
    alert_id:     str,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Alert)
        .where(Alert.id == alert_id)
        .where(Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.read = True
    await db.commit()
    return format_alert(alert)


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id:     str,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Alert)
        .where(Alert.id == alert_id)
        .where(Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    await db.commit()