import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getProcurementSettings, type ProcurementSettings } from '@/api/procurement/purchase-orders.api'
import { getSuppliersBasic, type SupplierBasic } from '@/api/procurement/suppliers.api'

/**
 * Purchasing (Sprint 23) — the feature switches and the supplier picker list, shared by the
 * Purchasing screens and the sidebar. Lists themselves are loaded by each view (local loading).
 */
export const useProcurementStore = defineStore('procurement', () => {
  const settings = ref<ProcurementSettings | null>(null)
  const suppliers = ref<SupplierBasic[]>([])
  const error = ref<string | null>(null)
  let settingsRequest: Promise<ProcurementSettings | null> | null = null

  const enabled = computed(() => settings.value?.enabled !== false)
  const approvalsEnabled = computed(() => !!settings.value?.approvalsEnabled)
  const goodsReceiptsEnabled = computed(() => settings.value?.goodsReceiptsEnabled !== false)
  const billsEnabled = computed(() => settings.value?.billsEnabled !== false)
  const billPaymentsEnabled = computed(() => !!settings.value?.billPaymentsEnabled)
  const stockEnabled = computed(() => !!settings.value?.lowStockSuggestions)
  const aiInvoiceCapture = computed(() => !!settings.value?.aiInvoiceCapture)

  /** Loaded once and shared; `force` after the Settings → Purchasing tab saves */
  async function fetchSettings(force = false): Promise<ProcurementSettings | null> {
    if (settings.value && !force) return settings.value
    if (!settingsRequest || force) {
      settingsRequest = getProcurementSettings()
        .then((s) => { settings.value = s; return s })
        .catch(() => null)
        .finally(() => { settingsRequest = null })
    }
    return settingsRequest
  }

  async function fetchSuppliers(): Promise<SupplierBasic[]> {
    try {
      suppliers.value = await getSuppliersBasic()
    } catch (err: any) {
      error.value = err?.response?.data?.message ?? 'Failed to load suppliers'
      throw err
    }
    return suppliers.value
  }

  const supplierOptions = computed(() => suppliers.value.map((s) => ({ value: s.id, label: s.preferred ? `${s.name} ★` : s.name })))

  return {
    settings, suppliers, error, enabled, approvalsEnabled, goodsReceiptsEnabled, billsEnabled, billPaymentsEnabled, stockEnabled, aiInvoiceCapture, supplierOptions,
    fetchSettings, fetchSuppliers,
  }
})
