import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useTenant } from '@/composables/useTenant'

/**
 * Sprint 29 — the customer portal's own HTTP client. Separate from the staff client so
 * nothing from the office session (token, session id, 403 tenant handling) leaks into the
 * portal, and a portal 401 never logs a member of staff out.
 *
 * The access token lives in memory (portal store); the 30-day session is an httpOnly cookie
 * scoped to /api/v1/portal/auth. On 401 one refresh runs and waiting requests queue behind it.
 */
const CONFIGURED_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api/v1'
const BASE_URL = import.meta.env.DEV ? '/api/v1' : CONFIGURED_URL

let accessToken: string | null = null
export function setPortalAccessToken(token: string | null): void {
  accessToken = token
}
export function getPortalAccessToken(): string | null {
  return accessToken
}

/** Set by the store so the client can refresh without importing Pinia here */
let refreshHandler: (() => Promise<string | null>) | null = null
export function setPortalRefreshHandler(fn: (() => Promise<string | null>) | null): void {
  refreshHandler = fn
}

let refreshing: Promise<string | null> | null = null

export const portalClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: true,
})

portalClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  const { extractSubdomain } = useTenant()
  const subdomain = extractSubdomain() || import.meta.env.VITE_TENANT_SUBDOMAIN || 'demo'
  config.headers['X-Tenant-Subdomain'] = subdomain
  config.headers['X-Original-Host'] = `${subdomain}.${window.location.hostname}`
  return config
})

portalClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const status = error.response?.status
    const isAuthRoute = !!original?.url?.includes('/portal/auth/')
    if (status !== 401 || !original || original._retried || isAuthRoute || !refreshHandler) {
      return Promise.reject(error)
    }
    original._retried = true
    try {
      refreshing = refreshing ?? refreshHandler().finally(() => { refreshing = null })
      const token = await refreshing
      if (!token) return Promise.reject(error)
      original.headers.Authorization = `Bearer ${token}`
      return portalClient(original)
    } catch {
      return Promise.reject(error)
    }
  },
)

/** Human message from an API error, for toasts and inline errors */
export function portalErrorMessage(e: any, fallback: string): string {
  const m = e?.response?.data?.message
  if (Array.isArray(m)) return m.join('. ')
  return typeof m === 'string' && m ? m : fallback
}

export function portalErrorCode(e: any): string | undefined {
  return e?.response?.data?.code
}
