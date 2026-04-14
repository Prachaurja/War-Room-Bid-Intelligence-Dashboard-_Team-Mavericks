from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.services.analytics_service import (
    get_monthly_volume,
    get_value_over_time,
    get_top_departments,
    get_analytics_summary,
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


# ── GET /analytics/summary ────────────────────────────────────
@router.get("/summary")
async def analytics_summary(db: AsyncSession = Depends(get_db)):
    """
    High-level summary stats for the analytics page header cards.
    Returns total contracts, total value, average value,
    top sector, and top state.
    """
    return await get_analytics_summary(db)


# ── GET /analytics/monthly-volume ────────────────────────────
@router.get("/monthly-volume")
async def monthly_volume(db: AsyncSession = Depends(get_db)):
    """
    Contract count grouped by month.
    Used for the monthly bar chart on the Analytics page.
    Returns list of { month, count }.
    """
    return await get_monthly_volume(db)


# ── GET /analytics/value-over-time ───────────────────────────
@router.get("/value-over-time")
async def value_over_time(db: AsyncSession = Depends(get_db)):
    """
    Total contract value grouped by month.
    Used for the value trend line chart on the Analytics page.
    Returns list of { month, total_value, count }.
    """
    return await get_value_over_time(db)


# ── GET /analytics/top-departments ───────────────────────────
@router.get("/top-departments")
async def top_departments(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    """
    Top N agencies by total contract value.
    Used for the top departments table on the Analytics page.
    Returns list of { agency, contract_count, total_value, avg_value }.
    Query param: limit (default 10, max sensible is 20).
    """
    return await get_top_departments(db, limit=min(limit, 20))