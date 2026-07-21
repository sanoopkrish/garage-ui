import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { SystemRole, CreateRoleDto, UpdateRoleDto } from '@/api/roles.api'
import {
  getRoles,
  createRole as apiCreateRole,
  updateRole as apiUpdateRole,
  updateRolePermissions as apiUpdateRolePermissions,
  deleteRole as apiDeleteRole,
  cloneRole as apiCloneRole,
  getPermissionTree,
} from '@/api/roles.api'

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<SystemRole[]>([])
  const permissionTree = ref<Record<string, any> | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function fetchRoles(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      roles.value = await getRoles()
    } catch (err: any) {
      error.value = err?.message ?? 'Failed to fetch roles'
    } finally {
      loading.value = false
    }
  }

  async function fetchPermissionTree(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      permissionTree.value = await getPermissionTree()
    } catch (err: any) {
      error.value = err?.message ?? 'Failed to fetch permission tree'
    } finally {
      loading.value = false
    }
  }

  async function createRole(dto: CreateRoleDto): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await apiCreateRole(dto)
      await fetchRoles()
    } catch (err: any) {
      error.value = err?.message ?? 'Failed to create role'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateRole(id: string, dto: UpdateRoleDto): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const updated = await apiUpdateRole(id, dto)
      const index = roles.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        roles.value[index] = updated
      }
    } catch (err: any) {
      error.value = err?.message ?? 'Failed to update role'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateRolePermissions(
    id: string,
    permissions: Record<string, any>,
  ): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const updated = await apiUpdateRolePermissions(id, permissions)
      const index = roles.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        roles.value[index] = updated
      }
    } catch (err: any) {
      error.value = err?.message ?? 'Failed to update role permissions'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteRole(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await apiDeleteRole(id)
      roles.value = roles.value.filter((r) => r.id !== id)
    } catch (err: any) {
      error.value = err?.message ?? 'Failed to delete role'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function cloneRole(id: string, name: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await apiCloneRole(id, name)
      await fetchRoles()
    } catch (err: any) {
      error.value = err?.message ?? 'Failed to clone role'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    roles,
    permissionTree,
    loading,
    error,
    fetchRoles,
    fetchPermissionTree,
    createRole,
    updateRole,
    updateRolePermissions,
    deleteRole,
    cloneRole,
  }
})
