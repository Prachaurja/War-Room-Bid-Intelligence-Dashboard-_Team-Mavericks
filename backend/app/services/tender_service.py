from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import Optional, List
from uuid import UUID
from app.models.tender import Tender
from app.schemas.tender_schema import (
    TenderListResponse, TenderRead,
    OverviewStats, SectorStat, StateStat,
)
import logging

logger = logging.getLogger(__name__)


async def get_tenders(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    sector: Optional[str] = None,
    state: Optional[str] = None,
    source_name: Optional[str] = None,
    search: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
) -> TenderListResponse:
    """Paginated, filterable tender list."""
    conditions = []

    if status:
        conditions.append(Tender.status == status)
    if sector:
        conditions.append(Tender.sector == sector)
    if state:
        conditions.append(Tender.state == state)
    if source_name:
        conditions.append(Tender.source_name == source_name)
    if min_value is not None:
        conditions.append(Tender.contract_value >= min_value)
    if max_value is not None:
        conditions.append(Tender.contract_value <= max_value)
    if search:
        term = f"%{search.lower()}%"
        conditions.append(
            or_(
                func.lower(Tender.title).like(term),
                func.lower(Tender.agency).like(term),
            )
        )

    # Total count for pagination
    count_stmt = select(func.count(Tender.id))
    if conditions:
        count_stmt = count_stmt.where(and_(*conditions))
    total = (await db.execute(count_stmt)).scalar_one()

    # Paginated records
    offset = (page - 1) * page_size
    stmt = select(Tender).order_by(Tender.created_at.desc())
    if conditions:
        stmt = stmt.where(and_(*conditions))
    stmt = stmt.offset(offset).limit(page_size)

    rows = (await db.execute(stmt)).scalars().all()

    return TenderListResponse(
        items=[TenderRead.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, -(-total // page_size)),
    )


async def get_tender_by_id(
    db: AsyncSession, tender_id: UUID
) -> Optional[Tender]:
    stmt = select(Tender).where(Tender.id == tender_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_overview_stats(db: AsyncSession) -> OverviewStats:
    # Counts by status
    status_rows = (
        await db.execute(
            select(Tender.status, func.count(Tender.id).label("cnt"))
            .group_by(Tender.status)
        )
    ).all()
    status_counts = {r.status: r.cnt for r in status_rows}

    # Total + avg value + total count
    val_row = (
        await db.execute(
            select(
                func.coalesce(func.sum(Tender.contract_value), 0).label("total"),
                func.coalesce(func.avg(Tender.contract_value), 0).label("avg"),
                func.count(Tender.id).label("cnt"),
            )
        )
    ).one()

    # Count by source
    src_rows = (
        await db.execute(
            select(Tender.source_name, func.count(Tender.id).label("cnt"))
            .group_by(Tender.source_name)
        )
    ).all()
    sources = {r.source_name: r.cnt for r in src_rows}

    return OverviewStats(
        total_tenders=val_row.cnt,
        active_tenders=status_counts.get("active", 0) + status_counts.get("open", 0),
        closed_tenders=status_counts.get("closed", 0),
        upcoming_tenders=status_counts.get("upcoming", 0),
        total_value=float(val_row.total),
        avg_value=float(val_row.avg),
        sources=sources,
    )


async def get_stats_by_sector(db: AsyncSession) -> List[SectorStat]:
    rows = (
        await db.execute(
            select(
                Tender.sector,
                func.count(Tender.id).label("cnt"),
                func.coalesce(func.sum(Tender.contract_value), 0).label("total"),
            )
            .group_by(Tender.sector)
            .order_by(func.sum(Tender.contract_value).desc().nullslast())
        )
    ).all()
    return [
        SectorStat(sector=r.sector or "other", count=r.cnt, total_value=float(r.total))
        for r in rows
    ]


async def get_stats_by_state(db: AsyncSession) -> List[StateStat]:
    rows = (
        await db.execute(
            select(
                Tender.state,
                func.count(Tender.id).label("cnt"),
                func.coalesce(func.sum(Tender.contract_value), 0).label("total"),
            )
            .group_by(Tender.state)
            .order_by(func.count(Tender.id).desc())
        )
    ).all()
    return [
        StateStat(state=r.state or "Unknown", count=r.cnt, total_value=float(r.total))
        for r in rows
    ]