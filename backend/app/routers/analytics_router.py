from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.core.cache import cache_get, cache_set, TTL_5_MIN
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
    High-level summary stats for analytics page header cards.
    Cached in Redis for 5 minutes.
    """
    cache_key = "warroom:analytics:summary"

    cached = await cache_get(cache_key)
    if cached:
        return cached

    result = await get_analytics_summary(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


# ── GET /analytics/monthly-volume ────────────────────────────
@router.get("/monthly-volume")
async def monthly_volume(db: AsyncSession = Depends(get_db)):
    """
    Contract count grouped by month.
    Used for the monthly bar chart on the Analytics page.
    Cached in Redis for 5 minutes.
    """
    cache_key = "warroom:analytics:monthly-volume"

    cached = await cache_get(cache_key)
    if cached:
        return cached

    result = await get_monthly_volume(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


# ── GET /analytics/value-over-time ───────────────────────────
@router.get("/value-over-time")
async def value_over_time(db: AsyncSession = Depends(get_db)):
    """
    Total contract value grouped by month.
    Used for the value trend line chart on the Analytics page.
    Cached in Redis for 5 minutes.
    """
    cache_key = "warroom:analytics:value-over-time"

    cached = await cache_get(cache_key)
    if cached:
        return cached

    result = await get_value_over_time(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


# ── GET /analytics/top-departments ───────────────────────────
@router.get("/top-departments")
async def top_departments(
    limit: int = 10,
    db:    AsyncSession = Depends(get_db),
):
    """
    Top N agencies by total contract value.
    Cached in Redis for 5 minutes — limit is part of the cache key.
    """
    cache_key = f"warroom:analytics:top-departments:{limit}"

    cached = await cache_get(cache_key)
    if cached:
        return cached

    result = await get_top_departments(db, limit=min(limit, 20))
    await cache_set(cache_key, result, TTL_5_MIN)
    return result