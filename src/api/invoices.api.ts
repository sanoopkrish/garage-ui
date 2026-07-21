import api from '@/api/client'
import { InvoiceStatus, InvoicePaymentStatus, InvoiceLineType, PaymentMethod } from '@/types/generated/enums/invoice'

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
  balance: number
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

export async function generateInvoice(jobId: string): Promise<Invoice> {
  const response = await api.post(`/invoices/generate/${jobId}`)
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
