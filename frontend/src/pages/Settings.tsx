import { API_BASE_URL } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { getToken } from '../lib/token'

export function Settings() {
  const token = getToken()
  const maskedToken = token ? `${token.slice(0, 10)}…${token.slice(-6)}` : '—'

  return (
    <div>
      <PageHeader title="Settings" subtitle="Where this instance points, for reference." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold text-text">API connection</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Set at build time via <code className="num rounded bg-paper px-1 py-0.5">VITE_API_BASE_URL</code>.
          </p>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <SettingRow label="API base URL" value={API_BASE_URL} />
            <SettingRow label="Auth scheme" value="Bearer JWT (single-tenant)" />
            <SettingRow label="Active session token" value={maskedToken} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold text-text">n8n webhook targets</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Configured on the n8n side, not per-user — shown here for reference only.
          </p>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <SettingRow label="Lead intake" value={`${API_BASE_URL}/api/v1/leads`} />
            <SettingRow label="Notification target" value="configured in n8n → notification.json" />
            <SettingRow label="Follow-up target" value="configured in n8n → follow-up.json" />
          </dl>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="font-display text-sm font-semibold text-text">About this instance</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          LeadTriage is single-tenant by design — there's one operator account and one set of
          integration targets, both set through environment variables on the backend and in the n8n
          workflows. There's nothing per-user to configure from this screen; it exists so you always
          know exactly where the UI is pointed.
        </p>
      </Card>
    </div>
  )
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="num truncate text-right text-text" title={value}>
        {value}
      </dd>
    </div>
  )
}
