from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.ingestion.clients.austender_client import AusTenderClient
from app.ingestion.clients.tenders_net_client import TendersNetClient
from app.models.tenders_net_urls import TendersNetURL
from app.models.tender import Tender
from sqlalchemy import select, update as sql_update
from app.ingestion.clients.qld_client import QLDTendersClient
from app.ingestion.normaliser import normalise
from app.ingestion.deduplicator import bulk_upsert
from app.ingestion.alert_matcher import run_alert_matcher
from app.routers.ws_router import manager as ws_manager
from app.core.cache import invalidate_stats_cache
from app.core.database import AsyncSessionLocal
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def run_ingestion():
    """
    Main ingestion job — runs every 30 minutes.
    Sources:
      - AusTenderClient  → Federal closed contracts
      - QLDTendersClient → QLD closed contracts + upcoming pipeline
      - TendersNetClient → Live open tenders from notification URLs
    """
    logger.info("=== Ingestion job started ===")
    clients = [AusTenderClient(), QLDTendersClient()]

    # Load active TendersNet URLs from database
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(TendersNetURL).where(TendersNetURL.is_active.is_(True))
            )
            tn_urls = result.scalars().all()
            tn_entries = [
                {"id": u.id, "url": u.url, "label": u.label or ""}
                for u in tn_urls
            ]
        if tn_entries:
            clients.append(TendersNetClient(tn_entries))
            logger.info(f"TendersNet: {len(tn_entries)} active URL(s) loaded")
    except Exception as e:
        logger.warning(f"TendersNet URL load failed — {e}")

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

            # Update last_fetched_at for TendersNet URLs
            try:
                tn_ids = list({r.get("_url_id") for r in all_normalised if r.get("_url_id")})
                if tn_ids:
                    await db.execute(
                        sql_update(TendersNetURL)
                        .where(TendersNetURL.id.in_(tn_ids))
                        .values(last_fetched_at=datetime.now(timezone.utc))
                    )
                    await db.commit()
            except Exception as e:
                logger.warning(f"TendersNet timestamp update failed — {e}")

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


async def run_expiry():
    """
    Daily expiry job — runs at midnight.
    Marks open/upcoming tenders as closed if their close_date has passed.
    Completely independent of the ingestion job — no shared state.
    """
    logger.info("=== Expiry job started ===")
    now = datetime.now(timezone.utc)
    try:
        async with AsyncSessionLocal() as db:
            # Mark open tenders as closed if close_date has passed
            result_open = await db.execute(
                sql_update(Tender)
                .where(
                    Tender.status == "open",
                    Tender.close_date.is_not(None),
                    Tender.close_date < now,
                )
                .values(status="closed")
            )
            expired_open = result_open.rowcount

            # Mark upcoming tenders as closed if close_date has passed
            result_upcoming = await db.execute(
                sql_update(Tender)
                .where(
                    Tender.status == "upcoming",
                    Tender.close_date.is_not(None),
                    Tender.close_date < now,
                )
                .values(status="closed")
            )
            expired_upcoming = result_upcoming.rowcount

            await db.commit()

        logger.info(
            f"Expiry job: {expired_open} open + {expired_upcoming} upcoming "
            f"tenders marked as closed"
        )

        # Invalidate cache so stats reflect new counts immediately
        await invalidate_stats_cache()

    except Exception as e:
        logger.error(f"Expiry job failed: {e}", exc_info=True)

    logger.info("=== Expiry job complete ===")


def start_scheduler():
    scheduler.add_job(
        run_ingestion,
        trigger=IntervalTrigger(minutes=30),
        id="tender_ingestion",
        name="Fetch tenders from all sources",
        replace_existing=True,
    )
    scheduler.add_job(
        run_expiry,
        trigger=IntervalTrigger(minutes=30),
        id="tender_expiry",
        name="Expire closed tenders every 30 minutes",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — ingestion and expiry both run every 30 minutes")


def stop_scheduler():
    scheduler.shutdown()