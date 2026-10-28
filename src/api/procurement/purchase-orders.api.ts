import api from '@/api/client'
import {
  PurchaseOrderKind, PurchaseOrderStatus, PurchaseOrderItemStatus, GoodsReceiptCondition,
} from '@/types/generated/enums/procurement'

/** Purchase orders + receiving (Sprint 23) — mirrors PurchaseOrderViewDto / GoodsReceiptViewDto */

/** Purchasing feature switches (Settings → Purchasing); the API always returns them fully resolved */
export interface ProcurementSettings {
  enabled: boolean
  approvalsEnabled: boolean
  poApprovalThreshold: number
  goodsReceiptsEnabled: boolean
  billsEnabled: boolean
  billPaymentsEnabled: boolean
  billVarianceTolerance: number
  billVariancePercent: number
  aiInvoiceCapture: boolean
  lowStockSuggestions: boolean
  fieldReceiptCapture: boolean
}

export interface PurchaseOrderItem {
  id: string
  description: string
  partNumber: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  taxRate: number
  receivedQuantity: number
  status: PurchaseOrderItemStatus
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  kind: PurchaseOrderKind
  status: PurchaseOrderStatus
  supplierId: string
  supplierName?: string
  supplierEmail?: string | null
  orderDate: string | null
  expectedDeliveryDate: string | null
  deliverTo: string | null
  jobId: string | null
  jobNumber?: string | null
  totalAmount: number
  taxAmount: number
  shippingCost: number
  grossTotal: number
  paymentTerms: string | null
  notes: string | null
  requestedById: string | null
  approvedById: string | null
  approvedAt: string | null
  rejectionReason: string | null
  sentAt: string | null
  items: PurchaseOrderItem[]
  createdAt: string
}

/** A row of the one list: purchase orders AND job parts orders */
export interface CombinedOrderRow {
  id: string
  type: 'purchase' | 'parts'
  number: string
  kind: string
  status: string
  supplierId: string | null
  supplierName: string | null
  grossTotal: number
  expectedDate: string | null
  jobId: string | null
  jobNumber: string | null
  createdAt: string
}

export interface PurchaseOrderItemInput {
  description: string
  partNumber?: string
  quantity: number
  unitPrice: number
  taxRate?: number
}

export interface PurchaseOrderInput {
  supplierId: string
  kind?: PurchaseOrderKind
  expectedDeliveryDate?: string
  deliverTo?: string
  jobId?: string
  shippingCost?: number
  paymentTerms?: string
  notes?: string
  items: PurchaseOrderItemInput[]
}

export interface GoodsReceiptItem {
  id: string
  purchaseOrderItemId: string
  itemDescription: string | null
  quantityReceived: number
  quantityAccepted: number
  quantityRejected: number
  condition: GoodsReceiptCondition
  remarks: string | null
}

export interface GoodsReceipt {
  id: string
  grnNumber: string
  purchaseOrderId: string
  receivedByName?: string
  receivedDate: string
  deliveryNoteRef: string | null
  notes: string | null
  items: GoodsReceiptItem[]
}

export interface GoodsReceiptInput {
  purchaseOrderId: string
  receivedDate?: string
  deliveryNoteRef?: string
  notes?: string
  items: {
    purchaseOrderItemId: string
    quantityReceived: number
    quantityRejected?: number
    condition?: GoodsReceiptCondition
    remarks?: string
  }[]
}

const unwrap = (response: any) => response.data?.data ?? response.data

export async function getProcurementSettings(): Promise<ProcurementSettings> {
  return unwrap(await api.get('/procurement/settings'))
}

export async function getCombinedOrders(params?: {
  search?: string
  status?: string
  kind?: string
  supplierId?: string
  page?: number
  pageSize?: number
}): Promise<{ items: CombinedOrderRow[]; total: number }> {
  const data = unwrap(await api.get('/procurement/orders/combined', { params }))
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function getPurchaseOrders(params?: {
  search?: string
  status?: PurchaseOrderStatus
  supplierId?: string
  page?: number
  pageSize?: number
}): Promise<{ items: PurchaseOrder[]; total: number }> {
  const data = unwrap(await api.get('/procurement/orders', { params }))
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function getPendingApprovals(): Promise<PurchaseOrder[]> {
  return unwrap(await api.get('/procurement/approvals/pending')).items ?? []
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return unwrap(await api.get(`/procurement/orders/${id}`))
}

export async function createPurchaseOrder(input: PurchaseOrderInput): Promise<PurchaseOrder> {
  return unwrap(await api.post('/procurement/orders', input))
}

export async function updatePurchaseOrder(id: string, input: Partial<PurchaseOrderInput>): Promise<PurchaseOrder> {
  return unwrap(await api.patch(`/procurement/orders/${id}`, input))
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  await api.delete(`/procurement/orders/${id}`)
}

export type OrderAction = 'submit' | 'send' | 'cancel' | 'close'
export async function orderAction(id: string, action: OrderAction): Promise<PurchaseOrder & { emailed?: boolean }> {
  return unwrap(await api.post(`/procurement/orders/${id}/${action}`))
}

export async function approvePurchaseOrder(id: string, comments?: string): Promise<PurchaseOrder> {
  return unwrap(await api.post(`/procurement/orders/${id}/approve`, { comments }))
}

export async function rejectPurchaseOrder(id: string, comments: string): Promise<PurchaseOrder> {
  return unwrap(await api.post(`/procurement/orders/${id}/reject`, { comments }))
}

export async function resendPurchaseOrder(id: string): Promise<{ sent: boolean; email: string }> {
  return unwrap(await api.post(`/procurement/orders/${id}/resend`))
}

/** Quick receive — only when booking-in records are switched off */
export async function receivePurchaseOrder(id: string, items: { purchaseOrderItemId: string; quantityReceived: number }[]): Promise<PurchaseOrder> {
  return unwrap(await api.post(`/procurement/orders/${id}/receive`, { items }))
}

export async function createGoodsReceipt(input: GoodsReceiptInput): Promise<GoodsReceipt> {
  return unwrap(await api.post('/procurement/goods-receipts', input))
}

export async function getGoodsReceiptsForOrder(orderId: string): Promise<GoodsReceipt[]> {
  return unwrap(await api.get(`/procurement/orders/${orderId}/goods-receipts`)).items ?? []
}

export async function downloadPurchaseOrderPdf(order: { id: string; poNumber: string }): Promise<void> {
  const response = await api.get(`/procurement/orders/${order.id}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `${order.poNumber}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
