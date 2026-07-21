import { defineStore } from 'pinia'
import type { AuthUser } from '@/types/auth'

const MOCK_MODE = import.meta.env.VITE_MOCK_AUTH === 'true'

const MOCK_USER: AuthUser = {
  id: 'mock-001',
  email: 'admin@garage.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  companyId: 'garage-001',
  company: { id: 'garage-001', name: 'My Garage Ltd', subdomain: 'garage' },
}

interface AuthState {
  accessToken: string | null
  sessionId: string | null
  user: AuthUser | null
  userRoles: any[] | null
  userPermissions: Record<string, any> | null
  userPermissionsFlat: Record<string, boolean> | null
  initialized: boolean
  error: string
  refreshTimeout: ReturnType<typeof setTimeout> | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    sessionId: sessionStorage.getItem('sessionId'),
    user: null,
    userRoles: null,
    userPermissions: null,
    userPermissionsFlat: null,
    initialized: false,
    error: '',
    refreshTimeout: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    fullName: (state) =>
      state.user ? `${state.user.firstName} ${state.user.lastName}` : '',
    profilePhotoUrl: (state) => state.user?.profilePhoto || null,
    userCompany: (state) => state.user?.company || null,
    /** Holds ONLY Technician/Field Engineer roles — lands on the mobile field views (Module 8) */
    isFieldWorkerOnly: (state) => {
      const roles = state.userRoles ?? []
      const fieldRoles = ['Technician', 'Field Engineer']
      return roles.length > 0 && roles.every((r: any) => fieldRoles.includes(r.name))
    },
  },

  actions: {
    async initialize() {
      if (MOCK_MODE) {
        const stored = sessionStorage.getItem('mock_user')
        if (stored) {
          this.user = JSON.parse(stored)
          this.accessToken = 'mock-token'
          this._setMockPermissions()
        }
        this.initialized = true
        return
      }

      try {
        const api = (await import('@/api/client')).default
        const response = await api.post('/auth/refresh')
        const payload = response.data?.data ?? response.data
        this.accessToken = payload.access_token
        if (payload.session_id) {
          this.sessionId = payload.session_id
          sessionStorage.setItem('sessionId', payload.session_id)
        }
        this.scheduleTokenRefresh()
        await this.fetchProfile()
        await this.fetchUserRoles()
        this._connectNotificationsSocket()
      } catch {
        // No valid session — user stays null, router guard redirects to login
      }
      this.initialized = true
    },

    /** Real-time in-app notifications — connect once we hold an access token (cms pattern) */
    _connectNotificationsSocket() {
      if (!this.accessToken || MOCK_MODE) return
      Promise.all([
        import('@/stores/notifications.store'),
        import('@/stores/piniaInstance'),
      ]).then(([m, p]) => {
        const notificationsStore = m.useNotificationsStore(p.pinia)
        if (!notificationsStore.socket && this.accessToken) {
          notificationsStore.initializeSocket(this.accessToken)
        }
      }).catch(() => {})
    },

    async login(email: string, password: string, redirectTo?: string) {
      this.error = ''

      if (MOCK_MODE) {
        await new Promise(r => setTimeout(r, 600))
        if (!email || !password) {
          this.error = 'Email and password required.'
          throw new Error(this.error)
        }
        this.user = { ...MOCK_USER, email }
        this.accessToken = 'mock-token'
        sessionStorage.setItem('mock_user', JSON.stringify(this.user))
        this._setMockPermissions()
        const router = await import('@/router')
        router.default.push('/dashboard')
        return
      }

      try {
        const api = (await import('@/api/client')).default
        const response = await api.post('/auth/login', { email, password })
        const data = response.data?.data ?? response.data
        this.accessToken = data.access_token
        this.user = data.user
        if (data.session_id) {
          this.sessionId = data.session_id
          sessionStorage.setItem('sessionId', data.session_id)
        }
        if (data.mustChangePassword) {
          const router = await import('@/router')
          router.default.push('/auth/change-password')
          return
        }
        this.scheduleTokenRefresh()
        await this.fetchUserRoles()
        this._connectNotificationsSocket()
        const router = await import('@/router')
        router.default.push(redirectTo ?? (this.isFieldWorkerOnly ? '/field' : '/dashboard'))
      } catch (error: any) {
        const msg = error.response?.data?.message || error.message || 'Login failed.'
        this.error = msg
        throw new Error(msg)
      }
    },

    async fetchUserRoles() {
      try {
        const api = (await import('@/api/client')).default
        const response = await api.get('/auth/roles')
        this.userRoles = response.data?.data ?? response.data
        this._buildPermissions()
      } catch {
        // Non-fatal — user can still use the app, just without role-gated features
        this.userRoles = []
        this._buildPermissions()
      }
    },

    _buildPermissions() {
      const result: Record<string, any> = { menus: {}, isAdmin: false }

      for (const role of this.userRoles ?? []) {
        if (role.settings) {
          this._mergeRecursively(result, role.settings)
        }
      }

      this.userPermissions = result
      this.userPermissionsFlat = this._flattenPermissions(result.menus, 'menus')
    },

    _mergeRecursively(target: any, source: any) {
      for (const key in source) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {}
          this._mergeRecursively(target[key], source[key])
        } else if (typeof source[key] === 'boolean') {
          target[key] = target[key] || source[key]
        } else {
          target[key] = source[key]
        }
      }
    },

    _flattenPermissions(obj: any, parentKey = ''): Record<string, boolean> {
      let flat: Record<string, boolean> = {}
      for (const key in obj) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          flat = { ...flat, ...this._flattenPermissions(obj[key], fullKey) }
        } else {
          flat[fullKey] = obj[key]
        }
      }
      return flat
    },

    _setMockPermissions() {
      // In mock mode grant all permissions
      this.userPermissions = { menus: {}, isAdmin: true }
      this.userPermissionsFlat = {}
    },

    async fetchProfile() {
      try {
        const api = (await import('@/api/client')).default
        const response = await api.get('/auth/profile')
        this.user = response.data?.data ?? response.data
      } catch {
        this.accessToken = null
        this.user = null
      }
    },

    async refreshAccessToken() {
      const api = (await import('@/api/client')).default
      const response = await api.post('/auth/refresh')
      const payload = response.data?.data ?? response.data
      this.accessToken = payload.access_token
      if (payload.session_id) {
        this.sessionId = payload.session_id
        sessionStorage.setItem('sessionId', payload.session_id)
      }
      // Re-fetch roles after token refresh to keep permissions current
      await this.fetchUserRoles()
    },

    scheduleTokenRefresh() {
      if (!this.accessToken || MOCK_MODE) return
      if (this.refreshTimeout) clearTimeout(this.refreshTimeout)
      try {
        const exp = JSON.parse(atob(this.accessToken.split('.')[1])).exp
        const delay = exp * 1000 - Date.now() - 60000
        if (delay > 0) this.refreshTimeout = setTimeout(() => this.refreshAccessToken(), delay)
      } catch {}
    },

    logout() {
      Promise.all([
        import('@/stores/notifications.store'),
        import('@/stores/piniaInstance'),
      ]).then(([m, p]) => m.useNotificationsStore(p.pinia).disconnectSocket()).catch(() => {})
      this.accessToken = null
      this.sessionId = null
      this.user = null
      this.userRoles = null
      this.userPermissions = null
      this.userPermissionsFlat = null
      sessionStorage.removeItem('sessionId')
      sessionStorage.removeItem('mock_user')
      if (this.refreshTimeout) clearTimeout(this.refreshTimeout)
      if (!MOCK_MODE) {
        import('@/api/client').then(m => m.default.post('/auth/logout').catch(() => {}))
      }
      import('@/composables/useTenant').then(m => m.useTenant().clearTenant())
      import('@/router').then(m => {
        const router = m.default
        // Field PWA users stay on the field login, office users on the main one
        const target = router.currentRoute.value.path.startsWith('/field') ? '/field/login' : '/auth/login'
        if (router.currentRoute.value.path !== target) router.push(target)
      })
    },

    clearError() {
      this.error = ''
    },
  },
})
