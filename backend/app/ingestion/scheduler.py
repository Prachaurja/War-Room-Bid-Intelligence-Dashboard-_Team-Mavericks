from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.ingestion.clients.austender_client import AusTenderClient
from app.ingestion.clients.qld_client import QLDTendersClient
from app.ingestion.normaliser import normalise
from app.ingestion.deduplicator import bulk_upsert
from app.ingestion.alert_matcher import run_alert_matcher
from app.routers.ws_router import manager as ws_manager
from app.core.cache import invalidate_stats_cache
from app.core.database import AsyncSessionLocal
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def run_ingestion():
    """
    Main ingestion job — runs every 30 minutes.
    Sources:
      - AusTenderClient  → Federal closed contracts
      - QLDTendersClient → QLD closed contracts + upcoming pipeline
    """
    logger.info("=== Ingestion job started ===")

    clients = [AusTenderClient(), QLDTendersClient()]  # list of clients to fetch data from

    all_normalised = []

    for client in clients:
        try:
            raw_records = await client.fetch()
            logger.info(f"{client.SOURCE_NAME}: fetched {len(raw_records)} raw records")
            for raw in raw_records:
                normalised = normalise(client.SOURCE_NAME, raw)
                if normalised:
                    all_normalised.append(normalised)
        except Exception as e:
            logger.error(f"Client {client.SOURCE_NAME} failed: {e}", exc_info=True)
        finally:
            await client.close()

    by_status = {}
    for r in all_normalised:
        s = r.get("status", "unknown")
        by_status[s] = by_status.get(s, 0) + 1

    logger.info(f"Total normalised: {len(all_normalised)} — {by_status}")

    new_ids      = []
    alerts_count = 0

    if all_normalised:
        async with AsyncSessionLocal() as db:
            summary = await bulk_upsert(db, all_normalised)
            logger.info(
                f"DB: {summary['inserted']} inserted, "
                f"{summary['updated']} updated, "
                f"{summary['skipped']} skipped"
            )

            new_ids = summary.get("new_ids", [])
            if new_ids:
                logger.info(f"Alert matcher: {len(new_ids)} new tenders...")
                alerts_count = await run_alert_matcher(db, new_ids)
                logger.info(f"Alert matcher: {alerts_count} alert(s) created")
            else:
                logger.info("No new tenders — skipping alert matcher")

    try:
        await invalidate_stats_cache()
        logger.info("Cache invalidated")
    except Exception as e:
        logger.error(f"Cache invalidation failed: {e}")

    try:
        await ws_manager.broadcast({
            "type":           "ingestion_complete",
            "new_tenders":    len(new_ids),
            "new_alerts":     alerts_count,
            "total_ingested": len(all_normalised),
            "by_status":      by_status,
        })
    except Exception as e:
        logger.error(f"WS broadcast failed: {e}")

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