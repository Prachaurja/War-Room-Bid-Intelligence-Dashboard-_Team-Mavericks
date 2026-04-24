import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Float
from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.models.tender import Tender
from app.models.user import User
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])


def make_csv_response(rows: list[list], headers: list[str], filename: str) -> StreamingResponse:
    """Helper — builds a StreamingResponse that Downloads as a CSV File."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)

    date_str = datetime.now().strftime('%Y-%m-%d')
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}-{date_str}.csv"'
        },
    )


# ── GET /reports/sector ───────────────────────────────────────
@router.get("/sector")
async def sector_report(
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Downloads sector-breakdown.csv
    Columns: Sector, Contract Count, Total Value AUD, Avg Value AUD
    """
    result = await db.execute(
        select(
            Tender.sector,
            func.count(Tender.id).label("count"),
            func.coalesce(func.sum(cast(Tender.contract_value, Float)), 0.0).label("total_value"),
            func.coalesce(func.avg(cast(Tender.contract_value, Float)), 0.0).label("avg_value"),
        )
        .where(Tender.sector.isnot(None))
        .where(Tender.agency != "Test Agency")
        .group_by(Tender.sector)
        .order_by(func.sum(cast(Tender.contract_value, Float)).desc())
    )
    rows = result.all()

    headers = ["Sector", "Contract Count", "Total Value (AUD)", "Avg Value (AUD)"]
    data = [
        [r.sector, r.count, round(r.total_value, 2), round(r.avg_value, 2)]
        for r in rows
    ]
    logger.info(f"Sector report downloaded by {current_user.email}")
    return make_csv_response(data, headers, "warroom-sector-report")


# ── GET /reports/regional ─────────────────────────────────────
@router.get("/regional")
async def regional_report(
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Downloads regional-report.csv
    Columns: State, Contract Count, Total Value AUD, Avg Value AUD
    """
    result = await db.execute(
        select(
            Tender.state,
            func.count(Tender.id).label("count"),
            func.coalesce(func.sum(cast(Tender.contract_value, Float)), 0.0).label("total_value"),
            func.coalesce(func.avg(cast(Tender.contract_value, Float)), 0.0).label("avg_value"),
        )
        .where(Tender.state.isnot(None))
        .where(Tender.agency != "Test Agency")
        .group_by(Tender.state)
        .order_by(func.count(Tender.id).desc())
    )
    rows = result.all()

    headers = ["State", "Contract Count", "Total Value (AUD)", "Avg Value (AUD)"]
    data = [
        [r.state, r.count, round(r.total_value, 2), round(r.avg_value, 2)]
        for r in rows
    ]
    logger.info(f"Regional report downloaded by {current_user.email}")
    return make_csv_response(data, headers, "warroom-regional-report")


# ── GET /reports/overview ─────────────────────────────────────
@router.get("/overview")
async def overview_report(
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Downloads overview-report.csv
    High level summary — total contracts, total value, avg value,
    source breakdown, state breakdown.
    """
    # Main aggregates
    main = await db.execute(
        select(
            func.count(Tender.id).label("total"),
            func.coalesce(func.sum(cast(Tender.contract_value, Float)), 0.0).label("total_value"),
            func.coalesce(func.avg(cast(Tender.contract_value, Float)), 0.0).label("avg_value"),
        )
        .where(Tender.agency != "Test Agency")
    )
    m = main.one()

    # Source breakdown
    sources = await db.execute(
        select(Tender.source_name, func.count(Tender.id).label("count"))
        .where(Tender.agency != "Test Agency")
        .group_by(Tender.source_name)
        .order_by(func.count(Tender.id).desc())
    )
    source_rows = sources.all()

    headers = ["Metric", "Value"]
    data: list[list] = [
        ["Total Contracts",      m.total],
        ["Total Value (AUD)",    round(m.total_value, 2)],
        ["Average Value (AUD)",  round(m.avg_value, 2)],
        ["Report Generated",     datetime.now().strftime("%Y-%m-%d %H:%M")],
        ["", ""],
        ["--- Source Breakdown ---", ""],
    ]
    for s in source_rows:
        data.append([s.source_name or "Unknown", s.count])

    logger.info(f"Overview report downloaded by {current_user.email}")
    return make_csv_response(data, headers, "warroom-overview-report")


# ── GET /reports/high-value ───────────────────────────────────
@router.get("/high-value")
async def high_value_report(
    min_value: float = 1_000_000,
    db:        AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Downloads high-value.csv — real individual tender rows above min_value.
    Default threshold is $1M. Query param: min_value
    Columns: Title, Agency, Sector, State, Value AUD, Status, Source
    """
    result = await db.execute(
        select(Tender)
        .where(Tender.contract_value >= min_value)
        .where(Tender.agency != "Test Agency")
        .where(Tender.agency.isnot(None))
        .order_by(Tender.contract_value.desc())
    )
    tenders = result.scalars().all()

    headers = [
        "Title", "Agency", "Sector", "State",
        "Contract Value (AUD)", "Status", "Source",
    ]
    data = [
        [
            t.title or "",
            t.agency or "",
            t.sector or "",
            t.state or "",
            round(t.contract_value or 0, 2),
            t.status or "",
            t.source_name or "",
        ]
        for t in tenders
    ]
    logger.info(
        f"High-value report downloaded by {current_user.email} "
        f"— {len(data)} contracts above ${min_value:,.0f}"
    )
    return make_csv_response(data, headers, "warroom-high-value-report")