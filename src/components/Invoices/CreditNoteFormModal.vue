<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import InvoiceLinesEditor, { type EditableLine } from '@/components/Invoices/InvoiceLinesEditor.vue'
import { useCreditNotesStore } from '@/stores/credit-notes.store'
import type { CreditNote } from '@/api/credit-notes.api'
import { getInvoices, type Invoice } from '@/api/invoices.api'
import { getCustomers, type Customer } from '@/api/customers.api'
import { CreditNoteLineType, CreditNoteReason } from '@/types/generated/enums/credit-note'
import { InvoiceStatus } from '@/types/generated/enums/invoice'
import { creditNoteLineTypeLabels, creditNoteReasonLabels } from '@/utils/creditNoteStatus'
import { gbp } from '@/utils/invoiceStatus'
import { ToastService } from '@/services/toast.service'

/**
 * New / edit-draft credit note (Sprint 20). Small form → modal.
 * `prefillInvoice` opens it from an invoice ("Raise credit note") with that invoice's lines.
 */
const props = defineProps<{ open: boolean; creditNote?: CreditNote | null; prefillInvoice?: Invoice | null }>()
const emit = defineEmits<{ close: []; saved: [creditNote: CreditNote] }>()

const store = useCreditNotesStore()
const isEdit = computed(() => !!props.creditNote)

// Trade credit is raised by the switch, never by hand
const reasonOptions = Object.values(CreditNoteReason)
  .filter((r) => r !== CreditNoteReason.TRADE_CREDIT)
  .map((r) => ({ value: r, label: creditNoteReasonLabels[r] }))
const lineTypeOptions = Object.values(CreditNoteLineType)
  .filter((t) => t !== CreditNoteLineType.TRADE_CREDIT)
  .map((t) => ({ value: t, label: creditNoteLineTypeLabels[t] }))

let keySeq = 0
const form = reactive({ customerId: '', invoiceId: '', reason: CreditNoteReason.GOODWILL as CreditNoteReason, vatRatePercent: 20, notes: '' })
const lines = ref<EditableLine[]>([])
const errors = reactive({ customerId: '' })
const saving = ref(false)

const customers = ref<Customer[]>([])
const customerInvoices = ref<Invoice[]>([])
const customerOptions = computed(() => [
  { value: '', label: 'Select a customer…' },
  ...customers.value.map((c) => ({ value: c.id, label: c.businessName || c.name })),
])
const invoiceOptions = computed(() => [
  { value: '', label: 'No specific invoice (credit on account)' },
  ...customerInvoices.value.map((i) => ({ value: i.id, label: `${i.invoiceNumber} — ${gbp(i.grossTotal)} (balance ${gbp(i.balance)})` })),
])
const customerLocked = computed(() => isEdit.value || !!props.prefillInvoice)

async function loadCustomers() {
  if (customers.value.length) return
  try {
    customers.value = (await getCustomers({ pageSize: 100 })).items
  } catch {
    ToastService.error('Failed to load customers')
  }
}

async function loadInvoices(customerId: string) {
  customerInvoices.value = []
  if (!customerId) return
  try {
    const { items } = await getInvoices({ customerId, pageSize: 50 })
    customerInvoices.value = items.filter((i) => i.status === InvoiceStatus.ISSUED)
  } catch {
    ToastService.error('Failed to load the customer\'s invoices')
  }
}

function linesFromInvoice(invoice: Invoice): EditableLine[] {
  return invoice.lines.map((l) => ({
    key: keySeq++,
    lineType: (Object.values(CreditNoteLineType) as string[]).includes(l.lineType) ? l.lineType : CreditNoteLineType.OTHER,
    description: l.description,
    quantity: l.quantity,
    unitPrice: Number(l.unitPrice),
    invoiceLineId: l.id,
  }))
}

watch(() => props.open, async (open) => {
  if (!open) return
  errors.customerId = ''
  await loadCustomers()
  if (props.creditNote) {
    const cn = props.creditNote
    form.customerId = cn.customerId
    form.invoiceId = cn.invoiceId ?? ''
    form.reason = cn.reason
    form.vatRatePercent = Number(cn.vatRatePercent)
    form.notes = cn.notes ?? ''
    lines.value = cn.lines.map((l) => ({
      key: keySeq++, lineType: l.lineType, description: l.description, quantity: l.quantity,
      unitPrice: Number(l.unitPrice), invoiceLineId: l.invoiceLineId ?? undefined,
    }))
  } else if (props.prefillInvoice) {
    const inv = props.prefillInvoice
    form.customerId = inv.customerId
    form.invoiceId = inv.id
    form.reason = CreditNoteReason.GOODWILL
    form.vatRatePercent = Number(inv.vatRatePercent)
    form.notes = ''
    lines.value = linesFromInvoice(inv)
  } else {
    form.customerId = ''
    form.invoiceId = ''
    form.reason = CreditNoteReason.GOODWILL
    form.vatRatePercent = 20
    form.notes = ''
    lines.value = [{ key: keySeq++, lineType: CreditNoteLineType.OTHER, description: '', quantity: 1, unitPrice: 0 }]
  }
  await loadInvoices(form.customerId)
})

async function onCustomerChange() {
  form.invoiceId = ''
  await loadInvoices(form.customerId)
}

/** Picking an invoice on a blank form offers its lines + VAT rate as a starting point */
function onInvoiceChange() {
  const inv = customerInvoices.value.find((i) => i.id === form.invoiceId)
  if (!inv) return
  form.vatRatePercent = Number(inv.vatRatePercent)
  const untouched = lines.value.every((l) => !l.description.trim() && !Number(l.unitPrice))
  if (untouched) lines.value = linesFromInvoice(inv)
}

async function save() {
  errors.customerId = form.customerId ? '' : 'Choose a customer'
  if (errors.customerId) return
  if (!lines.value.length) { ToastService.error('A credit note needs at least one line'); return }
  if (lines.value.some((l) => !l.description.trim())) { ToastService.error('Every line needs a description'); return }
  if (!lines.value.some((l) => (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) > 0)) { ToastService.error('The credit total must be greater than zero'); return }

  const payloadLines = lines.value.map((l) => ({
    lineType: l.lineType as CreditNoteLineType,
    description: l.description.trim(),
    quantity: Number(l.quantity) || 1,
    unitPrice: Number(l.unitPrice) || 0,
    // only keep the invoice-line link while still crediting that same invoice
    ...(l.invoiceLineId && form.invoiceId ? { invoiceLineId: l.invoiceLineId } : {}),
  }))

  saving.value = true
  try {
    const saved = props.creditNote
      ? await store.updateCreditNote(props.creditNote.id, {
          reason: form.reason,
          invoiceId: form.invoiceId || (null as any),
          vatRatePercent: Number(form.vatRatePercent),
          lines: payloadLines,
          notes: form.notes.trim(),
        })
      : await store.createCreditNote({
          customerId: form.customerId,
          reason: form.reason,
          invoiceId: form.invoiceId || undefined,
          vatRatePercent: Number(form.vatRatePercent),
          lines: payloadLines,
          notes: form.notes.trim() || undefined,
        })
    ToastService.success(props.creditNote ? 'Credit note updated' : `Draft ${saved.creditNoteNumber} created`)
    emit('saved', saved)
    emit('close')
  } catch {
    ToastService.error(store.error ?? 'Failed to save credit note')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal :open="open" :title="isEdit ? `Edit ${creditNote?.creditNoteNumber} (draft)` : 'New credit note'" size="lg" @close="emit('close')">
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiSelect v-model="form.customerId" label="Customer" :options="customerOptions" :disabled="customerLocked" required :error="errors.customerId" @update:modelValue="onCustomerChange" />
        <UiSelect v-model="form.reason" label="Reason" :options="reasonOptions" required />
      </div>
      <UiSelect v-model="form.invoiceId" label="Against invoice (optional)" :options="invoiceOptions" :disabled="!form.customerId" @update:modelValue="onInvoiceChange" />
      <p class="text-xs text-slate-400 -mt-2">
        Raised against an invoice, the credit is applied to its balance when issued. Left blank, it stays on the customer's account until allocated.
      </p>

      <InvoiceLinesEditor
        v-model="lines"
        v-model:vatRatePercent="form.vatRatePercent"
        :lineTypeOptions="lineTypeOptions"
        :defaultLineType="CreditNoteLineType.OTHER"
        totalLabel="Credit total"
      />

      <div>
        <label class="block text-xs font-medium text-slate-500 mb-1">Notes (shown on the credit note)</label>
        <textarea v-model="form.notes" rows="2"
          class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
      </div>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Cancel</UiButton>
      <UiButton :loading="saving" @click="save">{{ isEdit ? 'Save changes' : 'Create draft' }}</UiButton>
    </template>
  </UiModal>
</template>
