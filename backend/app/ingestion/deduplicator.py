from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.tender import Tender
import uuid
import logging

logger = logging.getLogger(__name__)

async def upsert_tender(
    db: AsyncSession,
    normalised: Dict[str, Any]
) -> Optional[Tender]:
    """
    Insert tender if it doesn't exist, update it if it does.
    Matches on source_name + source_id (the unique key per source).
    Returns the Tender object (new or updated).
    """
    if not normalised:
        return None

    source_name = normalised.get("source_name")
    source_id = normalised.get("source_id")

    if not source_name or not source_id:
        logger.warning("Skipping record with missing source_name or source_id")
        return None

    # Check if this tender already exists in the database
    stmt = select(Tender).where(
        Tender.source_name == source_name,
        Tender.source_id == source_id
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        # Update the fields that might have changed
        existing.title = normalised.get("title", existing.title)
        existing.agency = normalised.get("agency", existing.agency)
        existing.contract_value = normalised.get("contract_value", existing.contract_value)
        existing.close_date = normalised.get("close_date", existing.close_date)
        existing.status = normalised.get("status", existing.status)
        existing.description = normalised.get("description", existing.description)
        logger.debug(f"Updated tender: {source_name}/{source_id}")
        return existing
    else:
        # Insert new tender
        tender = Tender(
            id=uuid.uuid4(),
            **normalised
        )
        db.add(tender)
        logger.info(f"Inserted new tender: {normalised.get('title','?')[:60]}")
        return tender

async def bulk_upsert(
    db: AsyncSession,
    normalised_list: list
) -> dict:
    """
    Upsert a list of normalised tenders in one DB session.
    Returns summary counts.
    """
    inserted = 0
    updated = 0
    skipped = 0

    for item in normalised_list:
        if not item:
            skipped += 1
            continue
        try:
            result = await upsert_tender(db, item)
            if result:
                inserted += 1
            else:
                skipped += 1
        except Exception as e:
            logger.error(f"Upsert error: {e}")
            skipped += 1

    await db.commit()
    logger.info(f"Bulk upsert done: {inserted} saved, {skipped} skipped")
    return {"inserted": inserted, "updated": updated, "skipped": skipped}