from sqlalchemy import Column, String, Float, DateTime, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base


class TenderStatus(str, enum.Enum):
    active   = "active"
    upcoming = "upcoming"
    closed   = "closed"


class TenderSector(str, enum.Enum):
    facility_management = "facility_management"
    construction        = "construction"
    cleaning            = "cleaning"
    it_services         = "it_services"
    healthcare          = "healthcare"
    transportation      = "transportation"
    other               = "other"


class Tender(Base):
    __tablename__ = "tenders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Core tender info
    title       = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    agency      = Column(String(255), nullable=False)

    # Classification
    sector = Column(String(100), nullable=True)
    state  = Column(String(50),  nullable=True)
    status = Column(String(50),  default="active")

    # Financial
    contract_value = Column(Float, nullable=True)

    # Dates
    close_date     = Column(DateTime(timezone=True), nullable=True)
    published_date = Column(DateTime(timezone=True), nullable=True)

    # Source tracking
    source_name = Column(String(100), nullable=False)
    source_id   = Column(String(255), nullable=False)
    source_url  = Column(String(1000), nullable=True)

    # Job tracking — which specific upload job created this tender
    # SET NULL on delete so tenders aren't orphaned when job record is removed
    job_id = Column(
        Integer,
        ForeignKey('ingestion_jobs.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())