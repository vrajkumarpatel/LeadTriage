import { classificationStyle } from '../lib/badges'
import type { Classification } from '../types'

export function ClassificationBadge({ classification }: { classification: Classification }) {
  const style = classificationStyle(classification)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${style.bgClass} ${style.textClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dotClass}`} aria-hidden="true" />
      {style.label}
    </span>
  )
}
