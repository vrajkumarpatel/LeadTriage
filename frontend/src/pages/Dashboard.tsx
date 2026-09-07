import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, apiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { ErrorState, EmptyState, LoadingState } from '../components/States'
import { ClassificationBadge } from '../components/ClassificationBadge'
import { ScoreMeter } from '../components/ScoreMeter'
import { timeAgo } from '../lib/format'
import { CLASSIFICATION_STYLES, STATUS_STYLES } from '../lib/badges'
import type { AnalyticsSummary, LeadWithStatus } from '../types'

const CLASSIFICATION_HEX: Record<string, string> = {
  hot: '#d94f2b',
  warm: '#b3790a',
  cold: '#3f6e93',
}

const STATUS_HEX: Record<string, string> = {
  pending: '#6b7178',
  running: '#106b57',
  success: '#1f8a53',
  failed: '#c33b2e',
}

interface DashboardState {
  summary: AnalyticsSummary | null
  hotLeads: LeadWithStatus[]
  loading: boolean
  error: string | null
}

export function Dashboard() {
  const [state, setState] = useState<DashboardState>({
    summary: null,
    hotLeads: [],
    loading: true,
    error: null,
  })

  async function load() {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [summary, hot] = await Promise.all([
        api.analyticsSummary(),
        api.listLeads({ classification: 'hot', page: 1, page_size: 5 }),
      ])
      setState({ summary, hotLeads: hot.items, loading: false, error: null })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: apiErrorMessage(err) }))
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (state.loading) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Live snapshot of inbound lead quality and automation health." />
        <LoadingState label="Loading dashboard…" />
      </div>
    )
  }

  if (state.error || !state.summary) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <ErrorState message={state.error ?? 'No data returned.'} onRetry={load} />
      </div>
    )
  }

  const { summary, hotLeads } = state
  const classificationData = (Object.keys(CLASSIFICATION_HEX) as Array<keyof typeof CLASSIFICATION_HEX>).map(
    (key) => ({ key, label: CLASSIFICATION_STYLES[key as 'hot' | 'warm' | 'cold'].label, value: summary.by_classification[key as 'hot' | 'warm' | 'cold'] ?? 0 }),
  )
  const statusData = (Object.keys(STATUS_HEX) as Array<keyof typeof STATUS_HEX>).map((key) => ({
    key,
    label: STATUS_STYLES[key as 'pending' | 'running' | 'success' | 'failed'].label,
    value: summary.by_status[key as 'pending' | 'running' | 'success' | 'failed'] ?? 0,
  }))

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live snapshot of inbound lead quality and automation health." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total leads" value={summary.total_leads.toLocaleString()} />
        <StatTile label="Avg. score" value={summary.avg_score.toFixed(1)} accent="cold" />
        <StatTile label="Hot leads" value={(summary.by_classification.hot ?? 0).toLocaleString()} accent="hot" />
        <StatTile label="Failed runs" value={(summary.by_status.failed ?? 0).toLocaleString()} accent="failed" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold text-text">Classification breakdown</h2>
          <p className="mt-0.5 text-xs text-text-muted">Where qualified leads landed on the hot/warm/cold scale.</p>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classificationData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="#e2e1d9" />
                <XAxis type="number" allowDecimals={false} stroke="#8b9098" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={48}
                  stroke="#8b9098"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(20,24,31,0.04)' }}
                  contentStyle={{ borderRadius: 8, borderColor: '#e2e1d9', fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {classificationData.map((entry) => (
                    <Cell key={entry.key} fill={CLASSIFICATION_HEX[entry.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold text-text">Workflow status</h2>
          <p className="mt-0.5 text-xs text-text-muted">Where automation runs currently stand.</p>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="#e2e1d9" />
                <XAxis type="number" allowDecimals={false} stroke="#8b9098" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={56}
                  stroke="#8b9098"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(20,24,31,0.04)' }}
                  contentStyle={{ borderRadius: 8, borderColor: '#e2e1d9', fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_HEX[entry.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-text">Needs attention</h2>
            <p className="mt-0.5 text-xs text-text-muted">Most recent hot leads.</p>
          </div>
          <Link to="/leads?classification=hot" className="text-xs font-medium text-primary hover:underline">
            View all hot leads
          </Link>
        </div>
        {hotLeads.length === 0 ? (
          <EmptyState
            title="No hot leads right now"
            message="When a new lead qualifies as hot, it'll show up here first."
          />
        ) : (
          <ul>
            {hotLeads.map((lead) => (
              <li key={lead.id} className="border-b border-border-soft last:border-0">
                <Link
                  to={`/leads/${lead.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-paper"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {lead.name} {lead.company && <span className="text-text-muted">· {lead.company}</span>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-muted">{lead.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {lead.qualification_result && (
                      <ScoreMeter
                        score={lead.qualification_result.score}
                        classification={lead.qualification_result.classification}
                      />
                    )}
                    <ClassificationBadge classification="hot" />
                    <span className="num w-16 text-right text-xs text-text-faint">
                      {timeAgo(lead.created_at)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'hot' | 'cold' | 'failed'
}) {
  const accentClass =
    accent === 'hot' ? 'text-hot' : accent === 'failed' ? 'text-status-failed' : accent === 'cold' ? 'text-cold' : 'text-text'
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`num mt-1.5 text-2xl font-semibold ${accentClass}`}>{value}</p>
    </Card>
  )
}
