import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  getUsers,
  getUser as getUserApi,
  createUser as createUserApi,
  updateUser as updateUserApi,
  deleteUser as deleteUserApi,
} from '@/api/users.api'
import type { User, CreateUserDto, UpdateUserDto } from '@/api/users.api'

export const useUsersStore = defineStore('users', () => {
  const users = ref<User[]>([])
  const total = ref<number>(0)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

  async function fetchUsers(params?: {
    search?: string
    status?: string
    page?: number
    pageSize?: number
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await getUsers({
        ...params,
        page: params?.page ?? currentPage.value,
        pageSize: params?.pageSize ?? pageSize.value,
      })
      users.value = response.items
      total.value = response.total
      if (params?.page !== undefined) {
        currentPage.value = params.page
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch users'
    } finally {
      loading.value = false
    }
  }

  async function createUser(dto: CreateUserDto) {
    loading.value = true
    error.value = null
    try {
      await createUserApi(dto)
      await fetchUsers({ page: currentPage.value, pageSize: pageSize.value })
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to create user'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id: string, dto: UpdateUserDto) {
    loading.value = true
    error.value = null
    try {
      const updated = await updateUserApi(id, dto)
      const index = users.value.findIndex((u) => u.id === id)
      if (index !== -1) {
        users.value[index] = updated
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to update user'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getUser(id: string): Promise<User> {
    error.value = null
    try {
      return await getUserApi(id)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch user'
      throw err
    }
  }

  async function deleteUser(id: string) {
    loading.value = true
    error.value = null
    try {
      await deleteUserApi(id)
      users.value = users.value.filter((u) => u.id !== id)
      total.value = Math.max(0, total.value - 1)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to delete user'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    total,
    loading,
    error,
    currentPage,
    pageSize,
    totalPages,
    fetchUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
  }
})
