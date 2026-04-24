from sqlalchemy import (
    Column, String, Boolean, DateTime,
    Float, Integer, ForeignKey, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title       = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    type        = Column(String(50), nullable=False, default="tender")
    priority    = Column(String(20), nullable=False, default="medium")
    read        = Column(Boolean, default=False, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="alerts")


class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name          = Column(String(255), nullable=False)
    sector        = Column(String(100), nullable=True)
    state         = Column(String(50),  nullable=True)
    min_value     = Column(Float, nullable=True, default=0)
    max_value     = Column(Float, nullable=True, default=0)
    notifications = Column(Boolean, default=True, nullable=False)
    match_count   = Column(Integer, default=0, nullable=False)
    last_matched  = Column(DateTime(timezone=True), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="saved_searches")
