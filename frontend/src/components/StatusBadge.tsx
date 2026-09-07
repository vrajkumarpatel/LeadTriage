import { statusStyle } from '../lib/badges'
import type { WorkflowStatus } from '../types'

export function StatusBadge({ status }: { status: WorkflowStatus }) {
  const style = statusStyle(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${style.bgClass} ${style.textClass}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dotClass} ${style.pulse ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />
      {style.label}
    </span>
  )
}
