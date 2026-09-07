import axios, { type AxiosError } from 'axios'
import { clearToken, getToken } from './token'
import type {
  AnalyticsSummary,
  ApiErrorBody,
  HealthResponse,
  LeadCreateRequest,
  LeadDetail,
  LeadListParams,
  LeadWithStatus,
  LoginRequest,
  LoginResponse,
  PaginatedResponse,
  WorkflowListParams,
  WorkflowRun,
  WorkflowRunDetail,
} from '../types'

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

/** Fired when a 401 forces a logout, so the app shell can redirect. */
export const UNAUTHORIZED_EVENT = 'leadtriage:unauthorized'

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      clearToken()
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)

/** Extracts a human-readable message from a failed API call. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as ApiErrorBody | undefined)?.detail
    if (detail) return detail
    if (error.code === 'ERR_NETWORK') return "Can't reach the LeadTriage API. Is it running?"
    if (error.message) return error.message
  }
  return fallback
}

export const api = {
  health(): Promise<HealthResponse> {
    return client.get('/health').then((r) => r.data)
  },

  login(body: LoginRequest): Promise<LoginResponse> {
    return client.post('/api/v1/auth/login', body).then((r) => r.data)
  },

  createLead(body: LeadCreateRequest): Promise<LeadWithStatus> {
    return client.post('/api/v1/leads', body).then((r) => r.data)
  },

  listLeads(params: LeadListParams = {}): Promise<PaginatedResponse<LeadWithStatus>> {
    return client.get('/api/v1/leads', { params }).then((r) => r.data)
  },

  getLead(id: number): Promise<LeadDetail> {
    return client.get(`/api/v1/leads/${id}`).then((r) => r.data)
  },

  listWorkflows(params: WorkflowListParams = {}): Promise<PaginatedResponse<WorkflowRun>> {
    return client.get('/api/v1/workflows', { params }).then((r) => r.data)
  },

  getWorkflow(id: number): Promise<WorkflowRunDetail> {
    return client.get(`/api/v1/workflows/${id}`).then((r) => r.data)
  },

  retryWorkflow(id: number): Promise<WorkflowRun> {
    return client.post(`/api/v1/workflows/${id}/retry`).then((r) => r.data)
  },

  analyticsSummary(): Promise<AnalyticsSummary> {
    return client.get('/api/v1/analytics/summary').then((r) => r.data)
  },
}
