import api from '@/api/client'
import { QuoteStatus, QuoteLineType, QuoteLineStatus } from '@/types/generated/enums/quote'

export interface QuoteLine {
  id: string
  lineType: QuoteLineType
  description: string
  hours?: number | null
  rate?: number | null
  quantity: number
  costPrice?: number | null
  markupPercent?: number | null
  sellPrice?: number | null
  lineTotal: number
  lineStatus: QuoteLineStatus
}

export interface Quote {
  id: string
  quoteNumber: string
  status: QuoteStatus
  jobId: string
  vatRatePercent: number
  sentAt?: string
  respondedAt?: string
  notes?: string
  lines: QuoteLine[]
  netTotal: number
  vatAmount: number
  grossTotal: number
  approvedNetTotal: number
  createdAt: string
}

export interface QuoteLineInput {
  lineType: QuoteLineType
  description: string
  hours?: number
  rate?: number
  quantity?: number
  costPrice?: number
  markupPercent?: number
  sellPrice?: number
}

export async function getQuotesForJob(jobId: string): Promise<Quote[]> {
  const response = await api.get('/quotes', { params: { jobId } })
  const data = response.data?.data ?? response.data
  return data.items ?? []
}

export async function createQuote(jobId: string, lines: QuoteLineInput[], notes?: string): Promise<Quote> {
  const response = await api.post('/quotes', { jobId, lines, notes })
  return response.data?.data ?? response.data
}

export async function sendQuote(id: string): Promise<Quote> {
  const response = await api.post(`/quotes/${id}/send`)
  return response.data?.data ?? response.data
}

export async function respondQuote(
  id: string,
  lines: { lineId: string; status: QuoteLineStatus }[],
  note?: string,
): Promise<Quote> {
  const response = await api.post(`/quotes/${id}/respond`, { lines, note })
  return response.data?.data ?? response.data
}

export async function deleteQuote(id: string): Promise<void> {
  await api.delete(`/quotes/${id}`)
}

export async function downloadQuotePdf(id: string, quoteNumber: string): Promise<void> {
  const response = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `${quoteNumber}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
