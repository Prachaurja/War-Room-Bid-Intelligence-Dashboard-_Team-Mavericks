from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from app.core.database import Base


class InvitationStatus(str, enum.Enum):
    pending  = "pending"
    accepted = "accepted"
    expired  = "expired"
    revoked  = "revoked"


class Team(Base):
    __tablename__ = "teams"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name       = Column(String(100), nullable=False)
    owner_id   = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner       = relationship("User",       foreign_keys=[owner_id])
    invitations = relationship("Invitation", back_populates="team", cascade="all, delete-orphan")


class Invitation(Base):
    __tablename__ = "invitations"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id    = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    email      = Column(String(255), nullable=False, index=True)
    role       = Column(String(50),  nullable=False, default="analyst")
    token      = Column(String(255), nullable=False, unique=True, index=True)  # secure random token for accept link
    status     = Column(SAEnum(InvitationStatus), default=InvitationStatus.pending, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    team = relationship("Team", back_populates="invitations")