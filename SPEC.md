# LeadTriage — API Contract & Data Model

This is the fixed contract both the backend and frontend are built against. Do not deviate without updating this file first.

## Workflow

```
Lead (webhook) → n8n (intake) → FastAPI /api/v1/leads → validation
  → LLM qualification (Groq, mock fallback) → structured result → PostgreSQL
  → Dashboard (React) → n8n (notification) → n8n (follow-up)
```

## Data Model

**Lead**
- `id` (int, PK)
- `name` (str)
- `email` (str)
- `phone` (str, optional)
- `company` (str, optional)
- `message` (text)
- `source` (str — e.g. "website-form", "n8n-webhook")
- `created_at` (datetime)

**QualificationResult** (one-to-one with Lead)
- `id` (int, PK)
- `lead_id` (FK)
- `classification` (enum: `hot` | `warm` | `cold`)
- `score` (int, 0-100)
- `reasoning_summary` (text)
- `recommended_next_action` (str)
- `suggested_follow_up` (text)
- `model_used` (str — e.g. "groq/llama-3.3-70b-versatile" or "mock")
- `created_at` (datetime)

**WorkflowRun**
- `id` (int, PK)
- `lead_id` (FK)
- `status` (enum: `pending` | `running` | `success` | `failed`)
- `started_at` (datetime)
- `completed_at` (datetime, nullable)
- `error_message` (text, nullable)
- `retry_count` (int, default 0)

**AuditLogEntry**
- `id` (int, PK)
- `workflow_run_id` (FK, nullable)
- `event` (str — e.g. "lead_received", "qualification_started", "qualification_succeeded", "qualification_failed", "retry_triggered")
- `detail` (text, nullable)
- `created_at` (datetime)

## API Endpoints (all under `/api/v1`, JSON in/out)

Auth: single-tenant JWT. `POST /api/v1/auth/login` with a username/password checked against env vars (`ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH`) returns a bearer token. All endpoints below except `/health` and `/auth/login` require `Authorization: Bearer <token>`.

- `GET /health` — no auth. Returns `{"status": "ok"}`.
- `POST /api/v1/auth/login` — `{username, password}` → `{access_token, token_type}`.
- `POST /api/v1/leads` — webhook intake. Body: `{name, email, phone?, company?, message, source}`. Creates the Lead + a WorkflowRun (`pending`), triggers qualification synchronously (demo-scale, no task queue needed), returns the created Lead with its QualificationResult and WorkflowRun status inline.
- `GET /api/v1/leads` — paginated list (`?page=&page_size=&classification=&status=`), newest first.
- `GET /api/v1/leads/{id}` — full detail: Lead + QualificationResult + WorkflowRun + its AuditLogEntries.
- `GET /api/v1/workflows` — paginated WorkflowRun list (`?status=`).
- `GET /api/v1/workflows/{id}` — WorkflowRun detail + AuditLogEntries.
- `POST /api/v1/workflows/{id}/retry` — re-runs qualification for that lead if `status == failed`; 409 otherwise.
- `GET /api/v1/analytics/summary` — `{total_leads, by_classification: {hot, warm, cold}, by_status: {pending, running, success, failed}, avg_score}`.

Errors: standard FastAPI `HTTPException` JSON (`{"detail": "..."}`), correct status codes (400 validation, 401 auth, 404 not found, 409 conflict, 500 unexpected — never leak stack traces to the client, log them server-side instead).

## AI Layer Contract

Given a Lead's `message`/`company`/`source`, produce a `QualificationResult` via a Groq chat completion (model `llama-3.3-70b-versatile`) prompted to return **strict JSON** matching:
```json
{"classification": "hot|warm|cold", "score": 0-100, "reasoning_summary": "...", "recommended_next_action": "...", "suggested_follow_up": "..."}
```
Parse and validate with Pydantic; on invalid JSON, retry the call once with an explicit "return valid JSON only" correction; on repeated failure or missing `GROQ_API_KEY`, fall back to a deterministic mock classifier (simple keyword/heuristic scoring) so the app always works without a live API key — set `model_used` to `"mock"` in that case. Log an approximate token count per real Groq call (from the API response's usage field) for cost awareness; no need for precise billing math.

## n8n Workflows (JSON exports under `n8n-workflows/`)

1. **lead-intake.json** — webhook trigger → HTTP POST to `{API_BASE_URL}/api/v1/leads` with the incoming form/webhook payload mapped to the Lead schema.
2. **notification.json** — triggered (via a webhook FastAPI calls after qualification) → posts a message to a configurable webhook URL (Slack-compatible format, but works against any URL — e.g. a local mock endpoint in demo mode) summarizing the new lead + classification.
3. **follow-up.json** — triggered similarly → formats the `suggested_follow_up` text and posts it to the same configurable notification target, tagged as a follow-up rather than a new-lead alert.

All three should be plain webhook-in/webhook-out flows with no paid-node dependencies, importable into any n8n instance (self-hosted or cloud free tier).

## Demo Mode

The whole stack must run and be demonstrable with zero paid services: no `GROQ_API_KEY` → mock classifier; no n8n instance running → the API still works standalone (n8n is an optional orchestration layer in front of the same `/api/v1/leads` endpoint, not a hard dependency); notification/follow-up targets default to a local log-only "mock webhook" if none is configured.
