import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useTenant } from '@/composables/useTenant'

const CONFIGURED_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api/v1'
const BASE_URL = import.meta.env.DEV ? '/api/v1' : CONFIGURED_URL

// Prevent concurrent refresh attempts — queue waiting requests
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

const addRefreshSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb)
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
})

// Request interceptor — auth token, session ID, tenant context
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore()

    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }

    const sessionId = sessionStorage.getItem('sessionId')
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId
    }

    const { extractSubdomain } = useTenant()
    const subdomain = extractSubdomain() || import.meta.env.VITE_TENANT_SUBDOMAIN || 'demo'
    config.headers['X-Tenant-Subdomain'] = subdomain
    config.headers['X-Original-Host'] = `${subdomain}.${window.location.hostname}`

    return config
  },
  error => Promise.reject(error),
)

// Response interceptor — token refresh and tenant 403 handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async error => {
    const originalRequest = error.config
    const authStore = useAuthStore()

    // No response at all (network error)
    if (!error.response) {
      return Promise.reject(error)
    }

    // 401 on auth endpoints — force logout, don't retry
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/logout')

    if (error.response.status === 401 && isAuthEndpoint) {
      isRefreshing = false
      refreshSubscribers = []
      authStore.logout()
      return Promise.reject(error)
    }

    // 401 on any other endpoint — attempt token refresh
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Another request is already refreshing — queue this one
      if (isRefreshing) {
        return new Promise(resolve => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true
      try {
        await authStore.refreshAccessToken()
        isRefreshing = false
        const newToken = authStore.accessToken!
        onRefreshed(newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        isRefreshing = false
        refreshSubscribers = []
        authStore.logout()
        return Promise.reject(refreshError)
      }
    }

    // 403 — check if it's a tenant access error
    if (error.response.status === 403) {
      const message: string = error.response?.data?.message || ''
      if (message.toLowerCase().includes('tenant')) {
        const { clearTenant } = useTenant()
        clearTenant()
        if (
          !window.location.pathname.includes('/tenant-access-denied') &&
          !window.location.pathname.includes('/unauthorized')
        ) {
          window.location.href = '/tenant-access-denied'
        }
      }
    }

    return Promise.reject(error)
  },
)

export default api
