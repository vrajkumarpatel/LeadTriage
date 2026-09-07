import { describe, expect, it } from 'vitest'
import { classificationStyle, isRetryable, scoreSegments, statusStyle } from './badges'

describe('scoreSegments', () => {
  it('maps 0-100 onto a 10-segment scale', () => {
    expect(scoreSegments(0)).toBe(0)
    expect(scoreSegments(100)).toBe(10)
    expect(scoreSegments(50)).toBe(5)
  })

  it('rounds to the nearest segment', () => {
    expect(scoreSegments(93)).toBe(9)
    expect(scoreSegments(95)).toBe(10) // rounds up
    expect(scoreSegments(4)).toBe(0)
    expect(scoreSegments(6)).toBe(1)
  })

  it('clamps out-of-range scores instead of producing invalid segment counts', () => {
    expect(scoreSegments(-20)).toBe(0)
    expect(scoreSegments(140)).toBe(10)
  })

  it('supports a custom segment count', () => {
    expect(scoreSegments(50, 4)).toBe(2)
    expect(scoreSegments(100, 4)).toBe(4)
  })
})

describe('classificationStyle', () => {
  it('gives each classification a distinct label and color set', () => {
    const hot = classificationStyle('hot')
    const warm = classificationStyle('warm')
    const cold = classificationStyle('cold')

    expect(hot.label).toBe('Hot')
    expect(warm.label).toBe('Warm')
    expect(cold.label).toBe('Cold')

    const dotClasses = new Set([hot.dotClass, warm.dotClass, cold.dotClass])
    expect(dotClasses.size).toBe(3) // no two classifications share a color
  })
})

describe('statusStyle', () => {
  it('only marks the running status as pulsing', () => {
    expect(statusStyle('running').pulse).toBe(true)
    expect(statusStyle('pending').pulse).toBe(false)
    expect(statusStyle('success').pulse).toBe(false)
    expect(statusStyle('failed').pulse).toBe(false)
  })
})

describe('isRetryable', () => {
  it('is only true for failed runs, matching the API contract (409 otherwise)', () => {
    expect(isRetryable('failed')).toBe(true)
    expect(isRetryable('pending')).toBe(false)
    expect(isRetryable('running')).toBe(false)
    expect(isRetryable('success')).toBe(false)
  })
})
