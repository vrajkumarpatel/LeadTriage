import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { ErrorState, EmptyState, LoadingState } from '../components/States'
import { ClassificationBadge } from '../components/ClassificationBadge'
import { StatusBadge } from '../components/StatusBadge'
import { ScoreMeter } from '../components/ScoreMeter'
import { Pagination } from '../components/Pagination'
import { classificationStyle } from '../lib/badges'
import { timeAgo } from '../lib/format'
import type { Classification, LeadWithStatus, WorkflowStatus } from '../types'

const PAGE_SIZE = 20

export function Leads() {
  const [params, setParams] = useSearchParams()
  const classification = (params.get('classification') as Classification | null) ?? ''
  const status = (params.get('status') as WorkflowStatus | null) ?? ''
  const page = Number(params.get('page') ?? '1')

  const [items, setItems] = useState<LeadWithStatus[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listLeads({
        page,
        page_size: PAGE_SIZE,
        classification: classification || undefined,
        status: status || undefined,
      })
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
  }, [classification, status, page])

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setParams(next)
  }

  function goToPage(p: number) {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
  }

  const hasFilters = Boolean(classification || status)

  return (
    <div>
      <PageHeader title="Leads" subtitle="Every inbound lead, qualified and ranked." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Classification"
          value={classification}
          onChange={(v) => updateParam('classification', v)}
          options={[
            { value: '', label: 'All classifications' },
            { value: 'hot', label: 'Hot' },
            { value: 'warm', label: 'Warm' },
            { value: 'cold', label: 'Cold' },
          ]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => updateParam('status', v)}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'running', label: 'Running' },
            { value: 'success', label: 'Success' },
            { value: 'failed', label: 'Failed' },
          ]}
        />
        {hasFilters && (
          <button
            type="button"
            onClick={() => setParams(new URLSearchParams({ page: '1' }))}
            className="text-xs font-medium text-text-muted hover:text-text"
          >
            Clear filters
          </button>
        )}
      </div>

      <Card>
        {loading ? (
          <LoadingState label="Loading leads…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-8 w-8 text-text-faint" strokeWidth={1.5} />}
            title={hasFilters ? 'No leads match these filters' : 'No leads yet'}
            message={
              hasFilters
                ? 'Try a different classification or status, or clear the filters.'
                : 'New leads submitted through the intake webhook will show up here as soon as they arrive.'
            }
          />
        ) : (
          <>
            <ul>
              {items.map((lead) => {
                const style = lead.qualification_result
                  ? classificationStyle(lead.qualification_result.classification)
                  : null
                return (
                  <li key={lead.id} className="border-b border-border-soft last:border-0">
                    <Link
                      to={`/leads/${lead.id}`}
                      className={`flex items-center gap-4 border-l-4 px-4 py-3.5 hover:bg-paper ${
                        style ? style.ringClass : 'border-l-border-soft'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-text">{lead.name}</p>
                          {lead.company && (
                            <span className="truncate text-xs text-text-muted">{lead.company}</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-text-muted">{lead.message}</p>
                      </div>

                      <span className="hidden shrink-0 text-xs text-text-faint sm:block">{lead.source}</span>

                      {lead.qualification_result ? (
                        <div className="hidden shrink-0 items-center gap-3 md:flex">
                          <ScoreMeter
                            score={lead.qualification_result.score}
                            classification={lead.qualification_result.classification}
                          />
                          <ClassificationBadge classification={lead.qualification_result.classification} />
                        </div>
                      ) : (
                        <span className="hidden shrink-0 text-xs text-text-faint md:block">Qualifying…</span>
                      )}

                      {lead.workflow_run && (
                        <div className="hidden shrink-0 lg:block">
                          <StatusBadge status={lead.workflow_run.status} />
                        </div>
                      )}

                      <span className="num w-20 shrink-0 text-right text-xs text-text-faint">
                        {timeAgo(lead.created_at)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={goToPage} />
          </>
        )}
      </Card>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs shadow-card">
      <span className="text-text-faint">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-text outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
