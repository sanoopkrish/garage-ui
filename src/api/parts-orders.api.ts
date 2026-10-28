import api from '@/api/client'
import { PartsOrderStatus } from '@/types/generated/enums/job'

export interface PartsOrderLine {
  id: string
  description: string
  partNumber: string | null
  quantity: number
  unitCost: number | null
  barcode: string | null
  shelfLocation: string | null
  receivedQuantity: number
  receivedAt: string | null
  quoteLineId: string | null
}

export interface PartsOrder {
  id: string
  orderNumber: string
  supplierName: string
  supplierRef: string | null
  status: PartsOrderStatus
  orderedAt: string | null
  expectedDate: string | null
  delayNotes: string | null
  rmaReference: string | null
  returnReason: string | null
  supplierInvoiceRef: string | null
  supplierInvoiceAmount: number | null
  notes: string | null
  jobId: string | null
  jobNumber: string | null
  vehicleRegistration: string | null
  lines: PartsOrderLine[]
  allowedTransitions: PartsOrderStatus[]
  totalCost: number
  createdAt: string
}

const unwrap = (r: any) => r.data?.data ?? r.data

export async function getPartsOrders(params?: {
  status?: PartsOrderStatus
  supplier?: string
  jobId?: string
  search?: string
  page?: number
  pageSize?: number
}): Promise<{ items: PartsOrder[]; total: number }> {
  const data = unwrap(await api.get('/parts-orders', { params }))
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function getPartsOrder(id: string): Promise<PartsOrder> {
  return unwrap(await api.get(`/parts-orders/${id}`))
}

export async function createFromQuote(quoteId: string, supplierName: string): Promise<PartsOrder> {
  return unwrap(await api.post(`/parts-orders/from-quote/${quoteId}`, { supplierName }))
}

export async function createManualOrder(dto: {
  supplierName: string
  jobId?: string
  expectedDate?: string
  lines: { description: string; partNumber?: string; quantity: number; unitCost?: number; barcode?: string }[]
}): Promise<PartsOrder> {
  return unwrap(await api.post('/parts-orders', dto))
}

export async function updatePartsOrder(id: string, dto: {
  supplierName?: string
  supplierRef?: string
  expectedDate?: string
  rmaReference?: string
  returnReason?: string
  supplierInvoiceRef?: string
  supplierInvoiceAmount?: number
  notes?: string
}): Promise<PartsOrder> {
  return unwrap(await api.patch(`/parts-orders/${id}`, dto))
}

export async function updatePartsOrderStatus(id: string, status: PartsOrderStatus, note?: string): Promise<PartsOrder> {
  return unwrap(await api.patch(`/parts-orders/${id}/status`, { status, note }))
}

export async function updateOrderLine(orderId: string, lineId: string, dto: {
  barcode?: string
  shelfLocation?: string
  partNumber?: string
  receivedQuantity?: number
}): Promise<PartsOrder> {
  return unwrap(await api.patch(`/parts-orders/${orderId}/lines/${lineId}`, dto))
}

export async function receiveScan(barcode: string): Promise<{
  order: PartsOrder
  matchedLine: { id: string; description: string; receivedQuantity: number; quantity: number; shelfLocation: string | null }
  orderComplete: boolean
}> {
  return unwrap(await api.post('/parts-orders/receive-scan', { barcode }))
}

export async function deletePartsOrder(id: string): Promise<void> {
  await api.delete(`/parts-orders/${id}`)
}
