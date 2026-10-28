<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import { getCompanySettings, updateCompanySettings, type ProcurementSettings } from '@/api/company.api'
import { getAccountingConnections, updateConnectionSettings, type AccountingConnection } from '@/api/accounting.api'
import { useProcurementStore } from '@/stores/procurement.store'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/** Settings → Purchasing (Sprint 23): each optional part of purchasing can be switched on or off. */
const { hasPermission: canUpdate } = usePermissions('menus.administration.settings.business.update')
const procurement = useProcurementStore()

const loading = ref(true)
const saving = ref(false)
const form = reactive<ProcurementSettings>({
  enabled: true, approvalsEnabled: false, poApprovalThreshold: 250, goodsReceiptsEnabled: true, billsEnabled: true,
  billPaymentsEnabled: false, billVarianceTolerance: 5, billVariancePercent: 2,
  aiInvoiceCapture: false, lowStockSuggestions: false, fieldReceiptCapture: false,
})

// Xero push for supplier invoices lives on the accounting connection (beside the other Xero switches)
const xero = ref<AccountingConnection | null>(null)
const xeroPush = ref(false)
const xeroExpenseCode = ref('')
const { hasPermission: canManageXero } = usePermissions('menus.administration.settings.integrations.update')

async function load() {
  loading.value = true
  try {
    const settings = await getCompanySettings()
    if (settings.procurement) Object.assign(form, settings.procurement)
    xero.value = (await getAccountingConnections().catch(() => [])).find((c) => c.provider === 'xero') ?? null
    xeroPush.value = xero.value?.settings?.syncBills ?? false
    xeroExpenseCode.value = xero.value?.settings?.defaultExpenseAccountCode ?? ''
  } catch {
    ToastService.error('Failed to load the purchasing settings')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (form.approvalsEnabled && !(Number(form.poApprovalThreshold) >= 0)) { ToastService.error('Enter the approval limit'); return }
  saving.value = true
  try {
    await updateCompanySettings({
      procurement: {
        enabled: form.enabled, approvalsEnabled: form.approvalsEnabled, poApprovalThreshold: Number(form.poApprovalThreshold) || 0,
        goodsReceiptsEnabled: form.goodsReceiptsEnabled, billsEnabled: form.billsEnabled, billPaymentsEnabled: form.billPaymentsEnabled,
        billVarianceTolerance: Number(form.billVarianceTolerance) || 0, billVariancePercent: Number(form.billVariancePercent) || 0,
        lowStockSuggestions: form.lowStockSuggestions, fieldReceiptCapture: form.fieldReceiptCapture,
      },
    })
    if (xero.value && canManageXero.value) {
      await updateConnectionSettings(xero.value.id, { syncBills: xeroPush.value, defaultExpenseAccountCode: xeroExpenseCode.value.trim() || undefined })
    }
    ToastService.success('Purchasing settings saved')
    await Promise.all([load(), procurement.fetchSettings(true)])
  } catch (e: any) {
    const message = e.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to save'))
  } finally {
    saving.value = false
  }
}

onMounted(() => { load(); procurement.fetchSettings() })

const inputClass = 'w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'
const sectionClass = 'text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2'
</script>

<template>
  <div>
    <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Purchasing</h2>
    <p class="text-sm text-slate-500 mb-5">Choose which parts of purchasing you use. Anything switched off disappears from the menus. Ordering parts for a job always works as before.</p>

    <div v-if="loading" class="h-40 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <div v-else class="space-y-5 max-w-lg">
      <UiToggle v-model="form.enabled" :disabled="!canUpdate" label="Purchasing" description="Purchase orders, suppliers and supplier invoices. Off = the whole Purchasing menu is hidden." />

      <template v-if="form.enabled">
        <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-dark-border">
          <p :class="sectionClass">Orders</p>
          <UiToggle v-model="form.approvalsEnabled" :disabled="!canUpdate" label="Approval for larger orders" description="Orders over the limit wait for someone with the Approve Orders permission before they can be sent." />
          <div v-if="form.approvalsEnabled" class="w-48">
            <label :class="labelClass">Approval limit (£, inc. VAT)</label>
            <input v-model.number="form.poApprovalThreshold" type="number" min="0" step="1" :disabled="!canUpdate" :class="inputClass" />
          </div>
          <UiToggle v-model="form.goodsReceiptsEnabled" :disabled="!canUpdate" label="Booking-in records" description="Record each delivery: who received it, the delivery note, anything rejected or damaged. Off = simply mark the order as received." />
        </div>

        <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-dark-border">
          <p :class="sectionClass">Supplier invoices</p>
          <UiToggle v-model="form.billsEnabled" :disabled="!canUpdate" label="Supplier invoices" description="Enter and upload suppliers' invoices, check them against the order, and approve them." />
          <template v-if="form.billsEnabled">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label :class="labelClass">Flag a difference over (£)</label>
                <input v-model.number="form.billVarianceTolerance" type="number" min="0" step="0.5" :disabled="!canUpdate" :class="inputClass" />
              </div>
              <div>
                <label :class="labelClass">…or over (% of the order)</label>
                <input v-model.number="form.billVariancePercent" type="number" min="0" max="100" step="0.5" :disabled="!canUpdate" :class="inputClass" />
              </div>
            </div>
            <p class="text-xs text-slate-400 -mt-2">An invoice within either allowance counts as matching its order; whichever allows more applies.</p>
            <UiToggle v-model="form.billPaymentsEnabled" :disabled="!canUpdate" label="Record supplier payments here" description="Shows paid, unpaid and what is still owed. Off = invoices stop at approved and are paid from your accounting system." />
            <UiToggle v-model="form.fieldReceiptCapture" :disabled="!canUpdate" label="Receipts from the field app" description="Engineers can photograph a receipt for something they bought. It arrives in Supplier invoices for Accounts to complete." />

            <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3 space-y-3">
              <UiToggle
                v-model="xeroPush" :disabled="!canUpdate || !canManageXero || !xero"
                label="Send approved supplier invoices to Xero"
                description="Each invoice goes to Xero as a bill when it is approved, with the supplier's document attached. Payments recorded here follow it."
              />
              <div v-if="xeroPush" class="w-64">
                <label :class="labelClass">Xero purchases account code</label>
                <input v-model="xeroExpenseCode" type="text" placeholder="310" :disabled="!canUpdate || !canManageXero" :class="inputClass" />
              </div>
              <p v-if="!xero" class="text-xs text-slate-400">Xero is not connected yet — connect it under Integrations first.</p>
              <p v-else-if="xero.status !== 'connected'" class="text-xs text-amber-600">The Xero connection needs reconnecting (Integrations) before anything is sent.</p>
            </div>
            <p class="text-xs text-slate-400">
              Reading invoices automatically from the PDF or photo is {{ procurement.aiInvoiceCapture ? 'switched on' : 'switched off' }} — it is the "Supplier invoice reading" AI feature.
            </p>
          </template>
        </div>

        <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-dark-border">
          <p :class="sectionClass">Stock</p>
          <UiToggle v-model="form.lowStockSuggestions" :disabled="!canUpdate" label="Stock levels and re-order suggestions" description="Keep a count of what is on the shelf with a re-order point. Deliveries add to it; when something runs low it is suggested for ordering." />
        </div>
      </template>

      <div v-if="canUpdate" class="pt-2">
        <UiButton :loading="saving" @click="save">Save purchasing settings</UiButton>
      </div>
    </div>
  </div>
</template>
