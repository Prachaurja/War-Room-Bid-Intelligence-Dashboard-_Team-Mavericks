from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.ingestion.clients.austender_client import AusTenderClient
from app.ingestion.clients.nsw_etender_client import NSWeTenderClient
from app.ingestion.normaliser import normalise
from app.ingestion.deduplicator import bulk_upsert
from app.core.database import AsyncSessionLocal
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

async def run_ingestion():
    """Main ingestion job. Runs every 30 minutes."""
    logger.info("=== Ingestion job started ===")

    clients = [AusTenderClient(), NSWeTenderClient()]
    all_normalised = []

    for client in clients:
        try:
            raw_records = await client.fetch()
            logger.info(
                f"{client.SOURCE_NAME}: fetched {len(raw_records)} raw records"
            )
            for raw in raw_records:
                normalised = normalise(client.SOURCE_NAME, raw)
                if normalised:
                    all_normalised.append(normalised)
        except Exception as e:
            logger.error(f"Client {client.SOURCE_NAME} failed: {e}", exc_info=True)
        finally:
            await client.close()

    logger.info(f"Total ready to save: {len(all_normalised)} normalised records")

    if all_normalised:
        async with AsyncSessionLocal() as db:
            summary = await bulk_upsert(db, all_normalised)
            logger.info(f"DB result: {summary}")

    logger.info("=== Ingestion job complete ===")

def start_scheduler():
    scheduler.add_job(
        run_ingestion,
        trigger=IntervalTrigger(minutes=30),
        id="tender_ingestion",
        name="Fetch tenders from all sources",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — ingestion runs every 30 minutes")

def stop_scheduler():
    scheduler.shutdown()