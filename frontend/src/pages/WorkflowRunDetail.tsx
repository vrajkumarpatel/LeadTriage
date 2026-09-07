import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { Card } from '../components/Card'
import { ErrorState, LoadingState } from '../components/States'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../context/ToastContext'
import { isRetryable } from '../lib/badges'
import { durationBetween, formatDateTime } from '../lib/format'
import type { WorkflowRunDetail as WorkflowRunDetailType } from '../types'

export function WorkflowRunDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { push } = useToast()
  const [run, setRun] = useState<WorkflowRunDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  async function load() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      setRun(await api.getWorkflow(Number(id)))
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
    if (!run) return
    setRetrying(true)
    try {
      await api.retryWorkflow(run.id)
      push('Retry triggered — re-running qualification.', 'success')
      await load()
    } catch (err) {
      push(apiErrorMessage(err, 'Could not retry this workflow.'), 'error')
    } finally {
      setRetrying(false)
    }
  }

  if (loading) return <LoadingState label="Loading workflow run…" />
  if (error || !run) return <ErrorState message={error ?? 'Workflow run not found.'} onRetry={load} />

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/workflows')}
        className="mb-4 flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to workflow history
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-surface px-5 py-5 shadow-card">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-semibold text-text">Run #{run.id}</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="mt-1.5 text-sm text-text-muted">
            <Link to={`/leads/${run.lead_id}`} className="text-primary hover:underline">
              Lead #{run.lead_id}
            </Link>{' '}
            · started {formatDateTime(run.started_at)}
          </p>
        </div>
        {isRetryable(run.status) && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Retrying…' : 'Retry workflow'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="font-display text-sm font-semibold text-text">Run details</h2>
          <dl className="mt-3 flex flex-col gap-2.5 text-sm">
            <Row label="Started" value={formatDateTime(run.started_at)} />
            <Row label="Completed" value={formatDateTime(run.completed_at)} />
            <Row label="Duration" value={durationBetween(run.started_at, run.completed_at)} />
            <Row label="Retries" value={String(run.retry_count)} mono />
          </dl>
          {run.error_message && (
            <div className="mt-3 rounded-md bg-status-failed-soft px-3 py-2 text-xs text-status-failed">
              {run.error_message}
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display text-sm font-semibold text-text">Audit log</h2>
          {run.audit_log_entries.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No audit events recorded yet.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-4">
              {run.audit_log_entries.map((entry, i) => (
                <li key={entry.id} className="relative pl-5">
                  <span
                    className={`absolute left-0 top-1 h-2 w-2 rounded-full ${i === 0 ? 'bg-primary' : 'bg-border'}`}
                  />
                  {i < run.audit_log_entries.length - 1 && (
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
