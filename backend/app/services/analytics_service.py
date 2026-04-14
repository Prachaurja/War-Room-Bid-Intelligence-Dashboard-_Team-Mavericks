from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Float
from app.models.tender import Tender
import logging

logger = logging.getLogger(__name__)


async def get_monthly_volume(db: AsyncSession) -> list[dict]:
    """
    Contract count grouped by month using created_at.
    Returns last 12 months of data.
    """
    result = await db.execute(
        select(
            func.to_char(
                func.date_trunc('month', Tender.created_at), 'Mon YYYY'
            ).label('month'),
            func.date_trunc('month', Tender.created_at).label('month_date'),
            func.count(Tender.id).label('count'),
        )
        .where(Tender.agency != 'Test Agency')
        .where(Tender.agency.isnot(None))
        .where(Tender.created_at.isnot(None))
        .group_by(
            func.date_trunc('month', Tender.created_at),
            func.to_char(func.date_trunc('month', Tender.created_at), 'Mon YYYY'),
        )
        .order_by(func.date_trunc('month', Tender.created_at))
    )
    rows = result.all()
    return [{"month": r.month, "count": r.count} for r in rows]


async def get_value_over_time(db: AsyncSession) -> list[dict]:
    """
    Total contract value grouped by month using created_at.
    Filters out nulls and zero values.
    """
    result = await db.execute(
        select(
            func.to_char(
                func.date_trunc('month', Tender.created_at), 'Mon YYYY'
            ).label('month'),
            func.date_trunc('month', Tender.created_at).label('month_date'),
            func.coalesce(
                func.sum(cast(Tender.contract_value, Float)), 0.0
            ).label('total_value'),
            func.count(Tender.id).label('count'),
        )
        .where(Tender.agency != 'Test Agency')
        .where(Tender.agency.isnot(None))
        .where(Tender.created_at.isnot(None))
        .where(Tender.contract_value.isnot(None))
        .where(Tender.contract_value > 0)
        .group_by(
            func.date_trunc('month', Tender.created_at),
            func.to_char(func.date_trunc('month', Tender.created_at), 'Mon YYYY'),
        )
        .order_by(func.date_trunc('month', Tender.created_at))
    )
    rows = result.all()
    return [
        {
            "month":       r.month,
            "total_value": round(float(r.total_value), 2),
            "count":       r.count,
        }
        for r in rows
    ]


async def get_top_departments(db: AsyncSession, limit: int = 10) -> list[dict]:
    """
    Top N agencies by total contract value.
    Filters out nulls, Test Agency, and zero values.
    """
    result = await db.execute(
        select(
            Tender.agency.label('agency'),
            func.count(Tender.id).label('contract_count'),
            func.coalesce(
                func.sum(cast(Tender.contract_value, Float)), 0.0
            ).label('total_value'),
            func.coalesce(
                func.avg(cast(Tender.contract_value, Float)), 0.0
            ).label('avg_value'),
        )
        .where(Tender.agency != 'Test Agency')
        .where(Tender.agency.isnot(None))
        .where(Tender.contract_value.isnot(None))
        .where(Tender.contract_value > 0)
        .group_by(Tender.agency)
        .order_by(func.sum(cast(Tender.contract_value, Float)).desc())
        .limit(limit)
    )
    rows = result.all()
    return [
        {
            "agency":          r.agency,
            "contract_count":  r.contract_count,
            "total_value":     round(float(r.total_value), 2),
            "avg_value":       round(float(r.avg_value), 2),
        }
        for r in rows
    ]


async def get_analytics_summary(db: AsyncSession) -> dict:
    """
    High-level summary stats for the analytics page header cards.
    Total contracts, total value, average value, top sector, top state.
    """
    # Main aggregates
    result = await db.execute(
        select(
            func.count(Tender.id).label('total_contracts'),
            func.coalesce(
                func.sum(cast(Tender.contract_value, Float)), 0.0
            ).label('total_value'),
            func.coalesce(
                func.avg(cast(Tender.contract_value, Float)), 0.0
            ).label('avg_value'),
        )
        .where(Tender.agency != 'Test Agency')
        .where(Tender.agency.isnot(None))
    )
    main = result.one()

    # Top sector by count
    sector_result = await db.execute(
        select(Tender.sector, func.count(Tender.id).label('cnt'))
        .where(Tender.sector.isnot(None))
        .where(Tender.agency != 'Test Agency')
        .group_by(Tender.sector)
        .order_by(func.count(Tender.id).desc())
        .limit(1)
    )
    top_sector_row = sector_result.first()

    # Top state by count
    state_result = await db.execute(
        select(Tender.state, func.count(Tender.id).label('cnt'))
        .where(Tender.state.isnot(None))
        .where(Tender.agency != 'Test Agency')
        .group_by(Tender.state)
        .order_by(func.count(Tender.id).desc())
        .limit(1)
    )
    top_state_row = state_result.first()

    return {
        "total_contracts": main.total_contracts,
        "total_value":     round(float(main.total_value), 2),
        "avg_value":       round(float(main.avg_value), 2),
        "top_sector":      top_sector_row.sector if top_sector_row else None,
        "top_state":       top_state_row.state   if top_state_row  else None,
    }