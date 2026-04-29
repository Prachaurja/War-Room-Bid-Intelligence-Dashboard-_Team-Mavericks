content = open('app/services/tender_service.py').read()

# Add new function at the end
addition = '''

async def get_stats_by_source(db: AsyncSession):
    """
    Returns value and count broken down by source_name and status.
    Used for the source-wise value breakdown in the Active Bids card.
    """
    from sqlalchemy import case
    rows = (
        await db.execute(
            select(
                Tender.source_name,
                Tender.status,
                func.count(Tender.id).label("cnt"),
                func.coalesce(func.sum(Tender.contract_value), 0).label("total_value"),
            )
            .group_by(Tender.source_name, Tender.status)
            .order_by(Tender.source_name, Tender.status)
        )
    ).all()

    # Build nested dict: { source_name: { status: { count, value } } }
    result = {}
    for row in rows:
        src = row.source_name or "unknown"
        if src not in result:
            result[src] = {}
        result[src][row.status] = {
            "count": row.cnt,
            "value": float(row.total_value),
        }
    return result
'''

content += addition
open('app/services/tender_service.py', 'w').write(content)
print('Done service')

# Add import and endpoint to router
router_content = open('app/routers/tenders_router.py').read()

old_import = '''    get_overview_stats,
    get_stats_by_sector,
    get_stats_by_state,'''

new_import = '''    get_overview_stats,
    get_stats_by_sector,
    get_stats_by_state,
    get_stats_by_source,'''

router_content = router_content.replace(old_import, new_import)

# Add endpoint before the last line
new_endpoint = '''

# ── GET /tenders/stats/by-source ─────────────────────────────
@router.get("/stats/by-source")
async def stats_by_source(db: AsyncSession = Depends(get_db)):
    """
    Returns tender count and value broken down by source and status.
    Used for source-wise value breakdown in the Active Bids card.
    """
    cache_key = "warroom:stats:by-source"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    result = await get_stats_by_source(db)
    await cache_set(cache_key, result, TTL_5_MIN)
    return result
'''

router_content += new_endpoint
open('app/routers/tenders_router.py', 'w').write(router_content)
print('Done router')