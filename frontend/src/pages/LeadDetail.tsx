import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, RefreshCw, Building2 } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { Card } from '../components/Card'
import { ErrorState, LoadingState } from '../components/States'
import { ClassificationBadge } from '../components/ClassificationBadge'
import { StatusBadge } from '../components/StatusBadge'
import { ScoreMeter } from '../components/ScoreMeter'
import { useToast } from '../context/ToastContext'
import { classificationStyle, isRetryable } from '../lib/badges'
import { formatDateTime, durationBetween } from '../lib/format'
import type { LeadDetail as LeadDetailType } from '../types'

export function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { push } = useToast()
  const [lead, setLead] = useState<LeadDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  async function load() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getLead(Number(id))
      setLead(data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleRetry() {
    if (!lead?.workflow_run) return
    setRetrying(true)
    try {
      await api.retryWorkflow(lead.workflow_run.id)
      push('Retry triggered — re-running qualification.', 'success')
      await load()
    } catch (err) {
      push(apiErrorMessage(err, 'Could not retry this workflow.'), 'error')
    } finally {
      setRetrying(false)
    }
  }

  if (loading) return <LoadingState label="Loading lead…" />
  if (error || !lead) return <ErrorState message={error ?? 'Lead not found.'} onRetry={load} />

  const qr = lead.qualification_result
  const wr = lead.workflow_run
  const style = qr ? classificationStyle(qr.classification) : null

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/leads')}
        className="mb-4 flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to leads
      </button>

      <div className={`mb-6 flex flex-wrap items-start justify-between gap-4 rounded-lg border-l-4 bg-surface px-5 py-5 shadow-card ${style ? style.ringClass : 'border-l-border'}`}>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-semibold text-text">{lead.name}</h1>
            {qr && <ClassificationBadge classification={qr.classification} />}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
            <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-primary">
              <Mail className="h-3.5 w-3.5" /> {lead.email}
            </a>
            {lead.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {lead.phone}
              </span>
            )}
            {lead.company && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> {lead.company}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-text-faint">
            Source: <span className="num">{lead.source}</span> · Received {formatDateTime(lead.created_at)}
          </p>
        </div>
        {qr && (
          <div className="shrink-0">
            <ScoreMeter score={qr.score} classification={qr.classification} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="font-display text-sm font-semibold text-text">Message</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text">{lead.message}</p>
          </Card>

          {qr ? (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-text">Qualification</h2>
                <span className="num text-xs text-text-faint">{qr.model_used}</span>
              </div>
              <dl className="mt-3 flex flex-col gap-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-text-faint">Reasoning</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-text">{qr.reasoning_summary}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-text-faint">
                    Recommended next action
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-text">{qr.recommended_next_action}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-text-faint">
                    Suggested follow-up
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text">
                    {qr.suggested_follow_up}
                  </dd>
                </div>
              </dl>
            </Card>
          ) : (
            <Card className="p-5 text-sm text-text-muted">Qualification hasn't completed for this lead yet.</Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-text">Workflow run</h2>
              {wr && <StatusBadge status={wr.status} />}
            </div>
            {wr ? (
              <dl className="mt-3 flex flex-col gap-2.5 text-sm">
                <Row label="Started" value={formatDateTime(wr.started_at)} />
                <Row label="Completed" value={formatDateTime(wr.completed_at)} />
                <Row label="Duration" value={durationBetween(wr.started_at, wr.completed_at)} />
                <Row label="Retries" value={String(wr.retry_count)} mono />
                {wr.error_message && (
                  <div className="rounded-md bg-status-failed-soft px-3 py-2 text-xs text-status-failed">
                    {wr.error_message}
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-text-muted">No workflow run recorded.</p>
            )}
            {wr && isRetryable(wr.status) && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying…' : 'Retry workflow'}
              </button>
            )}
            {wr && (
              <Link
                to={`/workflows/${wr.id}`}
                className="mt-2 block text-center text-xs font-medium text-primary hover:underline"
              >
                View full workflow run
              </Link>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-semibold text-text">Audit log</h2>
            {lead.audit_log_entries.length === 0 ? (
              <p className="mt-3 text-sm text-text-muted">No audit events recorded yet.</p>
            ) : (
              <ol className="mt-3 flex flex-col gap-4">
                {lead.audit_log_entries.map((entry, i) => (
                  <li key={entry.id} className="relative pl-5">
                    <span
                      className={`absolute left-0 top-1 h-2 w-2 rounded-full ${
                        i === 0 ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                    {i < lead.audit_log_entries.length - 1 && (
                      <span className="absolute left-[3.5px] top-3 h-full w-px bg-border-soft" />
                    )}
                    <p className="text-xs font-semibold text-text">{entry.event}</p>
                    {entry.detail && <p className="mt-0.5 text-xs text-text-muted">{entry.detail}</p>}
                    <p className="num mt-0.5 text-[11px] text-text-faint">{formatDateTime(entry.created_at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-muted">{label}</dt>
      <dd className={mono ? 'num text-text' : 'text-text'}>{value}</dd>
    </div>
  )
}
