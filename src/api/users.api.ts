import api from '@/api/client'

export interface User {
  id: string
  email: string
  status: 'active' | 'inactive'
  createdAt: string
  lastLoginAt?: string | null
  profilePicUploaded?: boolean
  // Profile fields — flat (UserViewDto)
  firstName: string
  lastName: string
  middleName?: string
  phoneNumber?: string
  contractedWeeklyHours?: number
  gender?: string
  dateOfBirth?: string
  maritalStatus?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  department?: string
  departmentId?: number | null
  jobTitle?: string
  jobTitleId?: number | null
  employmentType?: string
  employmentTypeId?: number | null
  systemRoles?: { id: string; name: string }[]
  employeeRoles?: { id: number; name: string }[]
  skills?: { id: number; name: string }[]
}

export interface CreateUserDto {
  email: string
  password: string
  status: 'active' | 'inactive'
  firstName: string
  lastName: string
  phoneNumber?: string
  contractedWeeklyHours?: number
  systemRoleIds?: string[]
}

export interface UpdateUserDto {
  email?: string
  status?: 'active' | 'inactive'
  firstName?: string
  lastName?: string
  middleName?: string
  phoneNumber?: string
  gender?: string
  dateOfBirth?: string
  maritalStatus?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  systemRoleIds?: string[]
  departmentId?: number | null
  jobTitleId?: number | null
  employmentTypeId?: number | null
  employeeRoleIds?: number[]
  skillIds?: number[]
}

export interface PaginatedUsers {
  items: User[]
  total: number
}

export async function getUsers(params?: {
  search?: string
  status?: string
  /** System role name(s), comma-separated — e.g. 'Technician,Field Engineer' */
  role?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedUsers> {
  const response = await api.get('/user', { params })
  const data = response.data?.data ?? response.data
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function getUser(id: string): Promise<User> {
  const response = await api.get(`/user/${id}`)
  return response.data?.data ?? response.data
}

export async function createUser(dto: CreateUserDto): Promise<User> {
  const response = await api.post('/user', dto)
  return response.data?.data ?? response.data
}

export async function updateUser(id: string, dto: UpdateUserDto): Promise<User> {
  const response = await api.patch(`/user/${id}`, dto)
  return response.data?.data ?? response.data
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/user/${id}`)
}
