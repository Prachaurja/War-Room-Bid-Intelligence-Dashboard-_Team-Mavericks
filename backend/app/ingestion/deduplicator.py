from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.tender import Tender
import uuid
import logging

logger = logging.getLogger(__name__)


async def upsert_tender(
    db:         AsyncSession,
    normalised: Dict[str, Any],
) -> tuple[Optional[Tender], bool]:
    """
    Insert tender if it doesn't exist, update if it does.
    Returns (Tender, is_new) — is_new=True means it was just inserted.
    """
    if not normalised:
        return None, False

    source_name = normalised.get("source_name")
    source_id   = normalised.get("source_id")

    if not source_name or not source_id:
        logger.warning("Skipping Record with Missing source_name or source_id")
        return None, False

    stmt   = select(Tender).where(
        Tender.source_name == source_name,
        Tender.source_id   == source_id,
    )
    result   = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        # Update fields that may have changed
        existing.title          = normalised.get("title",          existing.title)
        existing.agency         = normalised.get("agency",         existing.agency)
        existing.contract_value = normalised.get("contract_value", existing.contract_value)
        existing.close_date     = normalised.get("close_date",     existing.close_date)
        
        # Do not overwrite status if expiry job already marked it closed
        new_status = normalised.get("status", existing.status)
        if existing.status != "closed" or new_status == "closed":
            existing.status = new_status
        existing.description    = normalised.get("description",    existing.description)
        logger.debug(f"Updated Tender: {source_name}/{source_id}")
        return existing, False  # not new
    else:
        tender = Tender(id=uuid.uuid4(), **normalised)
        db.add(tender)
        logger.info(f"Inserted New Tender: {normalised.get('title', '?')[:60]}")
        return tender, True  # brand new


async def bulk_upsert(
    db:             AsyncSession,
    normalised_list: list,
) -> dict:
    """
    Upsert a list of normalised tenders in one DB session.
    Returns summary counts AND list of new tender IDs for alert matching.
    """
    inserted     = 0
    updated      = 0
    skipped      = 0
    new_tenders  = []   # collect newly inserted Tender objects

    for item in normalised_list:
        if not item:
            skipped += 1
            continue
        try:
            tender, is_new = await upsert_tender(db, item)
            if tender and is_new:
                inserted += 1
                new_tenders.append(tender)
            elif tender:
                updated += 1
            else:
                skipped += 1
        except Exception as e:
            logger.error(f"Upsert Error: {e}")
            skipped += 1

    await db.commit()

    # Refresh new tenders so their IDs are available after commit
    for t in new_tenders:
        await db.refresh(t)

    new_ids = [t.id for t in new_tenders]
    logger.info(
        f"Bulk Upsert Done: {inserted} Inserted, "
        f"{updated} Updated, {skipped} Skipped"
    )
    return {
        "inserted":    inserted,
        "updated":     updated,
        "skipped":     skipped,
        "new_ids":     new_ids,      # list of UUID objects for alert matcher
    }