from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base


class ApiKey(Base):
    __tablename__ = "api_keys"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name         = Column(String(100), nullable=False)          # human label e.g. "My Integration"
    key_hash     = Column(String(255), nullable=False, unique=True, index=True)  # bcrypt hash of full key
    prefix       = Column(String(12),  nullable=False)          # first 8 chars shown in UI e.g. "wr_live_"
    is_active    = Column(Boolean,     default=True, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="api_keys")