import api from '@/api/client'
import { SupplierStatus, SupplierCategory } from '@/types/generated/enums/procurement'

/** Suppliers (Sprint 23) — mirrors the backend SupplierViewDto */

export interface SupplierAddress {
  street?: string
  city?: string
  postcode?: string
  country?: string
}

export interface Supplier {
  id: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: SupplierAddress | null
  accountRef: string | null
  paymentTermsDays: number | null
  taxId: string | null
  /** only on the single-supplier response, for users who can edit suppliers */
  bankDetails?: string | null
  hasBankDetails: boolean
  categories: SupplierCategory[]
  preferred: boolean
  rating: number | null
  status: SupplierStatus
  notes: string | null
  orderCount?: number
  createdAt: string
}

export interface SupplierBasic {
  id: string
  name: string
  paymentTermsDays: number | null
  preferred: boolean
}

export interface SupplierInput {
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: SupplierAddress
  accountRef?: string
  paymentTermsDays?: number
  taxId?: string
  bankDetails?: string
  categories?: SupplierCategory[]
  preferred?: boolean
  status?: SupplierStatus
  notes?: string
}

const unwrap = (response: any) => response.data?.data ?? response.data

export async function getSuppliers(params?: {
  search?: string
  status?: SupplierStatus
  category?: SupplierCategory
  page?: number
  pageSize?: number
}): Promise<{ items: Supplier[]; total: number }> {
  const data = unwrap(await api.get('/procurement/suppliers', { params }))
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function getSuppliersBasic(): Promise<SupplierBasic[]> {
  return unwrap(await api.get('/procurement/suppliers/basic'))
}

export async function getSupplier(id: string): Promise<Supplier> {
  return unwrap(await api.get(`/procurement/suppliers/${id}`))
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  return unwrap(await api.post('/procurement/suppliers', input))
}

export async function updateSupplier(id: string, input: Partial<SupplierInput>): Promise<Supplier> {
  return unwrap(await api.patch(`/procurement/suppliers/${id}`, input))
}

export async function deleteSupplier(id: string): Promise<void> {
  await api.delete(`/procurement/suppliers/${id}`)
}

/** Orders and invoices of `id` move to `targetId`; `id` is removed */
export async function mergeSupplier(id: string, targetId: string): Promise<Supplier> {
  return unwrap(await api.post(`/procurement/suppliers/${id}/merge`, { targetId }))
}
