from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.core.cache import cache_get, cache_set, TTL_5_MIN
from app.services.analytics_service import (
    get_monthly_volume,
    get_value_over_time,
    get_top_departments,
    get_analytics_summary,
    get_source_breakdown,
    get_source_freshness,
    get_closing_by_month,
    get_pipeline_by_month,
    get_win_window,
    get_sector_state_heatmap,
    get_agency_frequency,
    get_value_scatter,
    get_sector_treemap,
    get_sector_status_breakdown,
    get_status_breakdown,
    get_closing_soon,
    get_value_distribution,
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def analytics_summary(db: AsyncSession = Depends(get_db)):
    cache_key = "warroom:analytics:summary"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_analytics_summary(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/monthly-volume")
async def monthly_volume(
    date_field: str = "close_date",
    db: AsyncSession = Depends(get_db),
):
    """date_field: close_date | published_date"""
    cache_key = f"warroom:analytics:monthly-volume:{date_field}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_monthly_volume(db, date_field=date_field)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/value-over-time")
async def value_over_time(
    date_field: str = "close_date",
    db: AsyncSession = Depends(get_db),
):
    """date_field: close_date | published_date"""
    cache_key = f"warroom:analytics:value-over-time:{date_field}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_value_over_time(db, date_field=date_field)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/top-departments")
async def top_departments(
    limit: int = 10,
    db:    AsyncSession = Depends(get_db),
):
    cache_key = f"warroom:analytics:top-departments:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_top_departments(db, limit=min(limit, 20))
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/source-breakdown")
async def source_breakdown(db: AsyncSession = Depends(get_db)):
    """Tender count and value by source portal."""
    cache_key = "warroom:analytics:source-breakdown"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_source_breakdown(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/status-breakdown")
async def status_breakdown(db: AsyncSession = Depends(get_db)):
    """Tender count by status (open, closed, upcoming)."""
    cache_key = "warroom:analytics:status-breakdown"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_status_breakdown(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/closing-soon")
async def closing_soon(db: AsyncSession = Depends(get_db)):
    """Tenders closing in next 30, 60, 90 days."""
    cache_key = "warroom:analytics:closing-soon"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_closing_soon(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/value-distribution")
async def value_distribution(db: AsyncSession = Depends(get_db)):
    """Contract value histogram by bracket."""
    cache_key = "warroom:analytics:value-distribution"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_value_distribution(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/source-freshness")
async def source_freshness(db: AsyncSession = Depends(get_db)):
    """Freshness and count info for each source portal."""
    cache_key = "warroom:analytics:source-freshness"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_source_freshness(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/closing-by-month")
async def closing_by_month(
    date_from: str | None = None,
    date_to:   str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Tender count grouped by close_date month with optional date range filter."""
    cache_key = f"warroom:analytics:closing-by-month:{date_from}:{date_to}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_closing_by_month(db, date_from=date_from, date_to=date_to)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/pipeline-by-month")
async def pipeline_by_month(
    source:    str = "all",
    status:    str = "all",
    date_from: str | None = None,
    date_to:   str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Stacked pipeline — filterable by source, status, and date range."""
    cache_key = f"warroom:analytics:pipeline:{source}:{status}:{date_from}:{date_to}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_pipeline_by_month(db, source=source, status=status, date_from=date_from, date_to=date_to)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/win-window")
async def win_window(db: AsyncSession = Depends(get_db)):
    """Tenders closing in next 90 days grouped by month and sector."""
    cache_key = "warroom:analytics:win-window"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_win_window(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/sector-state-heatmap")
async def sector_state_heatmap(db: AsyncSession = Depends(get_db)):
    """Heatmap of tender count per sector × state."""
    cache_key = "warroom:analytics:sector-state-heatmap"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_sector_state_heatmap(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/agency-frequency")
async def agency_frequency(
    limit: int = 15,
    db: AsyncSession = Depends(get_db),
):
    """Top agencies by tender count."""
    cache_key = f"warroom:analytics:agency-frequency:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_agency_frequency(db, limit=limit)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/value-scatter")
async def value_scatter(db: AsyncSession = Depends(get_db)):
    """Upcoming tenders with value, for scatter plot."""
    cache_key = "warroom:analytics:value-scatter"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_value_scatter(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/sector-treemap")
async def sector_treemap(db: AsyncSession = Depends(get_db)):
    """Treemap data: tender count by sector and state."""
    cache_key = "warroom:analytics:sector-treemap"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_sector_treemap(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result


@router.get("/sector-status-breakdown")
async def sector_status_breakdown(db: AsyncSession = Depends(get_db)):
    """Open/closed/upcoming count per sector for radial chart."""
    cache_key = "warroom:analytics:sector-status-breakdown"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_sector_status_breakdown(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result