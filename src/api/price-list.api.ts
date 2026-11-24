import api from '@/api/client'
import { InvoiceLineType } from '@/types/generated/enums/invoice'

/** Price list (Sprint 32) — mirrors the backend PriceListItemViewDto and picker rows */

export interface PriceListItem {
  id: string
  name: string
  category: string | null
  lineType: InvoiceLineType
  /** net price; null = entered on the job */
  defaultPrice: number | null
  isActive: boolean
  sortOrder: number
  customerPriceCount: number
  createdAt: string
  updatedAt: string
}

export type PriceSource = 'customer' | 'standard' | 'none'

/** One row of the picker — the price is the one that applies to the chosen customer */
export interface PriceListPickRow {
  id: string
  name: string
  category: string | null
  lineType: InvoiceLineType
  price: number | null
  priceSource: PriceSource
}

export interface PriceListItemInput {
  name: string
  category?: string | null
  lineType?: InvoiceLineType
  defaultPrice?: number | null
  isActive?: boolean
}

export interface ItemCustomerPrice { customerId: string; customerName: string; price: number }
export interface CustomerItemPrice { priceListItemId: string; name: string; category: string | null; defaultPrice: number | null; price: number | null }

export interface PriceListImportResult {
  total: number
  created: number
  updated: number
  errors: { line: number; name: string; errors: string[] }[]
  dryRun: boolean
}

const unwrap = (response: any) => response.data?.data ?? response.data

export async function getPriceList(params?: { search?: string; category?: string; active?: boolean; page?: number; pageSize?: number }): Promise<{ items: PriceListItem[]; total: number }> {
  const data = unwrap(await api.get('/price-list', { params }))
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function pickPriceList(customerId?: string): Promise<PriceListPickRow[]> {
  return unwrap(await api.get('/price-list/pick', { params: customerId ? { customerId } : undefined })) ?? []
}

export async function getPriceListCategories(): Promise<string[]> {
  return unwrap(await api.get('/price-list/categories')) ?? []
}

export async function createPriceListItem(dto: PriceListItemInput): Promise<PriceListItem> {
  return unwrap(await api.post('/price-list', dto))
}

export async function updatePriceListItem(id: string, dto: Partial<PriceListItemInput>): Promise<PriceListItem> {
  return unwrap(await api.patch(`/price-list/${id}`, dto))
}

export async function deletePriceListItem(id: string): Promise<void> {
  await api.delete(`/price-list/${id}`)
}

export async function getItemCustomerPrices(id: string): Promise<ItemCustomerPrice[]> {
  return unwrap(await api.get(`/price-list/${id}/customer-prices`)) ?? []
}

export async function setItemCustomerPrices(id: string, prices: { customerId: string; price: number }[]): Promise<ItemCustomerPrice[]> {
  return unwrap(await api.put(`/price-list/${id}/customer-prices`, { prices })) ?? []
}

export async function getCustomerPrices(customerId: string): Promise<CustomerItemPrice[]> {
  return unwrap(await api.get(`/price-list/customers/${customerId}`)) ?? []
}

export async function setCustomerPrices(customerId: string, prices: { priceListItemId: string; price: number }[]): Promise<CustomerItemPrice[]> {
  return unwrap(await api.put(`/price-list/customers/${customerId}`, { prices })) ?? []
}

export async function importPriceList(csv: string, dryRun: boolean): Promise<PriceListImportResult> {
  return unwrap(await api.post('/price-list/import', { csv, dryRun }))
}
