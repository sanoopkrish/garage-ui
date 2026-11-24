<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import { getCustomer, type Customer } from '@/api/customers.api'
import { CustomerType } from '@/types/generated/enums/customer'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { Receipt, Plus, Send, Banknote, Pencil } from 'lucide-vue-next'
import InvoiceEditModal from '@/components/Invoices/InvoiceEditModal.vue'
import { getInvoicesForJob, generateInvoice, issueInvoice, recordInvoicePayment } from '@/api/invoices.api'
import { retryInvoiceSync } from '@/api/accounting.api'
import type { Invoice } from '@/api/invoices.api'
import { InvoiceStatus, PaymentMethod } from '@/types/generated/enums/invoice'
import { invoiceStatusLabels, paymentStatusLabels, paymentStatusVariant, paymentMethodLabels, gbp } from '@/utils/invoiceStatus'
import { useCrudPermissions, usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/** `quoteRequired` false (Sprint 32) → the invoice is created straight from the job, no quote needed */
const props = defineProps<{ jobId: string; customerId?: string; quoteRequired?: boolean }>()
const emit = defineEmits<{
  (e: 'changed'): void
  /** Sprint 32 — whether the job has an invoice that is not void (the job page hides Work to invoice once it does) */
  (e: 'invoiced', hasLiveInvoice: boolean): void
}>()

const { canCreate, canRead: canViewInvoices } = useCrudPermissions('finance', 'invoices')
const { hasPermission: canSend } = usePermissions('menus.finance.invoices.send')
const { hasPermission: canMarkPaid } = usePermissions('menus.finance.invoices.markPaid')
const { hasPermission: canUpdate } = usePermissions('menus.finance.invoices.update')
const editingInvoice = ref<Invoice | null>(null)

const invoices = ref<Invoice[]>([])
/** A voided invoice does not stop a new one being created (the API allows it) */
const hasLiveInvoice = computed(() => invoices.value.some((i) => i.status !== InvoiceStatus.VOID))
const loading = ref(true)

// ── Trade credit switch (Sprint 20) — trade (B2B) accounts with a credit amount only ──
const customer = ref<Customer | null>(null)
const applyTradeCredit = ref(true)
const tradeCreditAmount = computed(() =>
  customer.value?.type === CustomerType.B2B && Number(customer.value.tradeCreditAmount ?? 0) > 0
    ? Number(customer.value.tradeCreditAmount)
    : null,
)

async function loadCustomer() {
  if (!props.customerId || !canCreate.value) return
  try {
    customer.value = await getCustomer(props.customerId)
  } catch {
    /* no customer access → no switch; the backend default still applies */
  }
}

async function load() {
  if (!canViewInvoices.value) return
  loading.value = true
  try {
    invoices.value = await getInvoicesForJob(props.jobId)
    emit('invoiced', hasLiveInvoice.value)
  } catch {
    ToastService.error('Failed to load invoices')
  } finally {
    loading.value = false
  }
}

function apiError(err: any, fallback: string) {
  const message = err?.response?.data?.message
  ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? fallback))
}

async function handleGenerate() {
  try {
    const created = await generateInvoice(props.jobId, tradeCreditAmount.value != null ? { tradeCreditEnabled: applyTradeCredit.value } : undefined)
    await load()
    // Sprint 32 — a direct invoice with nothing on it yet, or with items still to price, opens for editing straight away
    const unfinished = created.lines.length === 0 || created.lines.some((l) => !(Number(l.unitPrice) > 0))
    if (unfinished && canUpdate.value) {
      ToastService.success(created.lines.length ? 'Draft invoice created — check the prices' : 'Draft invoice created — add the items')
      editingInvoice.value = invoices.value.find((i) => i.id === created.id) ?? created
    } else {
      ToastService.success('Draft invoice created')
    }
  } catch (err: any) {
    apiError(err, 'Failed to generate invoice')
  }
}

async function handleIssue(invoice: Invoice) {
  const result = await showConfirmDialog(`Issue ${invoice.invoiceNumber}? Due date is set from the customer's terms.`, false, 'Issue')
  if (!result.isConfirmed) return
  try {
    await issueInvoice(invoice.id)
    ToastService.success('Invoice issued')
    await load()
    emit('changed')
  } catch (err: any) {
    apiError(err, 'Failed to issue invoice')
  }
}

// ── Payment modal ─────────────────────────────────────────────────────────────
const payingInvoice = ref<Invoice | null>(null)
const payForm = reactive({ method: PaymentMethod.CARD as PaymentMethod, amount: '', reference: '' })
const paySubmitting = ref(false)

const methodOptions = Object.values(PaymentMethod).map((m) => ({ value: m, label: paymentMethodLabels[m] }))

function openPay(invoice: Invoice) {
  payingInvoice.value = invoice
  payForm.method = PaymentMethod.CARD
  payForm.amount = String(invoice.balance)
  payForm.reference = ''
}

async function submitPay() {
  const inv = payingInvoice.value
  if (!inv || payForm.amount === '') return
  paySubmitting.value = true
  try {
    await recordInvoicePayment(inv.id, payForm.method, Number(payForm.amount), payForm.reference.trim() || undefined)
    ToastService.success('Payment recorded')
    payingInvoice.value = null
    await load()
    emit('changed')
  } catch (err: any) {
    apiError(err, 'Failed to record payment')
  } finally {
    paySubmitting.value = false
  }
}

async function retryXero(invoice: Invoice) {
  try {
    await retryInvoiceSync(invoice.id)
    ToastService.success('Pushed to Xero')
    await load()
  } catch (err: any) {
    apiError(err, 'Xero push failed')
  }
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d }
}

onMounted(() => { load(); loadCustomer() })
</script>

<template>
  <div v-if="canViewInvoices" class="card">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <Receipt class="w-4 h-4 text-brand-500" />
        <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Invoices</h2>
      </div>
      <UiButton v-if="canCreate && !loading && !hasLiveInvoice" variant="secondary" @click="handleGenerate">
        <Plus class="w-4 h-4" /> {{ quoteRequired ? 'Generate from Quote' : 'Create invoice' }}
      </UiButton>
    </div>

    <p v-if="loading" class="text-sm text-slate-400 animate-pulse">Loading invoices…</p>
    <p v-else-if="invoices.length === 0" class="text-sm text-slate-400">
      <template v-if="quoteRequired">{{ canCreate
        ? 'No invoice yet — generate one once the quote is approved.'
        : 'No invoice yet — Accounts (or an admin) generates it from the approved quote.' }}</template>
      <template v-else>{{ canCreate
        ? 'No invoice yet — this job needs no quote, so create the invoice whenever the work is agreed.'
        : 'No invoice yet — Accounts (or an admin) creates it.' }}</template>
    </p>
    <div v-if="!loading && !hasLiveInvoice && canCreate && tradeCreditAmount != null" class="mt-3 rounded-lg border border-slate-100 dark:border-dark-border px-3 py-2.5">
      <UiToggle
        v-model="applyTradeCredit"
        :label="`Apply trade credit (${gbp(tradeCreditAmount)})`"
        description="Raised as a credit note and applied to the invoice when it is issued. Can still be changed on the draft."
      />
    </div>

    <div v-else class="space-y-4">
      <div v-for="inv in invoices" :key="inv.id" class="border border-slate-100 dark:border-dark-border rounded-lg p-3.5">
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <router-link :to="`/invoices/${inv.id}`" class="font-semibold text-brand-600 hover:underline">{{ inv.invoiceNumber }}</router-link>
          <UiBadge variant="info" dot>{{ invoiceStatusLabels[inv.status] }}</UiBadge>
          <UiBadge v-if="inv.status === InvoiceStatus.ISSUED" :variant="(paymentStatusVariant[inv.paymentStatus] as any)" dot>{{ paymentStatusLabels[inv.paymentStatus] }}</UiBadge>
          <a
            v-if="inv.accountingSyncStatus === 'synced' && inv.accountingExternalId"
            :href="`https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${inv.accountingExternalId}`"
            target="_blank" rel="noopener"
          ><UiBadge variant="done" title="Open in Xero">Xero ✓ ↗</UiBadge></a>
          <UiBadge v-else-if="inv.accountingSyncStatus === 'synced'" variant="done">Xero ✓</UiBadge>
          <span v-else-if="inv.accountingSyncStatus === 'error'" class="inline-flex items-center gap-1">
            <UiBadge variant="cancelled" :title="inv.accountingSyncError ?? ''">Xero failed</UiBadge>
            <button v-if="canSend" class="text-xs text-brand-600 hover:underline" @click="retryXero(inv)">Retry</button>
          </span>
          <button
            v-else-if="canSend && inv.status !== InvoiceStatus.DRAFT"
            class="text-xs text-brand-600 hover:underline"
            @click="retryXero(inv)"
          >
            Push to Xero
          </button>
          <span class="ml-auto text-sm font-semibold text-slate-700 dark:text-slate-200">{{ gbp(inv.grossTotal) }}</span>
        </div>
        <div class="flex items-center justify-between text-xs text-slate-400">
          <span>Net {{ gbp(inv.netTotal) }} · VAT {{ gbp(inv.vatAmount) }}<template v-if="inv.status === InvoiceStatus.ISSUED"> · Due {{ formatDate(inv.dueDate) }}<template v-if="inv.creditsAllocated > 0"> · Credits {{ gbp(inv.creditsAllocated) }}</template> · Balance {{ gbp(inv.balance) }}</template><template v-else-if="inv.tradeCreditEnabled && inv.tradeCreditAmount"> · Trade credit {{ gbp(inv.tradeCreditAmount) }} at issue</template></span>
          <div class="flex items-center gap-1.5">
            <UiButton v-if="inv.status === InvoiceStatus.DRAFT && canUpdate" variant="secondary" @click="editingInvoice = inv"><Pencil class="w-3.5 h-3.5" /> Edit</UiButton>
            <UiButton v-if="inv.status === InvoiceStatus.DRAFT && canSend" @click="handleIssue(inv)"><Send class="w-3.5 h-3.5" /> Issue</UiButton>
            <UiButton v-if="inv.status === InvoiceStatus.ISSUED && inv.balance > 0 && canMarkPaid" variant="secondary" @click="openPay(inv)"><Banknote class="w-3.5 h-3.5" /> Record Payment</UiButton>
          </div>
        </div>
      </div>
    </div>

    <InvoiceEditModal :open="!!editingInvoice" :invoice="editingInvoice" @close="editingInvoice = null" @saved="load" />

    <!-- Payment modal -->
    <UiModal :open="!!payingInvoice" :title="`Record Payment — ${payingInvoice?.invoiceNumber ?? ''}`" @close="payingInvoice = null">
      <div class="space-y-4">
        <UiSelect v-model="payForm.method" label="Method" :options="methodOptions" />
        <UiInput v-model="payForm.amount" label="Amount (£)" type="number" required />
        <UiInput v-model="payForm.reference" label="Reference (optional)" placeholder="e.g. bank ref / last 4 digits" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="payingInvoice = null">Cancel</UiButton>
        <UiButton :loading="paySubmitting" @click="submitPay">Record Payment</UiButton>
      </template>
    </UiModal>
  </div>
</template>
