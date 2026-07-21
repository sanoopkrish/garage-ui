import api from '@/api/client'
import { CustomerType } from '@/types/generated/enums/customer'

export interface BillingAddress {
  street?: string
  city?: string
  postcode?: string
  country?: string
}

export interface Customer {
  id: string
  type: CustomerType
  name: string
  businessName?: string
  email?: string
  phone?: string
  vatNumber?: string
  billingAddress?: BillingAddress
  labourRate?: number | null
  paymentTermsDays?: number
  poRequired: boolean
  notes?: string
  vehicleCount: number
  createdAt: string
}

export interface CreateCustomerDto {
  type: CustomerType
  name: string
  businessName?: string
  email?: string
  phone?: string
  vatNumber?: string
  billingAddress?: BillingAddress
  labourRate?: number
  paymentTermsDays?: number
  poRequired?: boolean
  notes?: string
}

export type UpdateCustomerDto = Partial<CreateCustomerDto>

export interface CustomerProfitability {
  customerId: string
  from: string | null
  to: string | null
  totalRevenue: number
  invoiceCount: number
  jobCount: number
  note?: string
}

export interface PaginatedCustomers {
  items: Customer[]
  total: number
}

export async function getCustomers(params?: {
  search?: string
  type?: CustomerType
  page?: number
  pageSize?: number
}): Promise<PaginatedCustomers> {
  const response = await api.get('/customers', { params })
  const data = response.data?.data ?? response.data
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function getCustomer(id: string): Promise<Customer> {
  const response = await api.get(`/customers/${id}`)
  return response.data?.data ?? response.data
}

export async function createCustomer(dto: CreateCustomerDto): Promise<Customer> {
  const response = await api.post('/customers', dto)
  return response.data?.data ?? response.data
}

export async function updateCustomer(id: string, dto: UpdateCustomerDto): Promise<Customer> {
  const response = await api.patch(`/customers/${id}`, dto)
  return response.data?.data ?? response.data
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customers/${id}`)
}

export async function getCustomerProfitability(
  id: string,
  params?: { from?: string; to?: string },
): Promise<CustomerProfitability> {
  const response = await api.get(`/customers/${id}/profitability`, { params })
  return response.data?.data ?? response.data
}
