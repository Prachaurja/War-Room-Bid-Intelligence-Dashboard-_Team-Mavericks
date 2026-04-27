from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class TendersNetURL(Base):
    __tablename__ = "tendersnet_urls"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    url            = Column(String(2000), nullable=False, unique=True)
    label          = Column(String(255), nullable=True)
    is_active      = Column(Boolean, nullable=False, default=True)
    last_fetched_at = Column(DateTime(timezone=True), nullable=True)
    record_count   = Column(Integer, nullable=True, default=0)
    created_at     = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)