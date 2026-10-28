import api from '@/api/client'

/** Accounting (Xero) integration — ported from PSA; all provider calls backend-side */

export interface AccountingConnection {
  id: string
  provider: string
  status: string
  organisationName: string | null
  lastSyncAt: string | null
  lastError: string | null
  settings: {
    defaultRevenueAccountCode?: string
    defaultPaymentAccountCode?: string
    defaultTaxType?: string
    syncInvoices?: boolean
    syncPayments?: boolean
    syncCreditNotes?: boolean
    /** Sprint 23 — supplier invoices (bills); off unless switched on */
    syncBills?: boolean
    defaultExpenseAccountCode?: string
    autoSync?: boolean
  }
}

export interface SyncLogRow {
  id: string
  entityType: string
  entityId: string
  externalId: string | null
  direction: string
  status: string
  action: string
  errorMessage: string | null
  durationMs: number | null
  createdAt: string
}

const unwrap = (r: any) => r.data?.data ?? r.data

export async function getAccountingConnections(): Promise<AccountingConnection[]> {
  const data = unwrap(await api.get('/integrations/accounting/connections'))
  return data.items ?? []
}

export async function connectProvider(provider: string): Promise<{ authUrl: string }> {
  return unwrap(await api.post(`/integrations/accounting/connect/${provider}`))
}

export async function updateConnectionSettings(id: string, settings: AccountingConnection['settings']): Promise<AccountingConnection> {
  return unwrap(await api.patch(`/integrations/accounting/connections/${id}/settings`, settings))
}

export async function disconnectProvider(id: string): Promise<void> {
  await api.delete(`/integrations/accounting/connections/${id}`)
}

export async function getSyncLogs(params?: { page?: number; pageSize?: number; status?: string }): Promise<{ items: SyncLogRow[]; total: number }> {
  return unwrap(await api.get('/integrations/accounting/logs', { params }))
}

export async function retryInvoiceSync(invoiceId: string): Promise<void> {
  await api.post(`/integrations/accounting/sync/invoice/${invoiceId}`)
}
