from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.ingestion.clients.austender_client import AusTenderClient
from app.ingestion.clients.nsw_etender_client import NSWeTenderClient
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
    """Main Ingestion Job. Runs Every 30 Minutes."""
    logger.info("=== Ingestion Job Started ===")

    clients = [AusTenderClient(), NSWeTenderClient()]
    all_normalised = []

    for client in clients:
        try:
            raw_records = await client.fetch()
            logger.info(f"{client.SOURCE_NAME}: Fetched {len(raw_records)} Raw Records")
            for raw in raw_records:
                normalised = normalise(client.SOURCE_NAME, raw)
                if normalised:
                    all_normalised.append(normalised)
        except Exception as e:
            logger.error(f"Client {client.SOURCE_NAME} Failed: {e}", exc_info=True)
        finally:
            await client.close()

    logger.info(f"Total Ready to Save: {len(all_normalised)} Normalised Records")

    new_ids      = []
    alerts_count = 0

    if all_normalised:
        async with AsyncSessionLocal() as db:
            # Step 1 — save tenders
            summary = await bulk_upsert(db, all_normalised)
            logger.info(
                f"DB result: {summary['inserted']} inserted, "
                f"{summary['updated']} updated, "
                f"{summary['skipped']} skipped"
            )

            # Step 2 — match new tenders against saved searches
            new_ids = summary.get("new_ids", [])
            if new_ids:
                logger.info(f"Running Alert Matcher for {len(new_ids)} New Tenders...")
                alerts_count = await run_alert_matcher(db, new_ids)
                logger.info(f"Alert Matcher Created {alerts_count} Alert(s)")
            else:
                logger.info("No New Tenders — Skipping Alert Matcher")

    # Step 3 — invalidate Redis cache so fresh data loads immediately
    try:
        await invalidate_stats_cache()
        logger.info("Cache Invalidated After Ingestion")
    except Exception as e:
        logger.error(f"Cache Invalidation Failed: {e}")

    # Step 4 — broadcast to all connected WebSocket clients
    try:
        await ws_manager.broadcast({
            "type":           "ingestion_complete",
            "new_tenders":    len(new_ids),
            "new_alerts":     alerts_count,
            "total_ingested": len(all_normalised),
        })
    except Exception as e:
        logger.error(f"WebSocket Broadcast Failed: {e}")

    logger.info("=== Ingestion Job Complete ===")


def start_scheduler():
    scheduler.add_job(
        run_ingestion,
        trigger=IntervalTrigger(minutes=30),
        id="tender_ingestion",
        name="Fetch Tenders From All Sources",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler Started — Ingestion Runs Every 30 Minutes")


def stop_scheduler():
    scheduler.shutdown()