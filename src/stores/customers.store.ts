import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  getCustomers,
  getCustomer as getCustomerApi,
  createCustomer as createCustomerApi,
  updateCustomer as updateCustomerApi,
  deleteCustomer as deleteCustomerApi,
} from '@/api/customers.api'
import type { Customer, CreateCustomerDto, UpdateCustomerDto } from '@/api/customers.api'
import type { CustomerType } from '@/types/generated/enums/customer'

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([])
  const total = ref<number>(0)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

  async function fetchCustomers(params?: {
    search?: string
    type?: CustomerType
    page?: number
    pageSize?: number
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await getCustomers({
        ...params,
        page: params?.page ?? currentPage.value,
        pageSize: params?.pageSize ?? pageSize.value,
      })
      customers.value = response.items
      total.value = response.total
      if (params?.page !== undefined) {
        currentPage.value = params.page
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch customers'
    } finally {
      loading.value = false
    }
  }

  async function getCustomer(id: string): Promise<Customer> {
    error.value = null
    try {
      return await getCustomerApi(id)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch customer'
      throw err
    }
  }

  async function createCustomer(dto: CreateCustomerDto): Promise<Customer> {
    loading.value = true
    error.value = null
    try {
      const created = await createCustomerApi(dto)
      await fetchCustomers({ page: currentPage.value, pageSize: pageSize.value })
      return created
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to create customer'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateCustomer(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    loading.value = true
    error.value = null
    try {
      const updated = await updateCustomerApi(id, dto)
      const index = customers.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        customers.value[index] = updated
      }
      return updated
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to update customer'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteCustomer(id: string) {
    loading.value = true
    error.value = null
    try {
      await deleteCustomerApi(id)
      customers.value = customers.value.filter((c) => c.id !== id)
      total.value = Math.max(0, total.value - 1)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to delete customer'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    customers,
    total,
    loading,
    error,
    currentPage,
    pageSize,
    totalPages,
    fetchCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  }
})
