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
  /** Sprint 26 — quote before work? null = inherit the company default */
  quoteRequired?: boolean | null
  /** B2B only — fixed trade credit raised per invoice (null = none) */
  tradeCreditAmount?: number | null
  tradeCreditVatInclusive?: boolean
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
  quoteRequired?: boolean | null
  tradeCreditAmount?: number | null
  tradeCreditVatInclusive?: boolean
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

export async function gdprExportCustomer(id: string, displayName: string): Promise<void> {
  const response = await api.get(`/customers/${id}/gdpr-export`)
  const data = response.data?.data ?? response.data
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gdpr-export-${displayName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function gdprEraseCustomer(id: string): Promise<{ erased: boolean; filesDeleted: number; note: string }> {
  const response = await api.post(`/customers/${id}/gdpr-erase`)
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
