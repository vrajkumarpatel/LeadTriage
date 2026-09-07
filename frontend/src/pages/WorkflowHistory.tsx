import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RefreshCw, Workflow as WorkflowIcon } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { ErrorState, EmptyState, LoadingState } from '../components/States'
import { StatusBadge } from '../components/StatusBadge'
import { Pagination } from '../components/Pagination'
import { useToast } from '../context/ToastContext'
import { isRetryable } from '../lib/badges'
import { formatDateTime, durationBetween } from '../lib/format'
import type { WorkflowRun, WorkflowStatus } from '../types'

const PAGE_SIZE = 20

export function WorkflowHistory() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as WorkflowStatus | null) ?? ''
  const page = Number(params.get('page') ?? '1')
  const { push } = useToast()

  const [items, setItems] = useState<WorkflowRun[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listWorkflows({ page, page_size: PAGE_SIZE, status: status || undefined })
      setItems(res.items)
      setTotal(res.total)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page])

  async function handleRetry(run: WorkflowRun) {
    setRetryingId(run.id)
    try {
      await api.retryWorkflow(run.id)
      push(`Retry triggered for run #${run.id}.`, 'success')
      await load()
    } catch (err) {
      push(apiErrorMessage(err, 'Could not retry this workflow run.'), 'error')
    } finally {
      setRetryingId(null)
    }
  }

  function updateStatus(value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set('status', value)
    else next.delete('status')
    next.set('page', '1')
    setParams(next)
  }

  function goToPage(p: number) {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
  }

  return (
    <div>
      <PageHeader title="Workflow History" subtitle="Every qualification run, with retries for failures." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['', 'pending', 'running', 'success', 'failed'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => updateStatus(s)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium capitalize ${
              status === s
                ? 'border-primary bg-primary-soft text-primary-hover'
                : 'border-border bg-white text-text-muted hover:border-text-faint'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <LoadingState label="Loading workflow runs…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<WorkflowIcon className="h-8 w-8 text-text-faint" strokeWidth={1.5} />}
            title="No workflow runs"
            message="Runs are created automatically whenever a lead comes in through the intake endpoint."
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-faint">
                  <th className="px-5 py-3">Run</th>
                  <th className="px-5 py-3">Lead</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Started</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Retries</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((run) => (
                  <tr key={run.id} className="border-b border-border-soft last:border-0 hover:bg-paper">
                    <td className="num px-5 py-3 text-text-faint">#{run.id}</td>
                    <td className="px-5 py-3">
                      <Link to={`/leads/${run.lead_id}`} className="text-primary hover:underline">
                        Lead #{run.lead_id}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="num px-5 py-3 text-text-muted">{formatDateTime(run.started_at)}</td>
                    <td className="num px-5 py-3 text-text-muted">
                      {durationBetween(run.started_at, run.completed_at)}
                    </td>
                    <td className="num px-5 py-3 text-text-muted">{run.retry_count}</td>
                    <td className="px-5 py-3 text-right">
                      {isRetryable(run.status) && (
                        <button
                          type="button"
                          onClick={() => handleRetry(run)}
                          disabled={retryingId === run.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1 text-xs font-medium text-text hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${retryingId === run.id ? 'animate-spin' : ''}`}
                          />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={goToPage} />
          </>
        )}
      </Card>
    </div>
  )
}
