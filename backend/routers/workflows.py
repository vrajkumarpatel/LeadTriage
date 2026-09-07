"""Workflow endpoints: GET list/GET detail/POST retry."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import WorkflowRun, WorkflowStatus
from schemas import PaginatedWorkflowRuns, WorkflowRunDetailOut, WorkflowRunOut
from services.auth_service import get_current_user
from services.workflow_service import retry_workflow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])


@router.get(
    "",
    response_model=PaginatedWorkflowRuns,
    summary="List workflow runs (paginated)",
)
def list_workflows(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_: WorkflowStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _user: str = Depends(get_current_user),
) -> PaginatedWorkflowRuns:
    query = db.query(WorkflowRun)
    if status_ is not None:
        query = query.filter(WorkflowRun.status == status_)

    total = query.count()
    runs = (
        query.order_by(WorkflowRun.started_at.desc(), WorkflowRun.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedWorkflowRuns(
        items=[WorkflowRunOut.model_validate(run) for run in runs],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get(
    "/{workflow_run_id}",
    response_model=WorkflowRunDetailOut,
    summary="Get workflow run detail",
    description="Returns the WorkflowRun plus its AuditLogEntries.",
)
def get_workflow(
    workflow_run_id: int,
    db: Session = Depends(get_db),
    _user: str = Depends(get_current_user),
) -> WorkflowRunDetailOut:
    run = (
        db.query(WorkflowRun)
        .options(joinedload(WorkflowRun.audit_log_entries))
        .filter(WorkflowRun.id == workflow_run_id)
        .one_or_none()
    )
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow run not found")

    return WorkflowRunDetailOut(
        id=run.id,
        lead_id=run.lead_id,
        status=run.status,
        started_at=run.started_at,
        completed_at=run.completed_at,
        error_message=run.error_message,
        retry_count=run.retry_count,
        audit_log_entries=sorted(run.audit_log_entries, key=lambda e: e.id),
    )


@router.post(
    "/{workflow_run_id}/retry",
    response_model=WorkflowRunDetailOut,
    summary="Retry a failed workflow run",
    description="Re-runs qualification for the lead if the workflow run's status is 'failed'; 409 otherwise.",
)
def retry(
    workflow_run_id: int,
    db: Session = Depends(get_db),
    _user: str = Depends(get_current_user),
) -> WorkflowRunDetailOut:
    run = db.query(WorkflowRun).filter(WorkflowRun.id == workflow_run_id).one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow run not found")

    if run.status != WorkflowStatus.failed:
        current_status = run.status.value if hasattr(run.status, "value") else run.status
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Workflow run status is '{current_status}', not 'failed' — cannot retry",
        )

    updated = retry_workflow(db, run)

    updated = (
        db.query(WorkflowRun)
        .options(joinedload(WorkflowRun.audit_log_entries))
        .filter(WorkflowRun.id == updated.id)
        .one()
    )

    return WorkflowRunDetailOut(
        id=updated.id,
        lead_id=updated.lead_id,
        status=updated.status,
        started_at=updated.started_at,
        completed_at=updated.completed_at,
        error_message=updated.error_message,
        retry_count=updated.retry_count,
        audit_log_entries=sorted(updated.audit_log_entries, key=lambda e: e.id),
    )
