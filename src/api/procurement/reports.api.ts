import api from '@/api/client'

/** Purchasing reports + dashboard tiles (Sprint 23) */

export interface ReportResult<T> { from: string; to: string; items: T[] }
export interface SpendBySupplierRow { supplierId: string | null; supplierName: string; orders: number; net: number; share: number }
export interface SpendByCategoryRow { kind: string; orders: number; net: number; share: number }
export interface MonthlyTrendRow { month: string; orders: number; net: number }
export interface SupplierPerformanceRow { supplierId: string; supplierName: string; orders: number; delivered: number; onTimePercent: number | null; rejectedPercent: number | null }
export interface JobCostRow { jobId: string; jobNumber: string; cost: number; sold: number; margin: number; marginPercent: number | null }

export interface ProcurementDashboard {
  enabled: boolean
  approvalsEnabled?: boolean
  ordersAwaitingApproval?: number
  ordersAwaitingValue?: number
  ordersOnOrder?: number
  ordersLate?: number
  billsEnabled?: boolean
  billsToApprove?: number | null
  billsWithVariance?: number | null
  billsDueThisWeek?: number | null
  billsDueTotal?: number | null
  lowStock?: number | null
}

export type ReportName = 'spend-by-supplier' | 'spend-by-category' | 'monthly-trend' | 'supplier-performance' | 'job-cost-recharge'

const unwrap = (response: any) => response.data?.data ?? response.data

export async function getReport<T>(name: ReportName, range?: { from?: string; to?: string }): Promise<ReportResult<T>> {
  return unwrap(await api.get(`/procurement/reports/${name}`, { params: range }))
}

export async function getProcurementDashboard(): Promise<ProcurementDashboard> {
  return unwrap(await api.get('/procurement/dashboard'))
}

/** Field app: "Bought something?" */
export async function isFieldReceiptEnabled(): Promise<boolean> {
  return !!unwrap(await api.get('/procurement/field-receipts/enabled')).enabled
}

export async function sendFieldReceipt(input: { s3Key: string; supplierName?: string; amount?: number; note?: string; jobId?: string }): Promise<{ id: string; reference: string }> {
  return unwrap(await api.post('/procurement/field-receipts', input))
}
