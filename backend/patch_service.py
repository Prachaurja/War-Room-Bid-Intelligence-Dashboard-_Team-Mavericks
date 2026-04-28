content = open('app/services/tender_service.py').read()

old = '''    return OverviewStats(
        total_tenders=val_row.cnt,
        active_tenders=status_counts.get("active", 0) + status_counts.get("open", 0),
        closed_tenders=status_counts.get("closed", 0),
        upcoming_tenders=status_counts.get("upcoming", 0),
        total_value=float(val_row.total),
        avg_value=float(val_row.avg),
        sources=sources,
    )'''

new = '''    # Value by status
    status_value_rows = (
        await db.execute(
            select(Tender.status, func.coalesce(func.sum(Tender.contract_value), 0).label("total"))
            .group_by(Tender.status)
        )
    ).all()
    status_values = {r.status: float(r.total) for r in status_value_rows}

    return OverviewStats(
        total_tenders=val_row.cnt,
        active_tenders=status_counts.get("active", 0) + status_counts.get("open", 0),
        closed_tenders=status_counts.get("closed", 0),
        upcoming_tenders=status_counts.get("upcoming", 0),
        total_value=float(val_row.total),
        avg_value=float(val_row.avg),
        active_value=status_values.get("open", 0.0) + status_values.get("active", 0.0),
        closed_value=status_values.get("closed", 0.0),
        upcoming_value=status_values.get("upcoming", 0.0),
        sources=sources,
    )'''

content = content.replace(old, new)
open('app/services/tender_service.py', 'w').write(content)
print('Done')