"""Analytics endpoint: GET /api/v1/analytics/summary."""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Classification, Lead, QualificationResult, WorkflowRun, WorkflowStatus
from schemas import AnalyticsSummary, ClassificationCounts, StatusCounts
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get(
    "/summary",
    response_model=AnalyticsSummary,
    summary="Aggregate analytics across all leads",
)
def analytics_summary(
    db: Session = Depends(get_db),
    _user: str = Depends(get_current_user),
) -> AnalyticsSummary:
    total_leads = db.query(func.count(Lead.id)).scalar() or 0

    classification_counts = ClassificationCounts()
    for classification, count in (
        db.query(QualificationResult.classification, func.count(QualificationResult.id))
        .group_by(QualificationResult.classification)
        .all()
    ):
        key = classification.value if isinstance(classification, Classification) else str(classification)
        setattr(classification_counts, key, count)

    status_counts = StatusCounts()
    for wf_status, count in (
        db.query(WorkflowRun.status, func.count(WorkflowRun.id)).group_by(WorkflowRun.status).all()
    ):
        key = wf_status.value if isinstance(wf_status, WorkflowStatus) else str(wf_status)
        setattr(status_counts, key, count)

    avg_score = db.query(func.avg(QualificationResult.score)).scalar()
    avg_score = round(float(avg_score), 2) if avg_score is not None else 0.0

    return AnalyticsSummary(
        total_leads=total_leads,
        by_classification=classification_counts,
        by_status=status_counts,
        avg_score=avg_score,
    )
