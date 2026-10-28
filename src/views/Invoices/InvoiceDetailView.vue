<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { retryInvoiceSync } from '@/api/accounting.api'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { ArrowLeft, Send, Banknote, Ban, Download, UploadCloud, Pencil, ReceiptText } from 'lucide-vue-next'
import CreditNoteFormModal from '@/components/Invoices/CreditNoteFormModal.vue'
import type { CreditNote } from '@/api/credit-notes.api'
import { creditNoteReasonLabels, creditNoteStatusLabels } from '@/utils/creditNoteStatus'
import { CreditNoteStatus } from '@/types/generated/enums/credit-note'
import InvoiceEditModal from '@/components/Invoices/InvoiceEditModal.vue'
import { getInvoice, issueInvoice, recordInvoicePayment, voidInvoice, downloadInvoicePdf } from '@/api/invoices.api'
import type { Invoice } from '@/api/invoices.api'
import { InvoiceStatus, PaymentMethod } from '@/types/generated/enums/invoice'
import { invoiceStatusLabels, paymentStatusLabels, paymentStatusVariant, paymentMethodLabels, gbp } from '@/utils/invoiceStatus'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

const route = useRoute()
const router = useRouter()
const { hasPermission: canSend } = usePermissions('menus.finance.invoices.send')
const { hasPermission: canUpdate } = usePermissions('menus.finance.invoices.update')
const showEdit = ref(false)
const { hasPermission: canMarkPaid } = usePermissions('menus.finance.invoices.markPaid')
const { hasPermission: canDelete } = usePermissions('menus.finance.invoices.delete')
const { hasPermission: canSeeCreditNotes } = usePermissions('menus.finance.creditNotes.read')
const { hasPermission: canRaiseCredit } = usePermissions('menus.finance.creditNotes.create')

// Sprint 20 — credit notes replace Void as the correction tool once an invoice is issued
const showRaiseCredit = ref(false)
const tradeCredit = computed(() => invoice.value?.creditNotes?.find((c) => c.isTradeCredit && c.status !== CreditNoteStatus.VOID) ?? null)
const creditNoteLink = (id: string) => ({ path: '/invoices', query: { tab: 'credit-notes', cn: id } })

function onCreditRaised(creditNote: CreditNote) {
  router.push(creditNoteLink(creditNote.id))
}

const invoice = ref<Invoice | null>(null)
const xeroPushing = ref(false)

async function pushToXero() {
  if (!invoice.value) return
  xeroPushing.value = true
  try {
    await retryInvoiceSync(invoice.value.id)
    ToastService.success('Pushed to Xero')
    await load()
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Xero push failed')
  } finally {
    xeroPushing.value = false
  }
}
const loading = ref(true)

function apiError(err: any, fallback: string) {
  const message = err?.response?.data?.message
  ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? fallback))
}

async function load() {
  try {
    invoice.value = await getInvoice(route.params.id as string)
  } catch {
    ToastService.error('Failed to load invoice')
    router.push('/invoices')
  } finally {
    loading.value = false
  }
}

async function handlePdf() {
  if (!invoice.value) return
  try {
    await downloadInvoicePdf(invoice.value.id, invoice.value.invoiceNumber)
  } catch {
    ToastService.error('Failed to download PDF')
  }
}

async function handleIssue() {
  if (!invoice.value) return
  const result = await showConfirmDialog(`Issue ${invoice.value.invoiceNumber}?`, false, 'Issue')
  if (!result.isConfirmed) return
  try {
    invoice.value = await issueInvoice(invoice.value.id)
    ToastService.success('Invoice issued')
  } catch (err: any) { apiError(err, 'Failed to issue invoice') }
}

async function handleVoid() {
  if (!invoice.value) return
  const voidResult = await showConfirmDialog(`Void ${invoice.value.invoiceNumber}? This cannot be undone.`, false, 'Void')
  if (!voidResult.isConfirmed) return
  try {
    invoice.value = await voidInvoice(invoice.value.id)
    ToastService.success('Invoice voided')
  } catch (err: any) { apiError(err, 'Failed to void invoice') }
}

const showPay = ref(false)
const payForm = reactive({ method: PaymentMethod.CARD as PaymentMethod, amount: '', reference: '' })
const paySubmitting = ref(false)
const methodOptions = Object.values(PaymentMethod).map((m) => ({ value: m, label: paymentMethodLabels[m] }))

function openPay() {
  payForm.method = PaymentMethod.CARD
  payForm.amount = String(invoice.value?.balance ?? '')
  payForm.reference = ''
  showPay.value = true
}

async function submitPay() {
  if (!invoice.value || payForm.amount === '') return
  paySubmitting.value = true
  try {
    invoice.value = await recordInvoicePayment(invoice.value.id, payForm.method, Number(payForm.amount), payForm.reference.trim() || undefined)
    ToastService.success('Payment recorded')
    showPay.value = false
  } catch (err: any) { apiError(err, 'Failed to record payment') } finally { paySubmitting.value = false }
}

function formatDate(d?: string | null, withTime = false): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) })
  } catch { return d }
}

onMounted(load)
</script>

<template>
  <DefaultLayout>
    <div class="flex items-center justify-between mb-6">
      <button @click="router.back()" class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft class="w-4 h-4" /> Back to Invoices
      </button>
      <div v-if="invoice" class="flex items-center gap-2">
        <UiButton variant="secondary" @click="handlePdf"><Download class="w-4 h-4" /> PDF</UiButton>
        <UiButton v-if="invoice.status === InvoiceStatus.DRAFT && canUpdate" variant="secondary" @click="showEdit = true"><Pencil class="w-4 h-4" /> Edit</UiButton>
        <UiButton v-if="invoice.status === InvoiceStatus.DRAFT && canSend" @click="handleIssue"><Send class="w-4 h-4" /> Issue</UiButton>
        <UiButton v-if="invoice.status === InvoiceStatus.ISSUED && invoice.balance > 0 && canMarkPaid" @click="openPay"><Banknote class="w-4 h-4" /> Record Payment</UiButton>
        <UiButton
          v-if="canSend && invoice.status !== InvoiceStatus.DRAFT && invoice.status !== InvoiceStatus.VOID && invoice.accountingSyncStatus !== 'synced'"
          variant="secondary"
          :disabled="xeroPushing"
          @click="pushToXero"
        >
          <UploadCloud class="w-4 h-4" /> {{ invoice.accountingSyncStatus === 'error' ? 'Retry Xero push' : 'Push to Xero' }}
        </UiButton>
        <UiButton v-if="invoice.status === InvoiceStatus.ISSUED && canRaiseCredit" variant="secondary" @click="showRaiseCredit = true"><ReceiptText class="w-4 h-4" /> Raise credit note</UiButton>
        <UiButton v-if="invoice.status === InvoiceStatus.DRAFT && canDelete" variant="secondary" @click="handleVoid"><Ban class="w-4 h-4" /> Void</UiButton>
      </div>
    </div>

    <div v-if="loading" class="card h-64 animate-pulse bg-slate-100 dark:bg-white/5" />

    <div v-else-if="invoice" class="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div class="xl:col-span-2 card">
        <div class="flex flex-wrap items-center gap-2 mb-5">
          <h1 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ invoice.invoiceNumber }}</h1>
          <UiBadge variant="info" dot>{{ invoiceStatusLabels[invoice.status] }}</UiBadge>
          <UiBadge v-if="invoice.status === InvoiceStatus.ISSUED" :variant="(paymentStatusVariant[invoice.paymentStatus] as any)" dot>{{ paymentStatusLabels[invoice.paymentStatus] }}</UiBadge>
          <a
            v-if="invoice.accountingSyncStatus === 'synced' && invoice.accountingExternalId"
            :href="`https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${invoice.accountingExternalId}`"
            target="_blank" rel="noopener"
          ><UiBadge variant="done" title="Open in Xero">Xero ✓ ↗</UiBadge></a>
          <UiBadge v-else-if="invoice.accountingSyncStatus === 'synced'" variant="done">Xero ✓</UiBadge>
          <UiBadge v-else-if="invoice.accountingSyncStatus === 'error'" variant="cancelled" :title="invoice.accountingSyncError ?? ''">Xero failed</UiBadge>
          <router-link v-if="tradeCredit && canSeeCreditNotes" :to="creditNoteLink(tradeCredit.id)">
            <UiBadge variant="info" :title="`Open ${tradeCredit.creditNoteNumber}`">Trade credit {{ gbp(tradeCredit.gross) }} applied ↗</UiBadge>
          </router-link>
          <UiBadge v-else-if="tradeCredit" variant="info">Trade credit {{ gbp(tradeCredit.gross) }} applied</UiBadge>
          <UiBadge v-else-if="invoice.status === InvoiceStatus.DRAFT && invoice.tradeCreditEnabled && invoice.tradeCreditAmount" variant="info">
            Trade credit {{ gbp(invoice.tradeCreditAmount) }} will apply at issue
          </UiBadge>
        </div>

        <table class="w-full text-sm mb-4">
          <thead>
            <tr class="border-b border-slate-100 dark:border-dark-border">
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Description</th>
              <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Qty</th>
              <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Unit</th>
              <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
            <tr v-for="line in invoice.lines" :key="line.id">
              <td class="py-2.5 text-slate-700 dark:text-slate-200">{{ line.description }}</td>
              <td class="py-2.5 text-right text-slate-500">{{ line.quantity }}</td>
              <td class="py-2.5 text-right text-slate-500">{{ gbp(line.unitPrice) }}</td>
              <td class="py-2.5 text-right font-medium text-slate-700 dark:text-slate-200">{{ gbp(line.lineTotal) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="flex justify-end">
          <div class="w-56 space-y-1.5 text-sm">
            <div class="flex justify-between"><span class="text-slate-400">Net</span><span class="text-slate-700 dark:text-slate-200">{{ gbp(invoice.netTotal) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">VAT ({{ invoice.vatRatePercent }}%)</span><span class="text-slate-700 dark:text-slate-200">{{ gbp(invoice.vatAmount) }}</span></div>
            <div class="flex justify-between font-semibold border-t border-slate-100 dark:border-dark-border pt-1.5"><span class="text-slate-700 dark:text-slate-200">Total</span><span class="text-slate-800 dark:text-slate-100">{{ gbp(invoice.grossTotal) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Paid</span><span class="text-green-600">{{ gbp(invoice.amountPaid) }}</span></div>
            <div v-if="invoice.creditsAllocated > 0" class="flex justify-between"><span class="text-slate-400">Credits applied</span><span class="text-green-600">−{{ gbp(invoice.creditsAllocated) }}</span></div>
            <div class="flex justify-between font-semibold"><span class="text-slate-700 dark:text-slate-200">Balance</span><span :class="invoice.balance > 0 ? 'text-amber-600' : 'text-green-600'">{{ gbp(invoice.balance) }}</span></div>
          </div>
        </div>
      </div>

      <div class="space-y-5">
        <div class="card space-y-2 text-sm">
          <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Details</h2>
          <div class="flex justify-between"><span class="text-slate-400">Customer</span>
            <router-link :to="`/customers/${invoice.customerId}`" class="text-brand-600 hover:underline">{{ invoice.customerName }}</router-link></div>
          <div class="flex justify-between"><span class="text-slate-400">Job</span>
            <router-link :to="`/jobs/${invoice.jobId}`" class="text-brand-600 hover:underline">{{ invoice.jobNumber }}</router-link></div>
          <div class="flex justify-between"><span class="text-slate-400">Issued</span><span class="text-slate-700 dark:text-slate-200">{{ formatDate(invoice.issuedAt) }}</span></div>
          <div class="flex justify-between"><span class="text-slate-400">Due</span><span class="text-slate-700 dark:text-slate-200">{{ formatDate(invoice.dueDate) }}</span></div>
        </div>

        <div v-if="canSeeCreditNotes && invoice.creditNotes?.length" class="card">
          <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Credits</h2>
          <div class="space-y-2 text-sm">
            <div v-for="c in invoice.creditNotes" :key="c.id" class="flex items-center justify-between gap-2 border-b border-slate-50 dark:border-dark-border pb-1.5 last:border-0">
              <span class="min-w-0">
                <router-link :to="creditNoteLink(c.id)" class="text-brand-600 hover:underline font-medium">{{ c.creditNoteNumber }}</router-link>
                <span class="text-xs text-slate-400"> · {{ creditNoteReasonLabels[c.reason] }}<template v-if="c.status !== CreditNoteStatus.ISSUED"> · {{ creditNoteStatusLabels[c.status] }}</template></span>
              </span>
              <span class="text-right">
                <span class="font-medium text-slate-700 dark:text-slate-200">{{ gbp(c.allocated) }}</span>
                <span v-if="c.allocated < c.gross" class="block text-xs text-slate-400">of {{ gbp(c.gross) }}</span>
              </span>
            </div>
          </div>
          <div class="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-dark-border">
            <span class="text-slate-700 dark:text-slate-200">Net balance</span>
            <span :class="invoice.balance > 0 ? 'text-amber-600' : 'text-green-600'">{{ gbp(invoice.balance) }}</span>
          </div>
        </div>

        <div class="card">
          <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Payments</h2>
          <p v-if="invoice.payments.length === 0" class="text-sm text-slate-400">No payments recorded.</p>
          <div v-else class="space-y-2 text-sm">
            <div v-for="p in invoice.payments" :key="p.id" class="flex justify-between border-b border-slate-50 dark:border-dark-border pb-1.5 last:border-0">
              <span class="text-slate-600 dark:text-slate-300">{{ paymentMethodLabels[p.method] }}<span v-if="p.reference" class="text-xs text-slate-400"> · {{ p.reference }}</span></span>
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ gbp(p.amount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <InvoiceEditModal :open="showEdit" :invoice="invoice" @close="showEdit = false" @saved="(updated) => { invoice = updated }" />
    <CreditNoteFormModal :open="showRaiseCredit" :prefillInvoice="invoice" @close="showRaiseCredit = false" @saved="onCreditRaised" />

    <UiModal :open="showPay" :title="`Record Payment — ${invoice?.invoiceNumber ?? ''}`" @close="showPay = false">
      <div class="space-y-4">
        <UiSelect v-model="payForm.method" label="Method" :options="methodOptions" />
        <UiInput v-model="payForm.amount" label="Amount (£)" type="number" required />
        <UiInput v-model="payForm.reference" label="Reference (optional)" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showPay = false">Cancel</UiButton>
        <UiButton :loading="paySubmitting" @click="submitPay">Record Payment</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
