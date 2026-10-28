<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import InvoiceLinesEditor, { type EditableLine } from '@/components/Invoices/InvoiceLinesEditor.vue'
import { updateInvoice, type Invoice } from '@/api/invoices.api'
import { InvoiceLineType } from '@/types/generated/enums/invoice'
import { CustomerType } from '@/types/generated/enums/customer'
import { ToastService } from '@/services/toast.service'

const props = defineProps<{ open: boolean; invoice: Invoice | null }>()
const emit = defineEmits<{ close: []; saved: [invoice: Invoice] }>()

const lineTypeOptions = [
  { value: InvoiceLineType.LABOUR, label: 'Labour' },
  { value: InvoiceLineType.PART, label: 'Part' },
  { value: InvoiceLineType.DIAGNOSIS_FEE, label: 'Diagnosis fee' },
  { value: InvoiceLineType.STORAGE_CHARGE, label: 'Storage charge' },
  { value: InvoiceLineType.OTHER, label: 'Other' },
]

let keySeq = 0
const lines = ref<EditableLine[]>([])
const form = reactive({ notes: '', vatRatePercent: 20, tradeCreditEnabled: false, tradeCreditAmount: '' as string | number })
const saving = ref(false)

/** Trade credit switch (Sprint 20) — trade accounts only */
const isTrade = computed(() => props.invoice?.customerType === CustomerType.B2B)

watch(() => props.open, (open) => {
  if (open && props.invoice) {
    lines.value = props.invoice.lines.map((l) => ({
      key: keySeq++,
      lineType: l.lineType,
      description: l.description,
      quantity: l.quantity,
      unitPrice: Number(l.unitPrice),
    }))
    form.notes = props.invoice.notes ?? ''
    form.vatRatePercent = Number(props.invoice.vatRatePercent)
    form.tradeCreditEnabled = props.invoice.tradeCreditEnabled ?? false
    form.tradeCreditAmount = props.invoice.tradeCreditAmount ?? ''
  }
})

async function save() {
  if (!props.invoice) return
  if (!lines.value.length) { ToastService.error('An invoice needs at least one line'); return }
  if (lines.value.some((l) => !l.description.trim())) { ToastService.error('Every line needs a description'); return }
  const creditAmount = form.tradeCreditAmount === '' ? null : Number(form.tradeCreditAmount)
  if (isTrade.value && form.tradeCreditEnabled && !(creditAmount && creditAmount > 0)) {
    ToastService.error('Enter a trade credit amount, or switch trade credit off')
    return
  }
  saving.value = true
  try {
    const updated = await updateInvoice(props.invoice.id, {
      notes: form.notes.trim(),
      vatRatePercent: Number(form.vatRatePercent),
      lines: lines.value.map((l) => ({
        lineType: l.lineType as InvoiceLineType,
        description: l.description.trim(),
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
      })),
      ...(isTrade.value ? { tradeCreditEnabled: form.tradeCreditEnabled, tradeCreditAmount: creditAmount } : {}),
    })
    ToastService.success('Invoice updated')
    emit('saved', updated)
    emit('close')
  } catch (e: any) {
    const message = e.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to update invoice'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal :open="open" :title="`Edit ${invoice?.invoiceNumber ?? ''} (draft)`" size="lg" @close="emit('close')">
    <div class="space-y-4">
      <InvoiceLinesEditor
        v-model="lines"
        v-model:vatRatePercent="form.vatRatePercent"
        :lineTypeOptions="lineTypeOptions"
        :defaultLineType="InvoiceLineType.OTHER"
      />

      <div v-if="isTrade" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-dark-border px-3 py-2.5">
        <UiToggle
          v-model="form.tradeCreditEnabled"
          label="Apply trade credit"
          description="Raises a credit note for this amount and applies it to the invoice when issued."
        />
        <label class="flex items-center gap-2 text-sm text-slate-500">Amount £
          <input v-model="form.tradeCreditAmount" type="number" min="0" step="0.01" :disabled="!form.tradeCreditEnabled"
            class="w-24 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50" />
        </label>
      </div>

      <div>
        <label class="block text-xs font-medium text-slate-500 mb-1">Notes (shown on the invoice)</label>
        <textarea v-model="form.notes" rows="2"
          class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
      </div>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Cancel</UiButton>
      <UiButton :loading="saving" @click="save">Save changes</UiButton>
    </template>
  </UiModal>
</template>
