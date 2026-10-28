import api from '@/api/client'
import { CreditNoteStatus, CreditNoteReason, CreditNoteLineType } from '@/types/generated/enums/credit-note'

/** Credit notes (Sprint 20) — mirrors the backend CreditNoteResponseDto */

export interface CreditNoteLine {
  id: string
  lineType: CreditNoteLineType
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
  invoiceLineId?: string | null
}

export interface CreditAllocation {
  id: string
  invoiceId: string
  invoiceNumber: string | null
  amount: number
  allocatedAt: string
  accountingSyncStatus: string | null
}

export interface CreditNote {
  id: string
  creditNoteNumber: string
  status: CreditNoteStatus
  reason: CreditNoteReason
  customerId: string
  customerName?: string
  invoiceId: string | null
  invoiceNumber: string | null
  jobId: string | null
  jobNumber: string | null
  vatRatePercent: number
  issuedAt: string | null
  notes: string | null
  isTradeCredit: boolean
  accountingSyncStatus: string | null
  accountingExternalId: string | null
  accountingSyncError: string | null
  lines: CreditNoteLine[]
  allocations: CreditAllocation[]
  netTotal: number
  vatAmount: number
  grossTotal: number
  allocated: number
  unallocated: number
  createdAt: string
}

export interface CreditNoteLineInput {
  lineType: CreditNoteLineType
  description: string
  quantity: number
  unitPrice: number
  invoiceLineId?: string
}

export interface CreateCreditNoteInput {
  customerId: string
  reason: CreditNoteReason
  invoiceId?: string
  vatRatePercent?: number
  lines: CreditNoteLineInput[]
  notes?: string
}

export type UpdateCreditNoteInput = Partial<Omit<CreateCreditNoteInput, 'customerId'>>

const unwrap = (r: any) => r.data?.data ?? r.data

export async function getCreditNotes(params?: {
  search?: string
  status?: CreditNoteStatus
  customerId?: string
  invoiceId?: string
  page?: number
  pageSize?: number
}): Promise<{ items: CreditNote[]; total: number }> {
  const data = unwrap(await api.get('/credit-notes', { params }))
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function getCreditNote(id: string): Promise<CreditNote> {
  return unwrap(await api.get(`/credit-notes/${id}`))
}

export async function getCreditNotesForJob(jobId: string): Promise<CreditNote[]> {
  return unwrap(await api.get(`/credit-notes/job/${jobId}`)).items ?? []
}

export async function getCreditNotesForCustomer(customerId: string): Promise<CreditNote[]> {
  return unwrap(await api.get(`/credit-notes/customer/${customerId}`)).items ?? []
}

export async function createCreditNote(payload: CreateCreditNoteInput): Promise<CreditNote> {
  return unwrap(await api.post('/credit-notes', payload))
}

export async function updateCreditNote(id: string, payload: UpdateCreditNoteInput): Promise<CreditNote> {
  return unwrap(await api.patch(`/credit-notes/${id}`, payload))
}

export async function issueCreditNote(id: string, autoAllocate = true): Promise<CreditNote> {
  return unwrap(await api.post(`/credit-notes/${id}/issue`, { autoAllocate }))
}

export async function allocateCreditNote(id: string, invoiceId: string, amount?: number): Promise<CreditNote> {
  return unwrap(await api.post(`/credit-notes/${id}/allocations`, { invoiceId, amount }))
}

export async function unallocateCreditNote(id: string, invoiceId: string): Promise<CreditNote> {
  return unwrap(await api.delete(`/credit-notes/${id}/allocations/${invoiceId}`))
}

export async function sendCreditNote(id: string): Promise<{ sent: boolean; email: string }> {
  return unwrap(await api.post(`/credit-notes/${id}/send`))
}

export async function voidCreditNote(id: string): Promise<CreditNote> {
  return unwrap(await api.post(`/credit-notes/${id}/void`))
}

export async function syncCreditNote(id: string): Promise<CreditNote> {
  return unwrap(await api.post(`/credit-notes/${id}/sync`))
}

export async function downloadCreditNotePdf(id: string, creditNoteNumber: string): Promise<void> {
  const response = await api.get(`/credit-notes/${id}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `${creditNoteNumber}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
