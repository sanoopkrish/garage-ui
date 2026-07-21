import apiClient from '@/api/client'

export interface AuditLog {
  id: string
  timestamp: string
  action: string
  category: string
  sensitivityLevel: string
  entityType: string
  entityId: string | null
  entityDisplayName: string | null
  userId: string | null
  userEmail: string | null
  userName: string | null
  userRole: string | null
  beforeState: Record<string, any> | null
  afterState: Record<string, any> | null
  changedFields: string[] | null
  ipAddress: string | null
  endpoint: string | null
  httpMethod: string | null
  reason: string | null
  notes: string | null
}

export interface AuditSummary {
  total: number
  byAction: Record<string, number>
  byCategory: Record<string, number>
  bySensitivity: Record<string, number>
  last24Hours: number
  last7Days: number
  last30Days: number
}

export interface AuditFilterParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'ASC' | 'DESC'
  search?: string
  action?: string
  entityType?: string
  fromDate?: string
  toDate?: string
}

export interface PaginatedAuditResponse {
  items: AuditLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ChainVerificationResult {
  valid: boolean
  checkedCount: number
  brokenAt: string | null
  brokenAtTimestamp: string | null
  error: string | null
}

export const AUDIT_ACTIONS = [
  'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'PRINT',
  'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
  'PERMISSION_CHANGE', 'BULK_UPDATE', 'BULK_DELETE', 'ARCHIVE', 'RESTORE',
  'APPROVE', 'REJECT', 'SIGN_OFF',
] as const

export async function fetchAuditLogs(params?: AuditFilterParams): Promise<PaginatedAuditResponse> {
  const response = await apiClient.get('/audit-logs', { params })
  return response.data?.data ?? response.data
}

export async function fetchAuditLogById(id: string): Promise<AuditLog> {
  const response = await apiClient.get(`/audit-logs/${id}`)
  return response.data?.data ?? response.data
}

export async function fetchAuditSummary(): Promise<AuditSummary> {
  const response = await apiClient.get('/audit-logs/summary')
  return response.data?.data ?? response.data
}

export async function verifyAuditChain(fromDate?: string, toDate?: string): Promise<ChainVerificationResult> {
  const response = await apiClient.get('/audit-logs/verify-chain', {
    params: { fromDate, toDate },
  })
  return response.data?.data ?? response.data
}

export async function exportAuditLogsCsv(params?: AuditFilterParams): Promise<Blob> {
  const response = await apiClient.get('/audit-logs/export/csv', {
    params,
    responseType: 'blob',
  })
  return response.data
}
