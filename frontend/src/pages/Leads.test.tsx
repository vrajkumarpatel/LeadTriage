import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Leads } from './Leads'
import type { LeadWithStatus, PaginatedResponse } from '../types'

const mockLeads: LeadWithStatus[] = [
  {
    id: 1,
    name: 'Jordan Blake',
    email: 'jordan@example.com',
    phone: null,
    company: 'Acme Co',
    message: 'Need this live by Friday.',
    source: 'website-form',
    created_at: '2026-03-04T12:00:00Z',
    qualification_result: {
      id: 1, lead_id: 1, classification: 'hot', score: 92,
      reasoning_summary: 'Urgent.', recommended_next_action: 'Call now.',
      suggested_follow_up: 'Following up...', model_used: 'mock',
      created_at: '2026-03-04T12:00:00Z',
    },
    workflow_run: { id: 1, lead_id: 1, status: 'success', started_at: '2026-03-04T12:00:00Z', completed_at: '2026-03-04T12:00:01Z', error_message: null, retry_count: 0 },
  },
  {
    id: 2,
    name: 'Sam Rivera',
    email: 'sam@example.com',
    phone: null,
    company: null,
    message: 'Just browsing for now.',
    source: 'n8n-webhook',
    created_at: '2026-03-04T11:00:00Z',
    qualification_result: {
      id: 2, lead_id: 2, classification: 'cold', score: 15,
      reasoning_summary: 'No urgency.', recommended_next_action: 'Nurture.',
      suggested_follow_up: 'Checking in eventually...', model_used: 'mock',
      created_at: '2026-03-04T11:00:00Z',
    },
    workflow_run: { id: 2, lead_id: 2, status: 'success', started_at: '2026-03-04T11:00:00Z', completed_at: '2026-03-04T11:00:01Z', error_message: null, retry_count: 0 },
  },
]

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
  return {
    ...actual,
    api: {
      ...actual.api,
      listLeads: vi.fn(
        async (): Promise<PaginatedResponse<LeadWithStatus>> => ({
          items: mockLeads,
          total: mockLeads.length,
          page: 1,
          page_size: 20,
        }),
      ),
    },
  }
})

describe('Leads page', () => {
  it('renders a classification badge per lead once loaded, from mock data', async () => {
    render(
      <MemoryRouter>
        <Leads />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Jordan Blake')).toBeInTheDocument())
    expect(screen.getByText('Sam Rivera')).toBeInTheDocument()

    const hotRow = screen.getByText('Jordan Blake').closest('li')
    const coldRow = screen.getByText('Sam Rivera').closest('li')
    expect(hotRow).not.toBeNull()
    expect(coldRow).not.toBeNull()

    // each row shows its own classification badge and raw numeric score
    expect(within(hotRow!).getByText('Hot')).toBeInTheDocument()
    expect(within(hotRow!).getByText('92')).toBeInTheDocument()
    expect(within(coldRow!).getByText('Cold')).toBeInTheDocument()
    expect(within(coldRow!).getByText('15')).toBeInTheDocument()
  })
})
