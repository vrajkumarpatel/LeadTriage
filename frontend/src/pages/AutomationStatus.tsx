import { useEffect, useState } from 'react'
import { CheckCircle2, Send, Webhook, XCircle } from 'lucide-react'
import { api, API_BASE_URL, apiErrorMessage } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { LoadingState } from '../components/States'

type HealthState =
  | { kind: 'loading' }
  | { kind: 'up' }
  | { kind: 'down'; message: string }

export function AutomationStatus() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' })
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)

  async function checkHealth() {
    setHealth({ kind: 'loading' })
    try {
      const res = await api.health()
      setHealth(res.status === 'ok' ? { kind: 'up' } : { kind: 'down', message: `Unexpected status: ${res.status}` })
    } catch (err) {
      setHealth({ kind: 'down', message: apiErrorMessage(err) })
    } finally {
      setCheckedAt(new Date())
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <div>
      <PageHeader title="Automation Status" subtitle="Health of the API and the n8n orchestration layer around it." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-text">API health</h2>
            <button
              type="button"
              onClick={checkHealth}
              className="text-xs font-medium text-primary hover:underline"
            >
              Check again
            </button>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            <span className="num">GET {API_BASE_URL}/health</span>
          </p>

          <div className="mt-4">
            {health.kind === 'loading' ? (
              <LoadingState label="Checking…" />
            ) : health.kind === 'up' ? (
              <div className="flex items-center gap-2.5 rounded-md bg-status-success-soft px-3 py-2.5 text-status-success">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">API is reachable and reporting healthy.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-md bg-status-failed-soft px-3 py-2.5 text-status-failed">
                <XCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{health.message}</span>
              </div>
            )}
          </div>
          {checkedAt && (
            <p className="num mt-3 text-[11px] text-text-faint">Last checked {checkedAt.toLocaleTimeString()}</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold text-text">Notification pipeline</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Reference view — wired in n8n, not exposed through the API.
          </p>

          <ul className="mt-4 flex flex-col gap-3">
            <PipelineRow
              icon={Webhook}
              title="lead-intake.json"
              detail={`Webhook trigger → POST ${API_BASE_URL}/api/v1/leads`}
            />
            <PipelineRow
              icon={Send}
              title="notification.json"
              detail="Fires after qualification; posts a new-lead summary to the configured target."
            />
            <PipelineRow
              icon={Send}
              title="follow-up.json"
              detail="Formats suggested_follow_up and posts it, tagged as a follow-up."
            />
          </ul>

          <p className="mt-4 rounded-md bg-paper px-3 py-2.5 text-xs leading-relaxed text-text-muted">
            Demo mode: with no notification target configured in n8n, both workflows fall back to a
            local log-only mock webhook — the pipeline still runs end-to-end without any paid service.
          </p>
        </Card>
      </div>
    </div>
  )
}

function PipelineRow({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Webhook
  title: string
  detail: string
}) {
  return (
    <li className="flex items-start gap-3 rounded-md border border-border-soft px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="num text-xs font-semibold text-text">{title}</p>
        <p className="mt-0.5 text-xs text-text-muted">{detail}</p>
      </div>
    </li>
  )
}
