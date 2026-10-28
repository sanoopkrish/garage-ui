import { ref, computed } from 'vue'
import { safeLocalStorage } from '@/utils/storage'

interface Company {
  id: string
  name: string
  subdomain: string
}

const currentTenant = ref<Company | null>(null)
const tenantId = ref<string | null>(null)

// Owner/platform company subdomain (cms convention). In production the platform is
// served at https://<VITE_OWNER_SUBDOMAIN>.<base domain>, e.g. tconsult.cruise.a-soft.co.uk.
const OWNER_SUBDOMAIN: string | null = import.meta.env.VITE_OWNER_SUBDOMAIN || null

export function useTenant() {
  // Returns the subdomain from the URL only — no env-var fallback.
  // Used to determine if we're on the owner (platform) domain vs a tenant subdomain.
  function extractUrlSubdomain(): string | null {
    const host = window.location.hostname
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null
    const parts = host.split('.')
    if (host.includes('localhost')) {
      return parts.length > 1 ? parts[0] : null
    }
    if (parts.length >= 3) return parts[0]
    return null
  }

  // Returns subdomain for API tenant headers — falls back to VITE_TENANT_SUBDOMAIN in local dev
  // and to the owner subdomain when the URL carries none (bare base domain).
  function extractSubdomain(): string | null {
    const fromUrl = extractUrlSubdomain()
    if (fromUrl) return fromUrl
    if (import.meta.env.DEV && import.meta.env.VITE_TENANT_SUBDOMAIN) return import.meta.env.VITE_TENANT_SUBDOMAIN
    return OWNER_SUBDOMAIN
  }

  // True on the owner/platform domain: no tenant subdomain in the URL, or the URL subdomain is
  // the configured owner subdomain. In dev mode this is always true so developers can reach
  // owner-only pages regardless of subdomain.
  const isOwnerDomain = computed(() => {
    if (import.meta.env.DEV) return true
    const fromUrl = extractUrlSubdomain()
    return fromUrl === null || (OWNER_SUBDOMAIN !== null && fromUrl === OWNER_SUBDOMAIN)
  })

  function initializeTenant() {
    const subdomain = extractSubdomain() || import.meta.env.VITE_TENANT_SUBDOMAIN || null
    if (subdomain) {
      tenantId.value = subdomain
      safeLocalStorage.setItem('tenantSubdomain', subdomain)
    } else {
      tenantId.value = null
      safeLocalStorage.removeItem('tenantSubdomain')
      currentTenant.value = null
    }
  }

  function setTenant(company: Company) {
    currentTenant.value = company
    tenantId.value = company.subdomain
    safeLocalStorage.setItem('currentTenant', JSON.stringify(company))
  }

  function clearTenant() {
    currentTenant.value = null
    tenantId.value = null
    safeLocalStorage.removeItem('currentTenant')
    safeLocalStorage.removeItem('tenantSubdomain')
  }

  function loadTenantFromStorage() {
    const stored = safeLocalStorage.getItem('currentTenant')
    if (stored) {
      try {
        currentTenant.value = JSON.parse(stored)
        tenantId.value = currentTenant.value?.subdomain || null
      } catch {
        clearTenant()
      }
    }
  }

  function validateTenantAccess(userCompany: Company): boolean {
    const subdomain = extractSubdomain()
    if (!subdomain) return true // no subdomain = dev/main domain, allow
    return userCompany.subdomain === subdomain
  }

  const getCurrentSubdomain = computed(() => extractSubdomain())
  const isInTenantContext = computed(() => !!getCurrentSubdomain.value)

  return {
    currentTenant: computed(() => currentTenant.value),
    tenantId: computed(() => tenantId.value),
    getCurrentSubdomain,
    isInTenantContext,
    isOwnerDomain,
    extractSubdomain,
    extractUrlSubdomain,
    initializeTenant,
    setTenant,
    clearTenant,
    loadTenantFromStorage,
    validateTenantAccess,
  }
}
