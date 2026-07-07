import uuid
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
import enum


class ChecklistStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETE = "complete"
    BLOCKED = "blocked"
    NOT_APPLICABLE = "not_applicable"


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    STATUS_CHANGE = "status_change"
    DELETE = "delete"


class Domain(Base):
    """Top-level domain: Govern/Protect/Identity."""
    __tablename__ = "domains"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    accent_color: Mapped[str] = mapped_column(String(7), default="#0d9488")
    icon_name: Mapped[str] = mapped_column(String(50), default="shield")
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    capabilities: Mapped[List["Capability"]] = relationship("Capability", back_populates="domain", cascade="all, delete-orphan", order_by="Capability.display_order")


class Capability(Base):
    """L1 capability within a domain (e.g., Risk Management)."""
    __tablename__ = "capabilities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    domain_id: Mapped[str] = mapped_column(String(36), ForeignKey("domains.id"), nullable=False, index=True)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    domain: Mapped["Domain"] = relationship("Domain", back_populates="capabilities")
    sub_capabilities: Mapped[List["SubCapability"]] = relationship("SubCapability", back_populates="capability", cascade="all, delete-orphan", order_by="SubCapability.display_order")


class SubCapability(Base):
    """L2 sub-capability within an L1 capability (e.g., Cyber Risk Register)."""
    __tablename__ = "sub_capabilities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    capability_id: Mapped[str] = mapped_column(String(36), ForeignKey("capabilities.id"), nullable=False, index=True)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    capability: Mapped["Capability"] = relationship("Capability", back_populates="sub_capabilities")
    checklist_items: Mapped[List["ChecklistItem"]] = relationship("ChecklistItem", back_populates="sub_capability", cascade="all, delete-orphan")


class ChecklistItem(Base):
    """Lowest-level checklist item/task under an L2 sub-capability."""
    __tablename__ = "checklist_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[ChecklistStatus] = mapped_column(SAEnum(ChecklistStatus, name="checklist_status", create_constraint=True), default=ChecklistStatus.NOT_STARTED)
    owner: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    sub_capability_id: Mapped[str] = mapped_column(String(36), ForeignKey("sub_capabilities.id"), nullable=False, index=True)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    last_updated_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sub_capability: Mapped["SubCapability"] = relationship("SubCapability", back_populates="checklist_items")
    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_to])
    updater: Mapped[Optional["User"]] = relationship("User", foreign_keys=[last_updated_by])


class AuditLog(Base):
    """Immutable audit log for all create/update/status-change events."""
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    action: Mapped[AuditAction] = mapped_column(SAEnum(AuditAction, name="audit_action", create_constraint=True), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    changes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
