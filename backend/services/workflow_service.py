"""Business logic: lead intake orchestration and workflow retry.

Ties together Lead creation, the AI qualification layer, WorkflowRun status
tracking, AuditLogEntry writes, and outbound notifications.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models import AuditLogEntry, Lead, QualificationResult, WorkflowRun, WorkflowStatus
from services import notifications
from services.qualification import qualify_lead

logger = logging.getLogger(__name__)


def _log_event(db: Session, workflow_run_id: int | None, event: str, detail: str | None = None) -> None:
    entry = AuditLogEntry(workflow_run_id=workflow_run_id, event=event, detail=detail)
    db.add(entry)
    db.flush()


def _run_qualification(db: Session, lead: Lead, workflow_run: WorkflowRun) -> None:
    """Runs (or re-runs) qualification for a lead, updating workflow_run in place."""
    workflow_run.status = WorkflowStatus.running
    workflow_run.error_message = None
    db.flush()
    _log_event(db, workflow_run.id, "qualification_started")

    try:
        result, model_used = qualify_lead(lead.message, lead.company, lead.source)

        existing = db.query(QualificationResult).filter(QualificationResult.lead_id == lead.id).one_or_none()
        if existing is not None:
            db.delete(existing)
            db.flush()

        qr = QualificationResult(
            lead_id=lead.id,
            classification=result.classification,
            score=result.score,
            reasoning_summary=result.reasoning_summary,
            recommended_next_action=result.recommended_next_action,
            suggested_follow_up=result.suggested_follow_up,
            model_used=model_used,
        )
        db.add(qr)
        db.flush()

        workflow_run.status = WorkflowStatus.success
        workflow_run.completed_at = datetime.now(timezone.utc)
        db.flush()

        classification_value = (
            result.classification.value if hasattr(result.classification, "value") else result.classification
        )
        _log_event(
            db,
            workflow_run.id,
            "qualification_succeeded",
            detail=f"classification={classification_value}, score={result.score}, model={model_used}",
        )

        notifications.notify_new_lead(lead, qr)
        notifications.notify_follow_up(lead, qr)

    except Exception as exc:
        logger.exception("Qualification failed for lead_id=%s", lead.id)
        workflow_run.status = WorkflowStatus.failed
        workflow_run.completed_at = datetime.now(timezone.utc)
        workflow_run.error_message = str(exc)
        db.flush()
        _log_event(db, workflow_run.id, "qualification_failed", detail=str(exc))


def create_lead_and_qualify(db: Session, lead_data: dict) -> Lead:
    """Creates a Lead + pending WorkflowRun, then runs qualification synchronously."""
    lead = Lead(**lead_data)
    db.add(lead)
    db.flush()

    workflow_run = WorkflowRun(lead_id=lead.id, status=WorkflowStatus.pending)
    db.add(workflow_run)
    db.flush()

    _log_event(db, workflow_run.id, "lead_received", detail=f"source={lead.source}")

    _run_qualification(db, lead, workflow_run)

    db.commit()
    db.refresh(lead)
    return lead


def retry_workflow(db: Session, workflow_run: WorkflowRun) -> WorkflowRun:
    """Re-runs qualification for a failed WorkflowRun. Caller must ensure status == failed."""
    lead = db.query(Lead).filter(Lead.id == workflow_run.lead_id).one()

    workflow_run.retry_count += 1
    db.flush()
    _log_event(db, workflow_run.id, "retry_triggered", detail=f"retry_count={workflow_run.retry_count}")

    _run_qualification(db, lead, workflow_run)

    db.commit()
    db.refresh(workflow_run)
    return workflow_run
