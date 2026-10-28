import api from '@/api/client'
import type { PurchaseOrder } from '@/api/procurement/purchase-orders.api'

/** Shelf stock + re-order suggestions (Sprint 23, stock levels switch) */

export interface StockItem {
  id: string
  name: string
  partNumber: string | null
  supplierId: string | null
  supplierName: string | null
  quantityOnHand: number
  minStockQty: number
  reorderQty: number
  unitPrice: number
  location: string | null
  isLow: boolean
}

export interface StockItemInput {
  name: string
  partNumber?: string
  supplierId?: string
  quantityOnHand?: number
  minStockQty?: number
  reorderQty?: number
  unitPrice?: number
  location?: string
}

export interface StockSuggestion {
  supplierId: string | null
  supplierName: string | null
  estimatedNet: number
  items: { id: string; name: string; partNumber: string | null; quantityOnHand: number; minStockQty: number; reorderQty: number; unitPrice: number }[]
}

const unwrap = (response: any) => response.data?.data ?? response.data

export async function getStockItems(params?: { search?: string; lowOnly?: boolean; supplierId?: string; page?: number; pageSize?: number }): Promise<{ items: StockItem[]; total: number }> {
  const data = unwrap(await api.get('/procurement/stock', { params }))
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function getStockSuggestions(): Promise<StockSuggestion[]> {
  return unwrap(await api.get('/procurement/stock/suggestions'))
}

export async function createStockItem(input: StockItemInput): Promise<StockItem> {
  return unwrap(await api.post('/procurement/stock', input))
}

export async function updateStockItem(id: string, input: Partial<StockItemInput>): Promise<StockItem> {
  return unwrap(await api.patch(`/procurement/stock/${id}`, input))
}

export async function deleteStockItem(id: string): Promise<void> {
  await api.delete(`/procurement/stock/${id}`)
}

/** negative = used, positive = found / returned */
export async function adjustStock(id: string, delta: number, reason?: string): Promise<StockItem> {
  return unwrap(await api.post(`/procurement/stock/${id}/adjust`, { delta, reason }))
}

/** Raises a DRAFT purchase order for everything low from the supplier */
export async function orderSuggestion(supplierId: string): Promise<PurchaseOrder> {
  return unwrap(await api.post(`/procurement/stock/suggestions/${supplierId}/order`))
}
