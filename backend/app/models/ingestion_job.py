from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    job_name     = Column(String(255), nullable=False)
    source_name  = Column(String(255), nullable=False)
    file_name    = Column(String(500), nullable=True)
    status       = Column(String(50),  nullable=False, default='pending')
    total_rows   = Column(Integer, nullable=True, default=0)
    inserted     = Column(Integer, nullable=True, default=0)
    updated      = Column(Integer, nullable=True, default=0)
    skipped      = Column(Integer, nullable=True, default=0)
    error_msg    = Column(Text,    nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
