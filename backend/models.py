"""SQLAlchemy ORM models matching SPEC.md's data model exactly."""
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Classification(str, enum.Enum):
    hot = "hot"
    warm = "warm"
    cold = "cold"


class WorkflowStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    success = "success"
    failed = "failed"


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    qualification_result: Mapped["QualificationResult | None"] = relationship(
        back_populates="lead", uselist=False, cascade="all, delete-orphan"
    )
    workflow_runs: Mapped[list["WorkflowRun"]] = relationship(
        back_populates="lead", cascade="all, delete-orphan"
    )


class QualificationResult(Base):
    __tablename__ = "qualification_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id"), nullable=False, unique=True)
    classification: Mapped[Classification] = mapped_column(
        Enum(Classification, native_enum=False, length=10), nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    reasoning_summary: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_next_action: Mapped[str] = mapped_column(String(500), nullable=False)
    suggested_follow_up: Mapped[str] = mapped_column(Text, nullable=False)
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    lead: Mapped["Lead"] = relationship(back_populates="qualification_result")


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id"), nullable=False)
    status: Mapped[WorkflowStatus] = mapped_column(
        Enum(WorkflowStatus, native_enum=False, length=10), default=WorkflowStatus.pending, nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    lead: Mapped["Lead"] = relationship(back_populates="workflow_runs")
    audit_log_entries: Mapped[list["AuditLogEntry"]] = relationship(
        back_populates="workflow_run", cascade="all, delete-orphan"
    )


class AuditLogEntry(Base):
    __tablename__ = "audit_log_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workflow_run_id: Mapped[int | None] = mapped_column(ForeignKey("workflow_runs.id"), nullable=True)
    event: Mapped[str] = mapped_column(String(100), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    workflow_run: Mapped["WorkflowRun | None"] = relationship(back_populates="audit_log_entries")
