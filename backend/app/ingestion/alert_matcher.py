from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
# Import User first so SQLAlchemy mapper can resolve the relationship
import app.models.user  # noqa: F401
from app.models.alert import Alert, SavedSearch
from app.models.tender import Tender
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


def tender_matches_search(tender: Tender, search: SavedSearch) -> bool:
    if search.sector:
        if (tender.sector or "").lower().strip() != search.sector.lower().strip():
            return False
    if search.state:
        if (tender.state or "").lower().strip() != search.state.lower().strip():
            return False
    if search.min_value and search.min_value > 0:
        if not tender.contract_value or tender.contract_value < search.min_value:
            return False
    if search.max_value and search.max_value > 0:
        if not tender.contract_value or tender.contract_value > search.max_value:
            return False
    return True


async def run_alert_matcher(db: AsyncSession, new_ids: list) -> int:
    if not new_ids:
        logger.info("Alert matcher: no new tenders to match")
        return 0

    tenders_result = await db.execute(
        select(Tender).where(Tender.id.in_(new_ids))
    )
    new_tenders = tenders_result.scalars().all()

    if not new_tenders:
        return 0

    searches_result = await db.execute(
        select(SavedSearch).where(SavedSearch.notifications.is_(True))
    )
    saved_searches = searches_result.scalars().all()

    if not saved_searches:
        logger.info("Alert matcher: no active saved searches found")
        return 0

    logger.info(
        f"Alert matcher: checking {len(new_tenders)} new tenders "
        f"against {len(saved_searches)} saved searches"
    )

    alerts_created = 0

    for search in saved_searches:
        matches = [t for t in new_tenders if tender_matches_search(t, search)]
        if not matches:
            continue

        for tender in matches:
            value_str  = f"${tender.contract_value:,.0f}" if tender.contract_value else "value unknown"
            state_str  = tender.state or "Unknown State"
            sector_str = (tender.sector or "General").replace("_", " ").title()

            alert = Alert(
                user_id=     search.user_id,
                title=       f"New {sector_str} Tender — {state_str}",
                description= (
                    f"A {value_str} {sector_str.lower()} contract "
                    f"from {tender.agency or 'Unknown Agency'} matches "
                    f"your saved search \"{search.name}\"."
                ),
                type=     "tender",
                priority= _get_priority(tender.contract_value),
                read=     False,
            )
            db.add(alert)
            alerts_created += 1

        search.match_count  = (search.match_count or 0) + len(matches)
        search.last_matched = datetime.now(timezone.utc)
        logger.info(f"Saved search '{search.name}': {len(matches)} match(es)")

    if alerts_created > 0:
        await db.commit()
        logger.info(f"Alert matcher: {alerts_created} total alerts created")
    else:
        logger.info("Alert matcher: no matches found")

    return alerts_created


def _get_priority(contract_value: float | None) -> str:
    if not contract_value:
        return "low"
    if contract_value >= 5_000_000:
        return "high"
    if contract_value >= 1_000_000:
        return "medium"
    return "low"
