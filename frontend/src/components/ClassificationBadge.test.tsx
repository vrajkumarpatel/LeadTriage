import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClassificationBadge } from './ClassificationBadge'

describe('ClassificationBadge', () => {
  it('renders the label for each classification', () => {
    const { rerender } = render(<ClassificationBadge classification="hot" />)
    expect(screen.getByText('Hot')).toBeInTheDocument()

    rerender(<ClassificationBadge classification="warm" />)
    expect(screen.getByText('Warm')).toBeInTheDocument()

    rerender(<ClassificationBadge classification="cold" />)
    expect(screen.getByText('Cold')).toBeInTheDocument()
  })

  it('applies a distinct background class per classification', () => {
    const { container, rerender } = render(<ClassificationBadge classification="hot" />)
    const hotClass = container.querySelector('span')?.className
    rerender(<ClassificationBadge classification="cold" />)
    const coldClass = container.querySelector('span')?.className
    expect(hotClass).not.toBe(coldClass)
  })
})
