<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import {
  getCompanySettings, updateCompanySettings,
  DEFAULT_INVOICE_EMAIL_ATTACHMENTS, type InvoiceEmailAttachmentSettings,
} from '@/api/company.api'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/**
 * Settings → Billing → "Attach to invoice emails" (Sprint 26).
 * Which stored documents ride along with the INVOICE_ISSUED customer email.
 */
const { hasPermission: canUpdate } = usePermissions('menus.administration.settings.billing.update')

const loading = ref(true)
const saving = ref(false)
const form = reactive<InvoiceEmailAttachmentSettings>({ ...DEFAULT_INVOICE_EMAIL_ATTACHMENTS })

async function load() {
  loading.value = true
  try {
    const settings = await getCompanySettings()
    Object.assign(form, DEFAULT_INVOICE_EMAIL_ATTACHMENTS, settings.invoiceEmailAttachments ?? {})
    form.invoicePdf = true
  } catch {
    ToastService.error('Failed to load invoice attachment settings')
  } finally {
    loading.value = false
  }
}

async function save() {
  const cap = Number(form.maxTotalMb)
  if (!(cap >= 1 && cap <= 25)) { ToastService.error('The size limit must be between 1 and 25 MB'); return }
  saving.value = true
  try {
    await updateCompanySettings({ invoiceEmailAttachments: { ...form, invoicePdf: true, maxTotalMb: cap } })
    ToastService.success('Invoice attachment settings saved')
  } catch (e: any) {
    const message = e.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to save'))
  } finally {
    saving.value = false
  }
}

onMounted(load)

const inputClass = 'w-24 text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50'
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Attach to invoice emails</p>
    <p class="text-sm text-slate-500">The invoice PDF is always attached. Choose what else goes with it when an invoice is issued.</p>

    <div v-if="loading" class="h-32 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <div v-else class="space-y-3">
      <UiToggle :model-value="true" disabled label="Invoice PDF" description="Always attached." />
      <UiToggle v-model="form.creditNotePdf" :disabled="!canUpdate" label="Trade credit note PDF" description="When a trade credit is raised with the invoice." />
      <UiToggle v-model="form.adasCertificate" :disabled="!canUpdate" label="ADAS certificate" description="Certificates stored on the job (newest three)." />
      <UiToggle v-model="form.diagnosticReports" :disabled="!canUpdate" label="Diagnostic reports" description="Autel / diagnostic reports attached to the job by the engineer or the office." />
      <UiToggle v-model="form.completionPhotos" :disabled="!canUpdate" label="Completion photos" description="Photos taken when the job was finished." />

      <div class="flex items-center gap-3 pt-1">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Size limit</label>
        <input v-model.number="form.maxTotalMb" type="number" min="1" max="25" :disabled="!canUpdate" :class="inputClass" />
        <span class="text-sm text-slate-500">MB — above this only the invoice PDF is sent and the email says documents are available on request.</span>
      </div>

      <div v-if="canUpdate" class="pt-1">
        <UiButton :loading="saving" @click="save">Save attachment settings</UiButton>
      </div>
    </div>
  </div>
</template>
