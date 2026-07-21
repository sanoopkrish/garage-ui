import { ref, computed } from 'vue'
import { safeLocalStorage } from '@/utils/storage'

interface Company {
  id: string
  name: string
  subdomain: string
}

const currentTenant = ref<Company | null>(null)
const tenantId = ref<string | null>(null)

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

  // Returns subdomain for API tenant headers — falls back to VITE_TENANT_SUBDOMAIN for local dev.
  function extractSubdomain(): string | null {
    return extractUrlSubdomain() ?? (import.meta.env.VITE_TENANT_SUBDOMAIN || null)
  }

  // True when on the owner/platform domain (no tenant subdomain in URL).
  // In dev mode this is always true so developers can access owner-only pages regardless of subdomain.
  const isOwnerDomain = computed(() => import.meta.env.DEV || !extractUrlSubdomain())

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
