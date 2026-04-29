from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime
from uuid import UUID


class TenderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: Optional[str] = None
    agency: str
    sector: Optional[str] = None
    state: Optional[str] = None
    status: Optional[str] = "active"
    contract_value: Optional[float] = None
    close_date: Optional[datetime] = None
    published_date: Optional[datetime] = None
    source_name: str
    source_id: str
    source_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TenderListResponse(BaseModel):
    items: List[TenderRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class SectorStat(BaseModel):
    sector: str
    count: int
    total_value: float


class StateStat(BaseModel):
    state: str
    count: int
    total_value: float


class OverviewStats(BaseModel):
    total_tenders: int
    active_tenders: int
    closed_tenders: int
    upcoming_tenders: int
    total_value: float
    avg_value: float
    active_value: float
    closed_value: float
    upcoming_value: float
    sources: Dict[str, int]