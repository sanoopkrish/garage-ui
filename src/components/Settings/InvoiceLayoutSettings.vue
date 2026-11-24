<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import { getCompanySettings, updateCompanySettings, DEFAULT_INVOICE_LAYOUT, type InvoiceLayoutSettings } from '@/api/company.api'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/**
 * Settings → Billing → "Invoice layout" (Sprint 32).
 * What the invoice PDF shows: vehicle details, VAT column, customer contact, an extra
 * header note under the company details, and the Terms and Conditions at the foot.
 */
const { hasPermission: canUpdate } = usePermissions('menus.administration.settings.billing.update')

const loading = ref(true)
const saving = ref(false)
const layout = reactive<InvoiceLayoutSettings>({ ...DEFAULT_INVOICE_LAYOUT })
const text = reactive({ headerNote: '', terms: '' })

async function load() {
  loading.value = true
  try {
    const settings = await getCompanySettings()
    Object.assign(layout, DEFAULT_INVOICE_LAYOUT, settings.invoiceLayout ?? {})
    text.headerNote = settings.invoiceHeaderNote ?? ''
    text.terms = settings.invoiceTerms ?? ''
  } catch {
    ToastService.error('Failed to load invoice layout settings')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await updateCompanySettings({ invoiceLayout: { ...layout }, invoiceHeaderNote: text.headerNote, invoiceTerms: text.terms })
    ToastService.success('Invoice layout saved')
  } catch (e: any) {
    const message = e.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to save'))
  } finally {
    saving.value = false
  }
}

onMounted(load)

const textareaClass = 'w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50'
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Invoice layout</p>
    <p class="text-sm text-slate-500">What appears on the invoice your customer receives.</p>

    <div v-if="loading" class="h-32 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <div v-else class="space-y-3">
      <UiToggle v-model="layout.showVehicleDetails" :disabled="!canUpdate" label="Vehicle details"
        description="Mileage, chassis number and technician beside the registration." />
      <UiToggle v-model="layout.showVatColumn" :disabled="!canUpdate" label="VAT column" description="The VAT rate on every line." />
      <UiToggle v-model="layout.showCustomerContact" :disabled="!canUpdate" label="Customer email and phone" description="Under the customer name and address." />

      <div class="pt-1">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Header note</label>
        <textarea v-model="text.headerNote" rows="3" maxlength="1000" :disabled="!canUpdate" :class="textareaClass"
          placeholder="Shown under your company details, one line each — for example where to send remittance advice." />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Terms and Conditions</label>
        <textarea v-model="text.terms" rows="5" maxlength="5000" :disabled="!canUpdate" :class="textareaClass"
          placeholder="Printed at the foot of every invoice. Leave empty to print none." />
      </div>

      <div v-if="canUpdate" class="pt-1">
        <UiButton :loading="saving" @click="save">Save invoice layout</UiButton>
      </div>
    </div>
  </div>
</template>
