from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Float, case, and_
from app.models.tender import Tender
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)


async def get_monthly_volume(db: AsyncSession, date_field: str = "close_date") -> list[dict]:
    """
    date_field: "close_date" or "published_date"
    Groups tender count by month using the chosen date field.
    """
    col = Tender.close_date if date_field == "close_date" else Tender.published_date
    result = await db.execute(
        select(
            func.to_char(
                func.date_trunc('month', col), 'Mon YYYY'
            ).label('month'),
            func.date_trunc('month', col).label('month_date'),
            func.count(Tender.id).label('count'),
        )
        .where(Tender.agency != 'Test Agency')
        .where(Tender.agency.isnot(None))
        .where(col.isnot(None))
        .group_by(
            func.date_trunc('month', col),
            func.to_char(func.date_trunc('month', col), 'Mon YYYY'),
        )
        .order_by(func.date_trunc('month', col))
    )
    rows = result.all()
    return [{"month": r.month, "count": r.count} for r in rows]


async def get_value_over_time(db: AsyncSession, date_field: str = "close_date") -> list[dict]:
    """
    date_field: "close_date" or "published_date"
    Groups total contract value by month using the chosen date field.
    """
    col = Tender.close_date if date_field == "close_date" else Tender.published_date
    result = await db.execute(
        select(
            func.to_char(
                func.date_trunc('month', col), 'Mon YYYY'
            ).label('month'),
            func.date_trunc('month', col).label('month_date'),
            func.coalesce(
                func.sum(cast(Tender.contract_value, Float)), 0.0
            ).label('total_value'),
            func.count(Tender.id).label('count'),
        )
        .where(Tender.agency != 'Test Agency')
        .where(Tender.agency.isnot(None))
        .where(col.isnot(None))
        .where(Tender.contract_value.isnot(None))
        .where(Tender.contract_value > 0)
        .group_by(
            func.date_trunc('month', col),
            func.to_char(func.date_trunc('month', col), 'Mon YYYY'),
        )
        .order_by(func.date_trunc('month', col))
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
            "agency":         r.agency,
            "contract_count": r.contract_count,
            "total_value":    round(float(r.total_value), 2),
            "avg_value":      round(float(r.avg_value), 2),
        }
        for r in rows
    ]


async def get_analytics_summary(db: AsyncSession) -> dict:
    result = await db.execute(
        select(
            func.count(Tender.id).label('total_contracts'),
            func.coalesce(func.sum(cast(Tender.contract_value, Float)), 0.0).label('total_value'),
            func.coalesce(func.avg(cast(Tender.contract_value, Float)), 0.0).label('avg_value'),
        )
        .where(Tender.agency != 'Test Agency')
        .where(Tender.agency.isnot(None))
    )
    main = result.one()

    sector_result = await db.execute(
        select(Tender.sector, func.count(Tender.id).label('cnt'))
        .where(Tender.sector.isnot(None))
        .where(Tender.agency != 'Test Agency')
        .group_by(Tender.sector)
        .order_by(func.count(Tender.id).desc())
        .limit(1)
    )
    top_sector_row = sector_result.first()

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


async def get_source_breakdown(db: AsyncSession) -> list[dict]:
    """Tender count and value by source portal."""
    result = await db.execute(
        select(
            Tender.source_name.label('source'),
            func.count(Tender.id).label('count'),
            func.coalesce(func.sum(cast(Tender.contract_value, Float)), 0.0).label('total_value'),
        )
        .where(Tender.source_name.isnot(None))
        .group_by(Tender.source_name)
        .order_by(func.count(Tender.id).desc())
    )
    rows = result.all()
    return [
        {
            "source":      r.source,
            "count":       r.count,
            "total_value": round(float(r.total_value), 2),
        }
        for r in rows
    ]


async def get_status_breakdown(db: AsyncSession) -> list[dict]:
    """Tender count by status (open, closed, upcoming)."""
    result = await db.execute(
        select(
            Tender.status.label('status'),
            func.count(Tender.id).label('count'),
        )
        .where(Tender.status.isnot(None))
        .group_by(Tender.status)
        .order_by(func.count(Tender.id).desc())
    )
    rows = result.all()
    return [{"status": r.status, "count": r.count} for r in rows]


async def get_closing_soon(db: AsyncSession) -> dict:
    """
    Count of tenders closing in next 30, 60, 90 days.
    Only counts open/upcoming tenders with a close_date set.
    """
    now   = datetime.now(timezone.utc)
    d30   = now + timedelta(days=30)
    d60   = now + timedelta(days=60)
    d90   = now + timedelta(days=90)

    result = await db.execute(
        select(
            func.count(case(
                (and_(Tender.close_date >= now, Tender.close_date <= d30), 1),
            )).label('next_30'),
            func.count(case(
                (and_(Tender.close_date > d30, Tender.close_date <= d60), 1),
            )).label('next_60'),
            func.count(case(
                (and_(Tender.close_date > d60, Tender.close_date <= d90), 1),
            )).label('next_90'),
            func.count(case(
                (and_(Tender.close_date >= now,
                      Tender.status.in_(['open', 'upcoming'])), 1),
            )).label('total_active'),
        )
        .where(Tender.close_date.isnot(None))
        .where(Tender.status.in_(['open', 'upcoming']))
    )
    row = result.one()
    return {
        "next_30": row.next_30,
        "next_60": row.next_60,
        "next_90": row.next_90,
        "total_active": row.total_active,
        "buckets": [
            {"label": "0–30 days", "count": row.next_30,  "color": "#EF4444"},
            {"label": "31–60 days","count": row.next_60,  "color": "#F59E0B"},
            {"label": "61–90 days","count": row.next_90,  "color": "#10B981"},
        ],
    }


async def get_value_distribution(db: AsyncSession) -> list[dict]:
    """
    Histogram of contract values into 6 brackets.
    Only counts tenders with contract_value > 0.
    """
    result = await db.execute(
        select(
            func.count(case((and_(Tender.contract_value > 0,    Tender.contract_value < 100_000),    1))).label('under_100k'),
            func.count(case((and_(Tender.contract_value >= 100_000,  Tender.contract_value < 500_000),  1))).label('k100_500k'),
            func.count(case((and_(Tender.contract_value >= 500_000,  Tender.contract_value < 1_000_000),1))).label('k500_1m'),
            func.count(case((and_(Tender.contract_value >= 1_000_000,Tender.contract_value < 5_000_000),1))).label('m1_5m'),
            func.count(case((and_(Tender.contract_value >= 5_000_000,Tender.contract_value < 20_000_000),1))).label('m5_20m'),
            func.count(case((Tender.contract_value >= 20_000_000, 1))).label('over_20m'),
        )
        .where(Tender.contract_value.isnot(None))
        .where(Tender.contract_value > 0)
    )
    row = result.one()
    return [
        {"range": "< $100K",      "count": row.under_100k, "color": "#7C3AED"},
        {"range": "$100K–$500K",  "count": row.k100_500k,  "color": "#3B82F6"},
        {"range": "$500K–$1M",    "count": row.k500_1m,    "color": "#06B6D4"},
        {"range": "$1M–$5M",      "count": row.m1_5m,      "color": "#10B981"},
        {"range": "$5M–$20M",     "count": row.m5_20m,     "color": "#F59E0B"},
        {"range": "> $20M",       "count": row.over_20m,   "color": "#EF4444"},
    ]


async def get_source_freshness(db: AsyncSession) -> list[dict]:
    """
    Freshness info for each source portal:
    - TendersNet: uses MAX(last_fetched_at) from tendersnet_urls
    - Uploaded sources: uses MAX(completed_at) from ingestion_jobs
    Combined with tender count per source.
    """
    from app.models.ingestion_job import IngestionJob
    from app.models.tenders_net_urls import TendersNetURL

    SOURCE_LABELS = {
        "tendersnet":          "Tenders.Net",
        "tenders_net":         "Tenders.Net",
        "austender":           "AusTender",
        "qld_tenders":         "QLD Tenders",
        "nsw_etender":         "NSW eTender",
        "buying_for_victoria": "Buying for Victoria",
        "sa_tenders":          "SA Tenders",
        "wa_tenders":          "Tenders WA",
        "qtenders":            "QTenders",
        "nt_tenders":          "NT Tenders",
        "tas_tenders":         "TAS Tenders",
        "tenders_act":         "ACT Tenders",
        "manual":              "Manual Upload",
    }

    # 1. Tender counts per source
    count_result = await db.execute(
        select(
            Tender.source_name,
            func.count(Tender.id).label("count"),
        )
        .where(Tender.source_name.isnot(None))
        .group_by(Tender.source_name)
    )
    counts = {r.source_name: r.count for r in count_result.all()}

    # 2. TendersNet freshness — MAX(last_fetched_at) across active URLs
    tn_result = await db.execute(
        select(func.max(TendersNetURL.last_fetched_at).label("last_fetched"))
        .where(TendersNetURL.is_active.is_(True))
    )
    tn_row = tn_result.first()
    tn_last = tn_row.last_fetched if tn_row else None

    # 3. Uploaded sources freshness — MAX(completed_at) per source_name from ingestion_jobs
    jobs_result = await db.execute(
        select(
            IngestionJob.source_name,
            func.max(IngestionJob.completed_at).label("last_updated"),
        )
        .where(IngestionJob.status == "complete")
        .where(IngestionJob.completed_at.isnot(None))
        .group_by(IngestionJob.source_name)
    )
    job_freshness = {r.source_name: r.last_updated for r in jobs_result.all()}

    results = []
    for source_name, count in counts.items():
        if source_name in ("tendersnet", "tenders_net"):
            last_updated = tn_last
            method = "scheduler"
        else:
            last_updated = job_freshness.get(source_name)
            method = "upload"

        results.append({
            "source":       source_name,
            "label":        SOURCE_LABELS.get(source_name, source_name.replace("_", " ").title()),
            "count":        count,
            "last_updated": last_updated.isoformat() if last_updated else None,
            "method":       method,
        })

    # Sort by count desc
    results.sort(key=lambda x: x["count"], reverse=True)
    return results


async def get_closing_by_month(
    db: AsyncSession,
    date_from: str | None = None,
    date_to:   str | None = None,
) -> list[dict]:
    """
    Count of tenders grouped by close_date month.
    Optional date_from / date_to filters (ISO date strings: YYYY-MM-DD).
    """
    from sqlalchemy import text
    where_clauses = ["close_date IS NOT NULL"]
    params: dict = {}
    if date_from:
        where_clauses.append("close_date >= :date_from")
        params["date_from"] = date_from
    if date_to:
        where_clauses.append("close_date <= :date_to")
        params["date_to"] = date_to
    where_sql = " AND ".join(where_clauses)
    result = await db.execute(text(f"""
        SELECT
            to_char(date_trunc('month', close_date), 'Mon YYYY') AS month,
            date_trunc('month', close_date) AS month_date,
            COUNT(id) AS count
        FROM tenders
        WHERE {where_sql}
        GROUP BY date_trunc('month', close_date),
                 to_char(date_trunc('month', close_date), 'Mon YYYY')
        ORDER BY date_trunc('month', close_date)
    """), params)
    rows = result.all()
    return [{"month": r.month, "count": r.count} for r in rows]


async def get_pipeline_by_month(
    db: AsyncSession,
    source:    str = "all",
    status:    str = "all",
    date_from: str | None = None,
    date_to:   str | None = None,
) -> dict:
    """
    Stacked bar — tender count per month per source, filtered by source + status.
    Uses close_date. Returns one row per (month, source_name).
    """
    SOURCE_LABELS = {
        "tendersnet":  "Tenders.Net",
        "qld_tenders": "QLD Tenders",
        "wa_tenders":  "Tenders WA",
        "sa_tenders":  "SA Tenders",
        "tas_tenders": "TAS Tenders",
        "tenders_act": "ACT Tenders",
        "austender":   "AusTender",
    }

    from sqlalchemy import text
    # Build safe parameterised raw SQL — avoids SQLAlchemy parameterising 'month' literal
    where_clauses = ["close_date IS NOT NULL"]
    params: dict = {}
    if source != "all":
        where_clauses.append("source_name = :source")
        params["source"] = source
    if status != "all":
        where_clauses.append("status = :status")
        params["status"] = status

    where_sql = " AND ".join(where_clauses)
    sql = text(f"""
        SELECT
            to_char(date_trunc('month', close_date), 'Mon YYYY') AS month,
            date_trunc('month', close_date) AS month_date,
            source_name,
            COUNT(id) AS count
        FROM tenders
        WHERE {where_sql}
        GROUP BY date_trunc('month', close_date),
                 to_char(date_trunc('month', close_date), 'Mon YYYY'),
                 source_name
        ORDER BY date_trunc('month', close_date)
    """)
    result = await db.execute(sql, params)
    rows = result.all()

    # Pivot into {month, source1: count, source2: count, ...}
    months: dict = {}
    sources_seen: set = set()

    for r in rows:
        if r.month not in months:
            months[r.month] = {"month": r.month, "_sort": r.month_date}
        label = SOURCE_LABELS.get(r.source_name, r.source_name)
        months[r.month][label] = r.count
        sources_seen.add(label)

    sorted_months = sorted(months.values(), key=lambda x: x["_sort"])
    for m in sorted_months:
        del m["_sort"]

    return {
        "data":    sorted_months,
        "sources": sorted(list(sources_seen)),
    }


async def get_win_window(db: AsyncSession) -> list[dict]:
    """
    Tenders closing in the next 90 days, grouped by month and sector.
    Only known Prompcorp-relevant sectors.
    """
    from sqlalchemy import text
    result = await db.execute(text("""
        SELECT
            to_char(date_trunc('month', close_date), 'Mon YYYY') AS month,
            date_trunc('month', close_date) AS month_date,
            sector,
            COUNT(id) AS count
        FROM tenders
        WHERE close_date IS NOT NULL
          AND close_date >= NOW()
          AND close_date <= NOW() + INTERVAL '90 days'
          AND sector IN (
              'cleaning','facility_management','construction',
              'it_services','healthcare','transportation','utilities','other'
          )
        GROUP BY date_trunc('month', close_date),
                 to_char(date_trunc('month', close_date), 'Mon YYYY'),
                 sector
        ORDER BY date_trunc('month', close_date), sector
    """))
    rows = result.all()

    # Pivot into {month, cleaning: N, facility_management: N, ...}
    months: dict = {}
    sectors_seen: set = set()
    for r in rows:
        if r.month not in months:
            months[r.month] = {"month": r.month, "_sort": r.month_date}
        months[r.month][r.sector] = r.count
        sectors_seen.add(r.sector)

    sorted_months = sorted(months.values(), key=lambda x: x["_sort"])
    for m in sorted_months:
        del m["_sort"]

    return {"data": sorted_months, "sectors": sorted(list(sectors_seen))}


async def get_sector_state_heatmap(db: AsyncSession) -> dict:
    """
    Count of tenders per (sector, state) combination.
    Returns pivot-ready data for heatmap rendering.
    """
    from sqlalchemy import text
    result = await db.execute(text("""
        SELECT
            sector,
            state,
            COUNT(id) AS count
        FROM tenders
        WHERE sector IN (
              'cleaning','facility_management','construction',
              'it_services','healthcare','transportation','utilities','other'
          )
          AND state IS NOT NULL
          AND state NOT IN ('Unknown', '')
        GROUP BY sector, state
        ORDER BY sector, state
    """))
    rows = result.all()

    # Build matrix: {sector: {state: count}}
    matrix: dict = {}
    states_seen: set = set()
    sectors_seen: set = set()
    for r in rows:
        if r.sector not in matrix:
            matrix[r.sector] = {}
        matrix[r.sector][r.state] = r.count
        states_seen.add(r.state)
        sectors_seen.add(r.sector)

    return {
        "matrix":  matrix,
        "sectors": sorted(list(sectors_seen)),
        "states":  sorted(list(states_seen)),
    }


async def get_agency_frequency(db: AsyncSession, limit: int = 15) -> list[dict]:
    """
    Top agencies by tender count (not value).
    Useful for identifying repeat clients.
    """
    from sqlalchemy import text
    result = await db.execute(text(f"""
        SELECT
            agency,
            COUNT(id) AS count,
            COUNT(CASE WHEN status IN ('open','active') THEN 1 END) AS open_count,
            COUNT(CASE WHEN status = 'upcoming' THEN 1 END) AS upcoming_count
        FROM tenders
        WHERE agency IS NOT NULL
          AND agency NOT IN ('Test Agency', '')
        GROUP BY agency
        ORDER BY count DESC
        LIMIT {limit}
    """))
    rows = result.all()
    return [
        {
            "agency":         r.agency,
            "count":          r.count,
            "open_count":     r.open_count,
            "upcoming_count": r.upcoming_count,
        }
        for r in rows
    ]


async def get_value_scatter(db: AsyncSession) -> list[dict]:
    """
    Upcoming tenders with contract_value > 0, for scatter plot.
    X = close_date, Y = contract_value, color = sector.
    Limited to 300 points for performance.
    """
    from sqlalchemy import text
    result = await db.execute(text("""
        SELECT
            title,
            agency,
            sector,
            state,
            contract_value,
            close_date,
            source_name
        FROM tenders
        WHERE contract_value > 0
          AND close_date IS NOT NULL
          AND close_date >= NOW()
        ORDER BY contract_value DESC
        LIMIT 300
    """))
    rows = result.all()
    return [
        {
            "title":          r.title[:60],
            "agency":         r.agency,
            "sector":         r.sector,
            "state":          r.state,
            "contract_value": float(r.contract_value),
            "close_date":     r.close_date.isoformat() if r.close_date else None,
            "source_name":    r.source_name,
        }
        for r in rows
    ]


async def get_sector_treemap(db: AsyncSession) -> list[dict]:
    """
    Treemap data: tender count grouped by sector then state.
    Returns flat list with sector/state/count for frontend to nest.
    """
    from sqlalchemy import text
    result = await db.execute(text("""
        SELECT
            sector,
            state,
            COUNT(id) AS count
        FROM tenders
        WHERE sector IN (
            'cleaning','facility_management','construction',
            'it_services','healthcare','transportation','utilities','other'
        )
        AND state IS NOT NULL
        AND state NOT IN ('Unknown', '')
        GROUP BY sector, state
        ORDER BY sector, count DESC
    """))
    rows = result.all()
    return [{"sector": r.sector, "state": r.state, "count": r.count} for r in rows]


async def get_sector_status_breakdown(db: AsyncSession) -> list[dict]:
    """
    For each sector: count of open, closed, upcoming tenders.
    Used for the radial/ring completion chart.
    """
    from sqlalchemy import text
    result = await db.execute(text("""
        SELECT
            sector,
            status,
            COUNT(id) AS count
        FROM tenders
        WHERE sector IN (
            'cleaning','facility_management','construction',
            'it_services','healthcare','transportation','utilities','other'
        )
        AND status IS NOT NULL
        GROUP BY sector, status
        ORDER BY sector, status
    """))
    rows = result.all()

    # Pivot into [{sector, open, closed, upcoming, total}]
    from collections import defaultdict
    sectors: dict = defaultdict(lambda: {"open": 0, "closed": 0, "upcoming": 0})
    for r in rows:
        if r.status in ("open", "active"):
            sectors[r.sector]["open"] += r.count
        elif r.status == "closed":
            sectors[r.sector]["closed"] += r.count
        elif r.status == "upcoming":
            sectors[r.sector]["upcoming"] += r.count

    result_list = []
    for sec, counts in sectors.items():
        total = counts["open"] + counts["closed"] + counts["upcoming"]
        result_list.append({
            "sector":   sec,
            "open":     counts["open"],
            "closed":   counts["closed"],
            "upcoming": counts["upcoming"],
            "total":    total,
        })

    return sorted(result_list, key=lambda x: x["total"], reverse=True)