content = open('app/ingestion/scheduler.py').read()

# Add CronTrigger import
old_import = 'from apscheduler.triggers.interval import IntervalTrigger'
new_import = 'from apscheduler.triggers.interval import IntervalTrigger\nfrom apscheduler.triggers.cron import CronTrigger'
content = content.replace(old_import, new_import)

# Add datetime import
old_logging = 'import logging'
new_logging = 'import logging\nfrom datetime import datetime, timezone'
content = content.replace(old_logging, new_logging)

# Add sqlalchemy update import
old_select = 'from sqlalchemy import select'
new_select = 'from sqlalchemy import select, update as sql_update'
content = content.replace(old_select, new_select)

# Add Tender model import
old_model = 'from app.models.tenders_net_urls import TendersNetURL'
new_model = 'from app.models.tenders_net_urls import TendersNetURL\nfrom app.models.tender import Tender'
content = content.replace(old_model, new_model)

# Add the expiry job function before start_scheduler
old_start = 'def start_scheduler():'
new_expiry = '''async def run_expiry():
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
                    Tender.close_date != None,
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
                    Tender.close_date != None,
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


def start_scheduler():'''

content = content.replace(old_start, new_expiry)

# Add expiry job to start_scheduler
old_scheduler_start = '''    scheduler.start()
    logger.info("Scheduler started — ingestion runs every 30 minutes")'''
new_scheduler_start = '''    scheduler.add_job(
        run_expiry,
        trigger=CronTrigger(hour=0, minute=0),
        id="tender_expiry",
        name="Expire closed tenders daily at midnight",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — ingestion runs every 30 minutes, expiry runs at midnight")'''

content = content.replace(old_scheduler_start, new_scheduler_start)

open('app/ingestion/scheduler.py', 'w').write(content)
print('Done')