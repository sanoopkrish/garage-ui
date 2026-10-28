import api from '@/api/client'
import { InvoiceStatus, InvoicePaymentStatus, InvoiceLineType, PaymentMethod } from '@/types/generated/enums/invoice'
import { CreditNoteStatus, CreditNoteReason } from '@/types/generated/enums/credit-note'

/** A credit note raised against / allocated to an invoice (Sprint 20) */
export interface InvoiceCreditNoteSummary {
  id: string
  creditNoteNumber: string
  status: CreditNoteStatus
  reason: CreditNoteReason
  isTradeCredit: boolean
  gross: number
  /** amount of this credit allocated to THIS invoice */
  allocated: number
}

export interface InvoiceLine {
  id: string
  lineType: InvoiceLineType
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface InvoicePayment {
  id: string
  method: PaymentMethod
  amount: number
  reference?: string
  receivedAt: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  accountingSyncStatus?: string | null
  accountingExternalId?: string | null
  accountingSyncError?: string | null
  status: InvoiceStatus
  paymentStatus: InvoicePaymentStatus
  jobId: string
  jobNumber?: string
  customerId: string
  customerName?: string
  customerType?: string
  vatRatePercent: number
  issuedAt?: string
  dueDate?: string
  notes?: string
  lines: InvoiceLine[]
  payments: InvoicePayment[]
  netTotal: number
  vatAmount: number
  grossTotal: number
  amountPaid: number
  /** credit note allocations applied to this invoice */
  creditsAllocated: number
  /** gross − paid − creditsAllocated */
  balance: number
  tradeCreditEnabled: boolean
  tradeCreditAmount: number | null
  creditNotes: InvoiceCreditNoteSummary[]
  createdAt: string
}

export interface PaginatedInvoices {
  items: Invoice[]
  total: number
}

export async function getInvoices(params?: {
  search?: string
  paymentStatus?: InvoicePaymentStatus
  customerId?: string
  page?: number
  pageSize?: number
}): Promise<PaginatedInvoices> {
  const response = await api.get('/invoices', { params })
  const data = response.data?.data ?? response.data
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function getInvoice(id: string): Promise<Invoice> {
  const response = await api.get(`/invoices/${id}`)
  return response.data?.data ?? response.data
}

export async function getInvoicesForJob(jobId: string): Promise<Invoice[]> {
  const response = await api.get(`/invoices/job/${jobId}`)
  const data = response.data?.data ?? response.data
  return data.items ?? []
}

export async function generateInvoice(jobId: string, options?: { tradeCreditEnabled?: boolean }): Promise<Invoice> {
  const response = await api.post(`/invoices/generate/${jobId}`, options ?? {})
  return response.data?.data ?? response.data
}

export async function issueInvoice(id: string): Promise<Invoice> {
  const response = await api.post(`/invoices/${id}/issue`)
  return response.data?.data ?? response.data
}

export async function recordInvoicePayment(id: string, method: PaymentMethod, amount: number, reference?: string): Promise<Invoice> {
  const response = await api.post(`/invoices/${id}/payments`, { method, amount, reference })
  return response.data?.data ?? response.data
}

export async function voidInvoice(id: string): Promise<Invoice> {
  const response = await api.post(`/invoices/${id}/void`)
  return response.data?.data ?? response.data
}

export async function downloadInvoicePdf(id: string, invoiceNumber: string): Promise<void> {
  const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `${invoiceNumber}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// ---- Module 9 gap sprint: draft edits, statements, supplier invoices ----

export interface UpdateInvoiceLineInput {
  lineType: InvoiceLineType
  description: string
  quantity: number
  unitPrice: number
}

export async function updateInvoice(
  id: string,
  payload: {
    notes?: string
    vatRatePercent?: number
    lines?: UpdateInvoiceLineInput[]
    tradeCreditEnabled?: boolean
    tradeCreditAmount?: number | null
  },
): Promise<Invoice> {
  const response = await api.patch(`/invoices/${id}`, payload)
  return response.data?.data ?? response.data
}

export interface StatementSummaryRow {
  customerId: string
  customerName: string
  customerEmail: string | null
  invoiceCount: number
  outstanding: number
  overdue: number
  oldestDueDate: string | null
  creditsOnAccount: number
  netOutstanding: number
}

export interface StatementDetail {
  customerId: string
  customerName: string
  customerEmail: string | null
  rows: {
    invoiceId: string
    invoiceNumber: string
    jobNumber: string | null
    issuedAt: string
    dueDate: string | null
    gross: number
    paid: number
    credited: number
    balance: number
    overdueDays: number
  }[]
  credits: {
    creditNoteId: string
    creditNoteNumber: string
    issuedAt: string
    reason: string
    gross: number
    allocated: number
    remaining: number
  }[]
  creditsOnAccount: number
  netOutstanding: number
  outstanding: number
  ageing: { current: number; days1to30: number; days31to60: number; days60plus: number }
}

export async function getStatements(): Promise<StatementSummaryRow[]> {
  const response = await api.get('/invoices/statements')
  const data = response.data?.data ?? response.data
  return data.items ?? []
}

export async function getStatement(customerId: string): Promise<StatementDetail> {
  const response = await api.get(`/invoices/statements/${customerId}`)
  return response.data?.data ?? response.data
}

export async function downloadStatementPdf(customerId: string, customerName: string): Promise<void> {
  const response = await api.get(`/invoices/statements/${customerId}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `statement-${customerName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export async function sendStatement(customerId: string): Promise<{ sent: boolean; email: string }> {
  const response = await api.post(`/invoices/statements/${customerId}/send`)
  return response.data?.data ?? response.data
}

export interface SupplierInvoiceRow {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  s3Key: string
  uploadedAt: string
  jobId: string
  jobNumber: string
  customerName: string
  suppliers: string
  orderNumbers: string
}

export async function getSupplierInvoices(params?: { from?: string; to?: string }): Promise<SupplierInvoiceRow[]> {
  const response = await api.get('/invoices/supplier-invoices', { params })
  const data = response.data?.data ?? response.data
  return data.items ?? []
}
