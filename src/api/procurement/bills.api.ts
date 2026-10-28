import api from '@/api/client'
import {
  SupplierInvoiceStatus, SupplierInvoiceMatchStatus, SupplierInvoiceCaptureSource,
} from '@/types/generated/enums/procurement'
import type { PaymentMethod } from '@/types/generated/enums/invoice'

/** Supplier invoices ("bills", Sprint 23) — mirrors the backend SupplierInvoiceViewDto */

export interface BillAllocation {
  id: string
  amount: number
  purchaseOrderId: string | null
  partsOrderId: string | null
  orderNumber: string | null
  orderType: 'purchase' | 'parts'
}

export interface BillPayment {
  id: string
  paidAt: string
  method: PaymentMethod
  amount: number
  reference: string | null
}

export interface BillDocument {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  s3Key: string
  uploadedAt: string
}

export interface SupplierBill {
  id: string
  supplierId: string
  supplierName?: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string | null
  subtotal: number
  taxAmount: number
  total: number
  amountPaid: number
  balance: number
  status: SupplierInvoiceStatus
  matchStatus: SupplierInvoiceMatchStatus
  varianceAmount: number
  expectedAmount: number
  disputeNote: string | null
  approvalNote: string | null
  approvedAt: string | null
  captureSource: SupplierInvoiceCaptureSource
  notes: string | null
  accountingSyncStatus: string | null
  accountingSyncError: string | null
  isOverdue: boolean
  allocations: BillAllocation[]
  payments: BillPayment[]
  documents: BillDocument[]
  createdAt: string
}

export interface BillAllocationInput {
  purchaseOrderId?: string
  partsOrderId?: string
  amount: number
}

export interface BillInput {
  supplierId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  subtotal: number
  taxAmount: number
  notes?: string
  /** temp upload key of the supplier's PDF / photo */
  s3Key?: string
  allocations?: BillAllocationInput[]
}

const unwrap = (response: any) => response.data?.data ?? response.data

export async function getBills(params?: {
  search?: string
  status?: SupplierInvoiceStatus
  matchStatus?: SupplierInvoiceMatchStatus
  supplierId?: string
  purchaseOrderId?: string
  partsOrderId?: string
  page?: number
  pageSize?: number
}): Promise<{ items: SupplierBill[]; total: number }> {
  const data = unwrap(await api.get('/procurement/bills', { params }))
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function getBillsDueThisWeek(): Promise<{ items: SupplierBill[]; total: number; totalDue: number }> {
  return unwrap(await api.get('/procurement/bills/due-this-week'))
}

export async function getBill(id: string): Promise<SupplierBill> {
  return unwrap(await api.get(`/procurement/bills/${id}`))
}

export async function createBill(input: BillInput): Promise<SupplierBill> {
  return unwrap(await api.post('/procurement/bills', input))
}

export async function updateBill(id: string, input: Partial<Omit<BillInput, 's3Key'>> & { total?: number }): Promise<SupplierBill> {
  return unwrap(await api.patch(`/procurement/bills/${id}`, input))
}

export async function attachBillDocument(id: string, s3Key: string): Promise<SupplierBill> {
  return unwrap(await api.post(`/procurement/bills/${id}/attachment`, { s3Key }))
}

/** What the AI read from an uploaded invoice — a draft to check, never saved by itself */
export interface CaptureDraft {
  supplierName: string | null
  supplierId: string | null
  matchedSupplierName: string | null
  invoiceNumber: string | null
  invoiceDate: string | null
  dueDate: string | null
  subtotal: number | null
  taxAmount: number | null
  total: number | null
  orderNumbers: string[]
  warnings: string[]
}

export async function captureBill(s3Key: string): Promise<CaptureDraft> {
  return unwrap(await api.post('/procurement/bills/capture', { s3Key }))
}

export type BillAction = 'match' | 'resolve-dispute' | 'void' | 'sync'
export async function billAction(id: string, action: BillAction): Promise<SupplierBill> {
  return unwrap(await api.post(`/procurement/bills/${id}/${action}`))
}

export async function approveBill(id: string, note?: string): Promise<SupplierBill> {
  return unwrap(await api.post(`/procurement/bills/${id}/approve`, { note }))
}

export async function disputeBill(id: string, note: string): Promise<SupplierBill> {
  return unwrap(await api.post(`/procurement/bills/${id}/dispute`, { note }))
}

export async function recordBillPayment(id: string, input: { method: PaymentMethod; amount: number; paidAt?: string; reference?: string }): Promise<SupplierBill> {
  return unwrap(await api.post(`/procurement/bills/${id}/payments`, input))
}
