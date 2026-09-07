"""Pydantic request/response models."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models import Classification, WorkflowStatus


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# AI layer contract (SPEC.md "AI Layer Contract")
# ---------------------------------------------------------------------------

class QualificationLLMOutput(BaseModel):
    """Strict shape the Groq call (or mock fallback) must produce."""

    classification: Classification
    score: int = Field(ge=0, le=100)
    reasoning_summary: str
    recommended_next_action: str
    suggested_follow_up: str


# ---------------------------------------------------------------------------
# Leads
# ---------------------------------------------------------------------------

class LeadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=255)
    message: str = Field(min_length=1)
    source: str = Field(min_length=1, max_length=100)


class QualificationResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    classification: Classification
    score: int
    reasoning_summary: str
    recommended_next_action: str
    suggested_follow_up: str
    model_used: str
    created_at: datetime


class WorkflowRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    status: WorkflowStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int


class AuditLogEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workflow_run_id: Optional[int] = None
    event: str
    detail: Optional[str] = None
    created_at: datetime


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    message: str
    source: str
    created_at: datetime


class LeadWithResultOut(LeadOut):
    """Response for POST/GET-detail: Lead + QualificationResult + WorkflowRun."""

    qualification_result: Optional[QualificationResultOut] = None
    workflow_run: Optional[WorkflowRunOut] = None


class LeadDetailOut(LeadWithResultOut):
    """GET /leads/{id}: also includes the workflow run's audit log entries."""

    audit_log_entries: list[AuditLogEntryOut] = Field(default_factory=list)


class PaginatedLeads(BaseModel):
    items: list[LeadWithResultOut]
    page: int
    page_size: int
    total: int


# ---------------------------------------------------------------------------
# Workflows
# ---------------------------------------------------------------------------

class WorkflowRunDetailOut(WorkflowRunOut):
    audit_log_entries: list[AuditLogEntryOut] = Field(default_factory=list)


class PaginatedWorkflowRuns(BaseModel):
    items: list[WorkflowRunOut]
    page: int
    page_size: int
    total: int


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

class ClassificationCounts(BaseModel):
    hot: int = 0
    warm: int = 0
    cold: int = 0


class StatusCounts(BaseModel):
    pending: int = 0
    running: int = 0
    success: int = 0
    failed: int = 0


class AnalyticsSummary(BaseModel):
    total_leads: int
    by_classification: ClassificationCounts
    by_status: StatusCounts
    avg_score: float
