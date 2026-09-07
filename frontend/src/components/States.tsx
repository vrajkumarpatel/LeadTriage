import type { ReactNode } from 'react'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-text-faint">
      <div className="flex gap-1.5" aria-hidden="true">
        <span className="h-2 w-2 animate-bounce rounded-full bg-border-soft [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-border-soft [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-border-soft" />
      </div>
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorState({
  title = "Couldn't load this.",
  message,
  onRetry,
}: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-status-failed-soft bg-status-failed-soft/40 px-6 py-16 text-center">
      <p className="font-display text-base font-semibold text-hot-ink">{title}</p>
      <p className="max-w-sm text-sm text-text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-text shadow-card hover:border-text-faint"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  message,
  action,
  icon,
}: {
  title: string
  message: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-white px-6 py-16 text-center">
      {icon}
      <p className="font-display text-base font-semibold text-text">{title}</p>
      <p className="max-w-sm text-sm text-text-muted">{message}</p>
      {action}
    </div>
  )
}
