/**
 * Types mirror SPEC.md exactly. Where SPEC.md doesn't spell out a wire shape
 * (list envelopes, nested-detail field names), the shape follows the most
 * literal reading of the spec text and standard FastAPI/Pydantic conventions
 * (snake_case, `items`/`total`/`page`/`page_size` pagination envelope). These
 * are reconciled against the live backend in the integration pass.
 */

export type Classification = 'hot' | 'warm' | 'cold'

export type WorkflowStatus = 'pending' | 'running' | 'success' | 'failed'

export interface Lead {
  id: number
  name: string
  email: string
  phone: string | null
  company: string | null
  message: string
  source: string
  created_at: string
}

export interface QualificationResult {
  id: number
  lead_id: number
  classification: Classification
  score: number
  reasoning_summary: string
  recommended_next_action: string
  suggested_follow_up: string
  model_used: string
  created_at: string
}

export interface WorkflowRun {
  id: number
  lead_id: number
  status: WorkflowStatus
  started_at: string
  completed_at: string | null
  error_message: string | null
  retry_count: number
}

export interface AuditLogEntry {
  id: number
  workflow_run_id: number | null
  event: string
  detail: string | null
  created_at: string
}

/** Lead + its (possibly not-yet-created) qualification and workflow state. */
export interface LeadWithStatus extends Lead {
  qualification_result: QualificationResult | null
  workflow_run: WorkflowRun | null
}

/** GET /api/v1/leads/{id} */
export interface LeadDetail extends LeadWithStatus {
  audit_log_entries: AuditLogEntry[]
}

/** GET /api/v1/workflows/{id} */
export interface WorkflowRunDetail extends WorkflowRun {
  audit_log_entries: AuditLogEntry[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface LeadListParams {
  page?: number
  page_size?: number
  classification?: Classification
  status?: WorkflowStatus
}

export interface WorkflowListParams {
  page?: number
  page_size?: number
  status?: WorkflowStatus
}

export interface LeadCreateRequest {
  name: string
  email: string
  phone?: string
  company?: string
  message: string
  source: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface AnalyticsSummary {
  total_leads: number
  by_classification: Record<Classification, number>
  by_status: Record<WorkflowStatus, number>
  avg_score: number
}

export interface HealthResponse {
  status: string
}

export interface ApiErrorBody {
  detail: string
}
