import type { Classification, WorkflowStatus } from '../types'

export interface SignalStyle {
  label: string
  text: string
  textClass: string
  bgClass: string
  dotClass: string
  ringClass: string
}

/**
 * Visual mapping for lead classification. Every surface that shows a
 * classification (list rows, detail header, dashboard charts) reads from
 * this single table so the hot/warm/cold signal system stays consistent
 * app-wide.
 */
export const CLASSIFICATION_STYLES: Record<Classification, SignalStyle> = {
  hot: {
    label: 'Hot',
    text: 'Hot lead',
    textClass: 'text-hot-ink',
    bgClass: 'bg-hot-soft',
    dotClass: 'bg-hot',
    ringClass: 'border-hot',
  },
  warm: {
    label: 'Warm',
    text: 'Warm lead',
    textClass: 'text-warm-ink',
    bgClass: 'bg-warm-soft',
    dotClass: 'bg-warm',
    ringClass: 'border-warm',
  },
  cold: {
    label: 'Cold',
    text: 'Cold lead',
    textClass: 'text-cold-ink',
    bgClass: 'bg-cold-soft',
    dotClass: 'bg-cold',
    ringClass: 'border-cold',
  },
}

export function classificationStyle(classification: Classification): SignalStyle {
  return CLASSIFICATION_STYLES[classification]
}

export interface StatusStyle {
  label: string
  textClass: string
  bgClass: string
  dotClass: string
  pulse: boolean
}

/** Visual mapping for WorkflowRun status. */
export const STATUS_STYLES: Record<WorkflowStatus, StatusStyle> = {
  pending: {
    label: 'Pending',
    textClass: 'text-status-pending',
    bgClass: 'bg-status-pending-soft',
    dotClass: 'bg-status-pending',
    pulse: false,
  },
  running: {
    label: 'Running',
    textClass: 'text-status-running',
    bgClass: 'bg-status-running-soft',
    dotClass: 'bg-status-running',
    pulse: true,
  },
  success: {
    label: 'Success',
    textClass: 'text-status-success',
    bgClass: 'bg-status-success-soft',
    dotClass: 'bg-status-success',
    pulse: false,
  },
  failed: {
    label: 'Failed',
    textClass: 'text-status-failed',
    bgClass: 'bg-status-failed-soft',
    dotClass: 'bg-status-failed',
    pulse: false,
  },
}

export function statusStyle(status: WorkflowStatus): StatusStyle {
  return STATUS_STYLES[status]
}

/**
 * Converts a 0-100 qualification score into a filled-segment count for the
 * segmented score meter (10 segments total). Clamps out-of-range input
 * defensively since the value crosses an API boundary.
 */
export function scoreSegments(score: number, totalSegments = 10): number {
  const clamped = Math.min(100, Math.max(0, score))
  return Math.round((clamped / 100) * totalSegments)
}

/** True when a workflow run can be retried per the API contract (409 otherwise). */
export function isRetryable(status: WorkflowStatus): boolean {
  return status === 'failed'
}
