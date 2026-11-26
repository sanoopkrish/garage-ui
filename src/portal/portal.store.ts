import { defineStore } from 'pinia'
import { portalAuth, portalApi, type PortalMe, type PortalSession } from './portal.api'
import { setPortalAccessToken, setPortalRefreshHandler } from './portal.client'

/**
 * Sprint 29 — customer portal session. Access token in memory, 30-day session in an httpOnly
 * cookie. `initialize()` runs once per load: a silent refresh tells us whether the customer
 * is still signed in. Nothing here touches the staff auth store.
 */
interface State {
  initialized: boolean
  accessToken: string | null
  contact: PortalSession['contact'] | null
  customer: PortalSession['customer'] | null
  me: PortalMe | null
  /** PORTAL_DISABLED from the API: the garage has not switched the portal on */
  disabled: boolean
}

export const usePortalStore = defineStore('portal', {
  state: (): State => ({ initialized: false, accessToken: null, contact: null, customer: null, me: null, disabled: false }),

  getters: {
    isSignedIn: (s) => !!s.accessToken && !!s.contact,
    features: (s) => s.me?.features ?? { jobStatus: true, documents: true, messages: true, quotes: false, invoices: false, booking: false },
    firstName: (s) => (s.contact?.name ?? '').split(' ')[0],
    isTrade: (s) => s.customer?.type === 'b2b',
  },

  actions: {
    applySession(session: PortalSession) {
      this.accessToken = session.accessToken
      this.contact = session.contact
      this.customer = session.customer
      this.disabled = false
      setPortalAccessToken(session.accessToken)
      this.scheduleRefresh(session.expiresIn)
    },

    clear() {
      this.accessToken = null
      this.contact = null
      this.customer = null
      this.me = null
      setPortalAccessToken(null)
      if (this.refreshTimer) { clearTimeout(this.refreshTimer); this.refreshTimer = undefined }
    },

    scheduleRefresh(expiresIn: number) {
      if (this.refreshTimer) clearTimeout(this.refreshTimer)
      // a minute before the 15-minute token runs out
      const ms = Math.max(30_000, (expiresIn - 60) * 1000)
      this.refreshTimer = window.setTimeout(() => { this.refresh().catch(() => undefined) }, ms)
    },

    /** Silent refresh from the cookie; returns the new token or null when there is no session */
    async refresh(): Promise<string | null> {
      try {
        const session = await portalAuth.refresh()
        this.applySession(session)
        return session.accessToken
      } catch (e: any) {
        if (e?.response?.data?.code === 'PORTAL_DISABLED') this.disabled = true
        this.clear()
        return null
      }
    },

    async initialize() {
      if (this.initialized) return
      setPortalRefreshHandler(() => this.refresh())
      await this.refresh()
      if (this.accessToken) await this.loadMe().catch(() => undefined)
      this.initialized = true
    },

    async loadMe() {
      this.me = await portalApi.me()
    },

    async exchange(token: string) {
      this.applySession(await portalAuth.exchange(token))
      await this.loadMe().catch(() => undefined)
    },

    async setPassword(token: string, password: string) {
      this.applySession(await portalAuth.setPassword(token, password))
      await this.loadMe().catch(() => undefined)
    },

    async login(email: string, password: string) {
      this.applySession(await portalAuth.login(email, password))
      await this.loadMe().catch(() => undefined)
    },

    async logout() {
      try { await portalAuth.logout() } catch { /* cookie may already be gone */ }
      this.clear()
    },
  },
})

// Pinia state typing does not include the timer field; keep it off the reactive state
declare module 'pinia' {
  export interface PiniaCustomProperties {
    refreshTimer?: number
  }
}
