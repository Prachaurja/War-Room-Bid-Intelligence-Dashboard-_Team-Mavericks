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


# ── Helper ────────────────────────────────────────────────────

def format_alert(a: Alert) -> dict:
    return {
        "id":          str(a.id),
        "title":       a.title,
        "description": a.description,
        "type":        a.type,
        "priority":    a.priority,
        "read":        a.read,
        "created_at":  a.created_at.isoformat() if a.created_at else "",
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
        "last_matched":  s.last_matched.isoformat() if s.last_matched else None,
        "created_at":    s.created_at.isoformat() if s.created_at else "",
    }


# ── GET /alerts ───────────────────────────────────────────────
@router.get("")
async def get_alerts(
    type:     Optional[str] = None,
    priority: Optional[str] = None,
    unread:   Optional[bool] = None,
    db:       AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all alerts for the current user with optional filters."""
    query = select(Alert).where(Alert.user_id == current_user.id)

    if type:
        query = query.where(Alert.type == type)
    if priority:
        query = query.where(Alert.priority == priority)
    if unread is True:
        query = query.where(Alert.read.is_(False))

    query = query.order_by(Alert.created_at.desc())
    result = await db.execute(query)
    alerts = result.scalars().all()
    return [format_alert(a) for a in alerts]


# ── POST /alerts ──────────────────────────────────────────────
@router.post("", status_code=201)
async def create_alert(
    body:         CreateAlertRequest,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new alert for the current user."""
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


# ── PATCH /alerts/mark-all-read ───────────────────────────────
@router.patch("/mark-all-read")
async def mark_all_read(
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all alerts as read for the current user."""
    await db.execute(
        update(Alert)
        .where(Alert.user_id == current_user.id)
        .where(Alert.read.is_(False))
        .values(read=True)
    )
    await db.commit()
    return {"message": "All alerts marked as read"}


# ── PATCH /alerts/{alert_id}/read ─────────────────────────────
@router.patch("/{alert_id}/read")
async def mark_read(
    alert_id:     str,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single alert as read."""
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


# ── DELETE /alerts/{alert_id} ─────────────────────────────────
@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id:     str,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a single alert."""
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


# ── GET /alerts/saved-searches ────────────────────────────────
@router.get("/saved-searches")
async def get_saved_searches(
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all saved searches for the current user."""
    result = await db.execute(
        select(SavedSearch)
        .where(SavedSearch.user_id == current_user.id)
        .order_by(SavedSearch.created_at.desc())
    )
    searches = result.scalars().all()
    return [format_search(s) for s in searches]


# ── POST /alerts/saved-searches ───────────────────────────────
@router.post("/saved-searches", status_code=201)
async def create_saved_search(
    body:         CreateSavedSearchRequest,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new saved search for the current user."""
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


# ── DELETE /alerts/saved-searches/{search_id} ─────────────────
@router.delete("/saved-searches/{search_id}", status_code=204)
async def delete_saved_search(
    search_id:    str,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a saved search."""
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


# ── PATCH /alerts/saved-searches/{search_id}/toggle ──────────
@router.patch("/saved-searches/{search_id}/toggle")
async def toggle_saved_search_notifications(
    search_id:    str,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle notifications on/off for a saved search."""
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