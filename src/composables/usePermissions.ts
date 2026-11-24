import { computed, type ComputedRef } from 'vue'
import { useAuthStore } from '@/stores/auth'

export interface CrudPermissions {
  canCreate: ComputedRef<boolean>
  canRead: ComputedRef<boolean>
  canUpdate: ComputedRef<boolean>
  canDelete: ComputedRef<boolean>
  canAccess: ComputedRef<boolean>
}

export function usePermissions(requiredPermissions: string | string[] = []) {
  const authStore = useAuthStore()

  const isAdmin = computed(() => authStore.userPermissions?.isAdmin === true)

  const permArray = computed(() =>
    Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions],
  )

  // authStore.can() applies the admin override AND the company's module switches
  const hasPermission = computed(() => {
    if (permArray.value.length !== 1) return isAdmin.value
    return authStore.can(permArray.value[0])
  })

  const hasAnyPermission = computed(() => {
    if (permArray.value.length === 0) return true
    return permArray.value.some(k => authStore.can(k))
  })

  const hasAllPermissions = computed(() => {
    if (permArray.value.length === 0) return true
    return permArray.value.every(k => authStore.can(k))
  })

  return { hasPermission, hasAnyPermission, hasAllPermissions, canAccess: hasAnyPermission, isAdmin }
}

// Primary export — used in every view
export function useCrudPermissions(module: string, subModule?: string): CrudPermissions {
  const basePath = subModule ? `menus.${module}.${subModule}` : `menus.${module}`

  const { hasPermission: canCreate } = usePermissions(`${basePath}.create`)
  const { hasPermission: canRead }   = usePermissions(`${basePath}.read`)
  const { hasPermission: canUpdate } = usePermissions(`${basePath}.update`)
  const { hasPermission: canDelete } = usePermissions(`${basePath}.delete`)
  const { hasAnyPermission: canAccess } = usePermissions([
    `${basePath}.create`,
    `${basePath}.read`,
    `${basePath}.update`,
    `${basePath}.delete`,
  ])

  return { canCreate, canRead, canUpdate, canDelete, canAccess }
}

// Convenience helpers per garage module
export const useJobPermissions        = () => useCrudPermissions('workshop', 'jobs')
export const useSchedulePermissions   = () => useCrudPermissions('workshop', 'schedule')
export const useCustomerPermissions   = () => useCrudPermissions('crm', 'customers')
export const useVehiclePermissions    = () => useCrudPermissions('crm', 'vehicles')
export const useTechnicianPermissions = () => useCrudPermissions('team', 'technicians')
export const useInventoryPermissions  = () => useCrudPermissions('stock', 'inventory')
export const useInvoicePermissions    = () => useCrudPermissions('finance', 'invoices')
export const useUserPermissions       = () => useCrudPermissions('administration', 'users')
export const useSystemRolePermissions = () => useCrudPermissions('administration', 'systemRoles')

// v-permission directive — hides elements when user lacks permission
export const vPermission = {
  mounted(el: HTMLElement, binding: any) {
    const { value } = binding
    if (!value) return
    const authStore = useAuthStore()
    const hasAccess = Array.isArray(value) ? value.some((k: string) => authStore.can(k)) : authStore.can(value)
    if (!hasAccess) el.style.display = 'none'
  },
  updated(el: HTMLElement, binding: any) {
    const { value } = binding
    if (!value) return
    const authStore = useAuthStore()
    const hasAccess = Array.isArray(value) ? value.some((k: string) => authStore.can(k)) : authStore.can(value)
    el.style.display = hasAccess ? '' : 'none'
  },
}
