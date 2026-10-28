import apiClient from '@/api/client'

export interface SystemRole {
  id: string
  name: string
  description?: string
  status: 'active' | 'inactive'
  settings?: Record<string, any>
  /** Recipient tags — internal alerts (panic, parts, field) are dispatched to roles carrying the matching tag */
  notificationTags?: string[]
  companyId: string
  createdAt: string
  updatedAt: string
}

export interface CreateRoleDto {
  name: string
  description?: string
  settings?: Record<string, any>
  notificationTags?: string[]
}

export interface UpdateRoleDto {
  name?: string
  description?: string
  status?: 'active' | 'inactive'
  settings?: Record<string, any>
  notificationTags?: string[]
}

export async function getRoles(): Promise<SystemRole[]> {
  const response = await apiClient.get('/master/system-role')
  return response.data?.data ?? response.data
}

export async function getRole(id: string): Promise<SystemRole> {
  const response = await apiClient.get(`/master/system-role/${id}`)
  return response.data?.data ?? response.data
}

export async function getPermissionTree(): Promise<Record<string, any>> {
  const response = await apiClient.get('/master/system-role/permission-tree/default')
  return response.data?.data ?? response.data
}

export async function createRole(dto: CreateRoleDto): Promise<SystemRole> {
  const response = await apiClient.post('/master/system-role', dto)
  return response.data?.data ?? response.data
}

export async function updateRole(id: string, dto: UpdateRoleDto): Promise<SystemRole> {
  const response = await apiClient.patch(`/master/system-role/${id}`, dto)
  return response.data?.data ?? response.data
}

export async function updateRolePermissions(
  id: string,
  permissions: Record<string, any>
): Promise<SystemRole> {
  const response = await apiClient.patch(`/master/system-role/${id}/permissions`, { permissions })
  return response.data?.data ?? response.data
}

export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/master/system-role/${id}`)
}

export async function cloneRole(id: string, name: string): Promise<SystemRole> {
  const response = await apiClient.post(`/master/system-role/${id}/clone`, { name })
  return response.data?.data ?? response.data
}
