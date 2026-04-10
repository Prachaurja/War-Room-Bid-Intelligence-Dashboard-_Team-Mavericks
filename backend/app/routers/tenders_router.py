from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID

from app.core.dependencies import get_db
from app.services.tender_service import (
    get_tenders,
    get_tender_by_id,
    get_overview_stats,
    get_stats_by_sector,
    get_stats_by_state,
)
from app.schemas.tender_schema import (
    TenderRead,
    TenderListResponse,
    OverviewStats,
    SectorStat,
    StateStat,
)

router = APIRouter(prefix="/tenders", tags=["tenders"])


@router.get("/stats/overview", response_model=OverviewStats)
async def overview_stats(db: AsyncSession = Depends(get_db)):
    return await get_overview_stats(db)


@router.get("/stats/by-sector", response_model=List[SectorStat])
async def stats_by_sector(db: AsyncSession = Depends(get_db)):
    return await get_stats_by_sector(db)


@router.get("/stats/by-state", response_model=List[StateStat])
async def stats_by_state(db: AsyncSession = Depends(get_db)):
    return await get_stats_by_state(db)


@router.get("", response_model=TenderListResponse)
async def list_tenders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: Optional[str] = Query(default=None),
    sector: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    source_name: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    min_value: Optional[float] = Query(default=None),
    max_value: Optional[float] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    return await get_tenders(
        db=db,
        page=page,
        page_size=page_size,
        status=status,
        sector=sector,
        state=state,
        source_name=source_name,
        search=search,
        min_value=min_value,
        max_value=max_value,
    )

@router.get("/{tender_id}", response_model=TenderRead)
async def get_tender(
    tender_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    tender = await get_tender_by_id(db, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    return TenderRead.model_validate(tender)