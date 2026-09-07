import { describe, expect, it } from 'vitest'
import { durationBetween, formatDate, formatDateTime, timeAgo } from './format'

describe('formatDateTime / formatDate', () => {
  it('returns a dash for null, undefined, or invalid input', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime('not-a-date')).toBe('—')
    expect(formatDate(null)).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
  })

  it('formats a valid ISO timestamp', () => {
    expect(formatDateTime('2026-03-04T14:31:00Z')).toMatch(/Mar 4/)
    expect(formatDate('2026-03-04T14:31:00Z')).toMatch(/Mar 4, 2026/)
  })
})

describe('timeAgo', () => {
  const now = new Date('2026-03-04T12:00:00Z').getTime()

  it('returns a dash for missing/invalid input', () => {
    expect(timeAgo(null, now)).toBe('—')
    expect(timeAgo('garbage', now)).toBe('—')
  })

  it('buckets recent times into just now / seconds / minutes / hours / days', () => {
    expect(timeAgo(new Date(now - 2000).toISOString(), now)).toBe('just now')
    expect(timeAgo(new Date(now - 30_000).toISOString(), now)).toBe('30s ago')
    expect(timeAgo(new Date(now - 5 * 60_000).toISOString(), now)).toBe('5m ago')
    expect(timeAgo(new Date(now - 3 * 3_600_000).toISOString(), now)).toBe('3h ago')
    expect(timeAgo(new Date(now - 2 * 86_400_000).toISOString(), now)).toBe('2d ago')
  })

  it('falls back to an absolute date beyond a week', () => {
    const eightDaysAgo = new Date(now - 8 * 86_400_000).toISOString()
    expect(timeAgo(eightDaysAgo, now)).toBe(formatDate(eightDaysAgo))
  })
})

describe('durationBetween', () => {
  it('returns a dash when the run has not completed or timestamps are invalid', () => {
    expect(durationBetween('2026-03-04T12:00:00Z', null)).toBe('—')
    expect(durationBetween('garbage', '2026-03-04T12:00:00Z')).toBe('—')
  })

  it('formats sub-second durations in milliseconds', () => {
    expect(durationBetween('2026-03-04T12:00:00.000Z', '2026-03-04T12:00:00.400Z')).toBe('400ms')
  })

  it('formats longer durations in seconds', () => {
    expect(durationBetween('2026-03-04T12:00:00Z', '2026-03-04T12:00:01.500Z')).toBe('1.5s')
  })
})
