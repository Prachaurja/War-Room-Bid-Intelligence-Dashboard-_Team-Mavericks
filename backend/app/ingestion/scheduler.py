from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.ingestion.clients.austender_client import AusTenderClient
from app.ingestion.clients.nsw_etender_client import NSWeTenderClient
from app.ingestion.normaliser import normalise
from app.ingestion.deduplicator import bulk_upsert
from app.ingestion.alert_matcher import run_alert_matcher
from app.core.database import AsyncSessionLocal
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def run_ingestion():
    """Main ingestion job. Runs every 30 minutes."""
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
            # Step 1 — save tenders, get back new IDs
            summary = await bulk_upsert(db, all_normalised)
            logger.info(
                f"DB Result: {summary['inserted']} Inserted, "
                f"{summary['updated']} Updated, "
                f"{summary['skipped']} Skipped"
            )

            # Step 2 — match new tenders against saved searches
            new_ids = summary.get("new_ids", [])
            if new_ids:
                logger.info(f"Running Alert Matcher for {len(new_ids)} New Tenders...")
                alerts_count = await run_alert_matcher(db, new_ids)
                logger.info(f"Alert Matcher Created {alerts_count} Alert(s)")
            else:
                logger.info("No New Tenders — Skipping Alert Matcher")

    # Step 3 — broadcast to all connected WebSocket clients
    try:
        from app.routers.ws_router import manager
        await manager.broadcast({
            "type":          "ingestion_complete",
            "new_tenders":   len(new_ids),
            "new_alerts":    alerts_count,
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
        name="Fetch Tenders from All Sources",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler Started - Ingestion Runs Every 30 Minutes")


def stop_scheduler():
    scheduler.shutdown()