"""Lead endpoints: POST/GET list/GET detail."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Classification, Lead, QualificationResult, WorkflowRun, WorkflowStatus
from schemas import LeadCreate, LeadDetailOut, LeadWithResultOut, PaginatedLeads
from services.auth_service import get_current_user
from services.workflow_service import create_lead_and_qualify

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/leads", tags=["leads"])


def _to_lead_with_result(lead: Lead) -> LeadWithResultOut:
    workflow_run = lead.workflow_runs[0] if lead.workflow_runs else None
    return LeadWithResultOut(
        id=lead.id,
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        company=lead.company,
        message=lead.message,
        source=lead.source,
        created_at=lead.created_at,
        qualification_result=lead.qualification_result,
        workflow_run=workflow_run,
    )


@router.post(
    "",
    response_model=LeadWithResultOut,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new lead (webhook intake)",
    description="Creates a Lead + a pending WorkflowRun, runs AI qualification "
    "synchronously (Groq, mock fallback), and returns the lead with its "
    "qualification result and workflow run status inline.",
)
def create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
    _user: str = Depends(get_current_user),
) -> LeadWithResultOut:
    lead = create_lead_and_qualify(db, payload.model_dump())
    return _to_lead_with_result(lead)


@router.get(
    "",
    response_model=PaginatedLeads,
    summary="List leads (paginated, newest first)",
)
def list_leads(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    classification: Classification | None = Query(default=None),
    status: WorkflowStatus | None = Query(default=None),
    db: Session = Depends(get_db),
    _user: str = Depends(get_current_user),
) -> PaginatedLeads:
    query = db.query(Lead).options(
        joinedload(Lead.qualification_result), joinedload(Lead.workflow_runs)
    )

    if classification is not None:
        query = query.join(QualificationResult).filter(QualificationResult.classification == classification)
    if status is not None:
        query = query.join(WorkflowRun, WorkflowRun.lead_id == Lead.id).filter(WorkflowRun.status == status)

    total = query.distinct().count()

    leads = (
        query.order_by(Lead.created_at.desc(), Lead.id.desc())
        .distinct()
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedLeads(
        items=[_to_lead_with_result(lead) for lead in leads],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get(
    "/{lead_id}",
    response_model=LeadDetailOut,
    summary="Get full lead detail",
    description="Returns the Lead + QualificationResult + WorkflowRun + its AuditLogEntries.",
)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    _user: str = Depends(get_current_user),
) -> LeadDetailOut:
    lead = (
        db.query(Lead)
        .options(
            joinedload(Lead.qualification_result),
            joinedload(Lead.workflow_runs).joinedload(WorkflowRun.audit_log_entries),
        )
        .filter(Lead.id == lead_id)
        .one_or_none()
    )
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    workflow_run = lead.workflow_runs[0] if lead.workflow_runs else None
    audit_entries = workflow_run.audit_log_entries if workflow_run else []

    return LeadDetailOut(
        id=lead.id,
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        company=lead.company,
        message=lead.message,
        source=lead.source,
        created_at=lead.created_at,
        qualification_result=lead.qualification_result,
        workflow_run=workflow_run,
        audit_log_entries=sorted(audit_entries, key=lambda e: e.id),
    )
