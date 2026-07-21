import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { AuditLog, AuditSummary, AuditFilterParams, ChainVerificationResult } from '@/api/audit.api'
import {
  fetchAuditLogs,
  fetchAuditLogById,
  fetchAuditSummary,
  verifyAuditChain,
  exportAuditLogsCsv,
} from '@/api/audit.api'
import { ToastService } from '@/services/toast.service'

const DEFAULT_FILTERS: AuditFilterParams = {
  page: 1,
  pageSize: 20,
  sortBy: 'timestamp',
  sortDir: 'DESC',
}

export const useAuditStore = defineStore('audit', () => {
  const logs = ref<AuditLog[]>([])
  const currentLog = ref<AuditLog | null>(null)
  const summary = ref<AuditSummary | null>(null)
  const chainVerification = ref<ChainVerificationResult | null>(null)

  const loading = ref(false)
  const loadingSummary = ref(false)
  const loadingChain = ref(false)
  const exporting = ref(false)

  const filters = ref<AuditFilterParams>({ ...DEFAULT_FILTERS })
  const pagination = ref({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  const totalPages = computed(() => pagination.value.totalPages)

  async function fetchLogs() {
    loading.value = true
    try {
      const res = await fetchAuditLogs(filters.value)
      logs.value = res.items
      pagination.value = {
        total: res.total,
        page: res.page,
        pageSize: res.pageSize,
        totalPages: res.totalPages,
        hasNextPage: res.hasNextPage,
        hasPreviousPage: res.hasPreviousPage,
      }
    } catch {
      ToastService.error('Failed to load audit logs')
    } finally {
      loading.value = false
    }
  }

  async function fetchLog(id: string) {
    loading.value = true
    try {
      currentLog.value = await fetchAuditLogById(id)
    } catch {
      ToastService.error('Failed to load audit log')
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    loadingSummary.value = true
    try {
      summary.value = await fetchAuditSummary()
    } catch {
      ToastService.error('Failed to load audit summary')
    } finally {
      loadingSummary.value = false
    }
  }

  async function verifyChain() {
    loadingChain.value = true
    try {
      chainVerification.value = await verifyAuditChain()
    } catch {
      ToastService.error('Failed to verify chain integrity')
    } finally {
      loadingChain.value = false
    }
  }

  async function exportCsv() {
    exporting.value = true
    try {
      const blob = await exportAuditLogsCsv(filters.value)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      ToastService.error('Failed to export audit logs')
    } finally {
      exporting.value = false
    }
  }

  function setFilters(partial: Partial<AuditFilterParams>) {
    filters.value = { ...filters.value, ...partial, page: 1 }
    fetchLogs()
  }

  function resetFilters() {
    filters.value = { ...DEFAULT_FILTERS }
    fetchLogs()
  }

  function setPage(page: number) {
    filters.value.page = page
    fetchLogs()
  }

  function clearCurrentLog() {
    currentLog.value = null
  }

  return {
    logs,
    currentLog,
    summary,
    chainVerification,
    loading,
    loadingSummary,
    loadingChain,
    exporting,
    filters,
    pagination,
    totalPages,
    fetchLogs,
    fetchLog,
    fetchSummary,
    verifyChain,
    exportCsv,
    setFilters,
    resetFilters,
    setPage,
    clearCurrentLog,
  }
})
