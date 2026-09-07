import { useToast } from '../context/ToastContext'

const VARIANT_CLASSES: Record<string, string> = {
  success: 'border-l-status-success bg-white',
  error: 'border-l-status-failed bg-white',
  info: 'border-l-primary bg-white',
}

export function ToastViewport() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`flex items-start justify-between gap-3 rounded-md border border-border border-l-4 px-4 py-3 shadow-pop ${VARIANT_CLASSES[toast.variant]}`}
        >
          <p className="text-sm text-text">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="shrink-0 text-text-faint hover:text-text-muted"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
