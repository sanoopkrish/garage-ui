<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import GeneralSliderPanel from '@/components/Ui/GeneralSliderPanel.vue'
import BillFormModal from '@/components/Procurement/BillFormModal.vue'
import { Check, Pencil, FileText, Upload, AlertTriangle, RotateCcw, Ban, PoundSterling, RefreshCw } from 'lucide-vue-next'
import {
  approveBill, attachBillDocument, billAction, disputeBill, getBill, recordBillPayment, type BillDocument, type SupplierBill,
} from '@/api/procurement/bills.api'
import { getViewUrl, uploadTemporary } from '@/api/files.api'
import { SupplierInvoiceMatchStatus, SupplierInvoiceStatus } from '@/types/generated/enums/procurement'
import { PaymentMethod } from '@/types/generated/enums/invoice'
import { apiMessage, billStatusLabels, billStatusVariant, formatDate, gbp, todayIso } from '@/utils/procurement'
import { useProcurementStore } from '@/stores/procurement.store'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/** Supplier invoice detail slider: document, order match, approve / dispute / void, payments */
const props = defineProps<{ modelValue: boolean; billId: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean]; changed: [] }>()

const router = useRouter()
const procurement = useProcurementStore()
const { hasPermission: canManage } = usePermissions('menus.finance.procurement.manageBills')
const { hasPermission: canPay } = usePermissions('menus.finance.procurement.payBills')

const open = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })
const bill = ref<SupplierBill | null>(null)
const loading = ref(false)
const busy = ref('')
const S = SupplierInvoiceStatus
const M = SupplierInvoiceMatchStatus
const undecided = computed(() => !!bill.value && [S.RECEIVED, S.MATCHED].includes(bill.value.status))
const editable = computed(() => !!bill.value && [S.RECEIVED, S.MATCHED, S.DISPUTED].includes(bill.value.status))

async function load() {
  if (!props.billId) return
  loading.value = true
  try {
    bill.value = await getBill(props.billId)
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to load the supplier invoice'))
    open.value = false
  } finally {
    loading.value = false
  }
}
watch(() => [props.modelValue, props.billId], ([isOpen]) => {
  if (!isOpen) return
  bill.value = null
  load()
}, { immediate: true })

function apply(updated: SupplierBill) {
  bill.value = updated
  emit('changed')
}

async function openDocument(doc: BillDocument) {
  try {
    window.open(await getViewUrl(doc.s3Key, doc.fileType), '_blank', 'noopener')
  } catch {
    ToastService.error('Failed to open the file')
  }
}

const fileInput = ref<HTMLInputElement | null>(null)
async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !bill.value) return
  if (file.size > 10 * 1024 * 1024) { ToastService.error('The file is larger than 10 MB'); return }
  busy.value = 'upload'
  try {
    apply(await attachBillDocument(bill.value.id, await uploadTemporary(file)))
    ToastService.success('File attached')
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to upload the file'))
  } finally {
    busy.value = ''
  }
}

// Approve — a note is required when the invoice does not match its orders
const showApprove = ref(false)
const approveNote = ref('')
async function handleApprove() {
  if (!bill.value) return
  if (bill.value.matchStatus !== M.MATCHED) { approveNote.value = ''; showApprove.value = true; return }
  const result = await showConfirmDialog(`Approve invoice ${bill.value.invoiceNumber} for ${gbp(bill.value.total)}?`, false, 'Approve')
  if (result.isConfirmed) await submitApprove()
}
async function submitApprove() {
  if (!bill.value) return
  busy.value = 'approve'
  try {
    apply(await approveBill(bill.value.id, approveNote.value.trim() || undefined))
    ToastService.success('Invoice approved')
    showApprove.value = false
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to approve'))
  } finally {
    busy.value = ''
  }
}

const showDispute = ref(false)
const disputeNote = ref('')
async function submitDispute() {
  if (!bill.value || disputeNote.value.trim().length < 3) return
  busy.value = 'dispute'
  try {
    apply(await disputeBill(bill.value.id, disputeNote.value.trim()))
    ToastService.success('Marked as disputed')
    showDispute.value = false
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to dispute'))
  } finally {
    busy.value = ''
  }
}

async function run(action: 'match' | 'resolve-dispute' | 'void' | 'sync', confirmText: string | null, done: string) {
  if (!bill.value) return
  if (confirmText) {
    const result = await showConfirmDialog(confirmText, action === 'void', 'Yes')
    if (!result.isConfirmed) return
  }
  busy.value = action
  try {
    apply(await billAction(bill.value.id, action))
    ToastService.success(done)
  } catch (err) {
    ToastService.error(apiMessage(err, 'That did not work'))
  } finally {
    busy.value = ''
  }
}

// Payment (only with supplier payments switched on)
const showPay = ref(false)
const payment = reactive({ method: PaymentMethod.BANK_TRANSFER as PaymentMethod, amount: '' as string | number, paidAt: todayIso(), reference: '' })
const methodOptions = [
  { value: PaymentMethod.BANK_TRANSFER, label: 'Bank transfer' },
  { value: PaymentMethod.CARD, label: 'Card' },
  { value: PaymentMethod.CASH, label: 'Cash' },
]
function openPay() {
  if (!bill.value) return
  Object.assign(payment, { method: PaymentMethod.BANK_TRANSFER, amount: bill.value.balance, paidAt: todayIso(), reference: '' })
  showPay.value = true
}
async function submitPay() {
  if (!bill.value || !(Number(payment.amount) > 0)) return
  busy.value = 'pay'
  try {
    apply(await recordBillPayment(bill.value.id, {
      method: payment.method, amount: Number(payment.amount), paidAt: payment.paidAt || undefined, reference: payment.reference.trim() || undefined,
    }))
    ToastService.success('Payment recorded')
    showPay.value = false
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to record the payment'))
  } finally {
    busy.value = ''
  }
}

const showEdit = ref(false)
const textareaClass = 'w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
</script>

<template>
  <GeneralSliderPanel v-model="open" :title="bill ? `Invoice ${bill.invoiceNumber}` : 'Supplier invoice'" :subtitle="bill?.supplierName ?? ''" size="lg">
    <div v-if="loading && !bill" class="h-40 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />
    <div v-else-if="bill" class="space-y-5">
      <div class="flex flex-wrap items-center gap-2">
        <UiBadge :variant="(billStatusVariant[bill.status] as any)" dot>{{ billStatusLabels[bill.status] }}</UiBadge>
        <UiBadge v-if="bill.isOverdue" variant="cancelled">Overdue</UiBadge>
        <UiBadge v-if="bill.captureSource === 'field'" variant="info">Field receipt</UiBadge>
        <UiBadge v-if="bill.accountingSyncStatus === 'synced'" variant="done">Xero ✓</UiBadge>
        <UiBadge v-else-if="bill.accountingSyncStatus === 'error'" variant="cancelled" :title="bill.accountingSyncError ?? ''">Xero failed</UiBadge>
        <span class="ml-auto text-xs text-slate-400">Entered {{ formatDate(bill.createdAt) }}</span>
      </div>

      <!-- Match result -->
      <div v-if="bill.status !== S.VOID" :class="['rounded-lg px-3 py-2 text-sm',
        bill.matchStatus === M.MATCHED ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
        : bill.matchStatus === M.VARIANCE ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
        : 'bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-slate-300']">
        <template v-if="bill.matchStatus === M.MATCHED">Matches what was received on its order ({{ gbp(bill.expectedAmount) }}).</template>
        <template v-else-if="bill.matchStatus === M.VARIANCE">
          <AlertTriangle class="inline w-4 h-4 -mt-0.5" />
          This invoice is {{ gbp(Math.abs(bill.varianceAmount)) }} {{ bill.varianceAmount > 0 ? 'more' : 'less' }} than the {{ gbp(bill.expectedAmount) }} received on its order and not yet invoiced.
        </template>
        <template v-else>Not linked to an order, so there is nothing to check it against.</template>
      </div>
      <p v-if="bill.accountingSyncStatus === 'error' && bill.accountingSyncError" class="text-xs text-red-500">Xero: {{ bill.accountingSyncError }}</p>
      <p v-if="bill.captureSource === 'field' && editable" class="rounded-lg bg-purple-50 dark:bg-purple-900/20 px-3 py-2 text-sm text-purple-700 dark:text-purple-300">
        Sent in from the field app. Edit it to set the supplier, the invoice number printed on the receipt and the net / VAT split before approving.
      </p>
      <p v-if="bill.status === S.DISPUTED && bill.disputeNote" class="text-sm text-red-600">Disputed: {{ bill.disputeNote }}</p>
      <p v-if="bill.approvalNote" class="text-sm text-slate-500">Approval note: {{ bill.approvalNote }}</p>

      <!-- Actions -->
      <div class="flex flex-wrap gap-2">
        <template v-if="canManage">
          <UiButton v-if="undecided" size="sm" :loading="busy === 'approve'" @click="handleApprove"><Check class="w-3.5 h-3.5" /> Approve</UiButton>
          <UiButton v-if="undecided" variant="secondary" size="sm" @click="showDispute = true; disputeNote = ''"><AlertTriangle class="w-3.5 h-3.5" /> Dispute</UiButton>
          <UiButton v-if="bill.status === S.DISPUTED" size="sm" :loading="busy === 'resolve-dispute'" @click="run('resolve-dispute', null, 'Dispute settled — invoice checked again')"><RotateCcw class="w-3.5 h-3.5" /> Dispute settled</UiButton>
          <UiButton v-if="editable" variant="secondary" size="sm" @click="showEdit = true"><Pencil class="w-3.5 h-3.5" /> Edit</UiButton>
          <UiButton v-if="undecided" variant="secondary" size="sm" :loading="busy === 'match'" @click="run('match', null, 'Checked against the order again')"><RefreshCw class="w-3.5 h-3.5" /> Check again</UiButton>
        </template>
        <UiButton v-if="canPay && procurement.billPaymentsEnabled && bill.status === S.APPROVED" size="sm" @click="openPay"><PoundSterling class="w-3.5 h-3.5" /> Record payment</UiButton>
        <UiButton v-if="canManage && [S.APPROVED, S.PAID].includes(bill.status) && bill.accountingSyncStatus !== 'synced'" variant="secondary" size="sm" :loading="busy === 'sync'" @click="run('sync', null, 'Sent to Xero')"><RefreshCw class="w-3.5 h-3.5" /> {{ bill.accountingSyncStatus === 'error' ? 'Retry Xero' : 'Send to Xero' }}</UiButton>
        <UiButton v-if="canManage && bill.status !== S.VOID && !bill.payments.length" variant="secondary" size="sm" :loading="busy === 'void'" @click="run('void', `Void invoice ${bill.invoiceNumber}? Use this when it was entered by mistake.`, 'Invoice voided')"><Ban class="w-3.5 h-3.5" /> Void</UiButton>
      </div>

      <div class="grid grid-cols-2 gap-3 text-sm">
        <div><p class="text-xs text-slate-400">Invoice date</p><p class="text-slate-700 dark:text-slate-200">{{ formatDate(bill.invoiceDate) }}</p></div>
        <div><p class="text-xs text-slate-400">Due</p><p :class="bill.isOverdue ? 'text-red-600 font-medium' : 'text-slate-700 dark:text-slate-200'">{{ formatDate(bill.dueDate) }}</p></div>
        <div><p class="text-xs text-slate-400">Net</p><p class="text-slate-700 dark:text-slate-200">{{ gbp(bill.subtotal) }}</p></div>
        <div><p class="text-xs text-slate-400">VAT</p><p class="text-slate-700 dark:text-slate-200">{{ gbp(bill.taxAmount) }}</p></div>
        <div><p class="text-xs text-slate-400">Total</p><p class="text-lg font-semibold text-slate-800 dark:text-slate-100">{{ gbp(bill.total) }}</p></div>
        <div v-if="procurement.billPaymentsEnabled || bill.payments.length"><p class="text-xs text-slate-400">Still to pay</p><p class="text-lg font-semibold text-slate-800 dark:text-slate-100">{{ gbp(bill.balance) }}</p></div>
      </div>
      <p v-if="bill.notes" class="text-sm text-slate-500 whitespace-pre-line">{{ bill.notes }}</p>

      <!-- Documents -->
      <div>
        <div class="flex items-center mb-2">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Supplier's invoice</p>
          <UiButton v-if="canManage && bill.status !== S.VOID" variant="secondary" size="sm" class="ml-auto" :loading="busy === 'upload'" @click="fileInput?.click()"><Upload class="w-3.5 h-3.5" /> Upload</UiButton>
          <input ref="fileInput" type="file" class="hidden" accept="application/pdf,image/jpeg,image/png,image/webp" @change="onFile" />
        </div>
        <p v-if="!bill.documents.length" class="text-sm text-slate-400">No file uploaded yet.</p>
        <ul v-else class="space-y-1.5">
          <li v-for="doc in bill.documents" :key="doc.id">
            <button class="flex items-center gap-2 w-full rounded-lg border border-slate-100 dark:border-dark-border px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-white/5" @click="openDocument(doc)">
              <FileText class="w-4 h-4 text-brand-500" />
              <span class="text-slate-700 dark:text-slate-200 truncate">{{ doc.fileName }}</span>
              <span class="ml-auto text-xs text-slate-400">{{ formatDate(doc.uploadedAt) }}</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- Orders -->
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">For orders</p>
        <p v-if="!bill.allocations.length" class="text-sm text-slate-400">Not linked to an order. Edit the invoice to link one.</p>
        <ul v-else class="divide-y divide-slate-50 dark:divide-dark-border text-sm">
          <li v-for="a in bill.allocations" :key="a.id" class="flex items-center gap-3 py-2">
            <button class="font-medium text-brand-600 hover:underline" @click="router.push(a.orderType === 'purchase' ? `/procurement/orders?open=${a.purchaseOrderId}` : '/inventory')">{{ a.orderNumber }}</button>
            <span class="text-xs text-slate-400">{{ a.orderType === 'parts' ? 'Job parts order' : 'Purchase order' }}</span>
            <span class="ml-auto text-slate-600 dark:text-slate-300">{{ gbp(a.amount) }}</span>
          </li>
        </ul>
      </div>

      <!-- Payments -->
      <div v-if="bill.payments.length">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Payments</p>
        <ul class="divide-y divide-slate-50 dark:divide-dark-border text-sm">
          <li v-for="p in bill.payments" :key="p.id" class="flex items-center gap-3 py-2">
            <span class="text-slate-700 dark:text-slate-200">{{ formatDate(p.paidAt) }}</span>
            <span class="text-xs text-slate-400">{{ methodOptions.find((m) => m.value === p.method)?.label ?? p.method }}{{ p.reference ? ` · ${p.reference}` : '' }}</span>
            <span class="ml-auto text-slate-600 dark:text-slate-300">{{ gbp(p.amount) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <BillFormModal :open="showEdit" :bill="bill" @close="showEdit = false" @saved="apply" />

    <UiModal :open="showApprove" title="Approve an invoice that does not match" @close="showApprove = false">
      <p class="text-sm text-slate-500 mb-3">
        {{ bill?.matchStatus === M.VARIANCE
          ? `This invoice is ${gbp(Math.abs(bill?.varianceAmount ?? 0))} ${(bill?.varianceAmount ?? 0) > 0 ? 'more' : 'less'} than its order.`
          : 'This invoice is not linked to an order.' }}
        Say why it is right to pay it.
      </p>
      <textarea v-model="approveNote" rows="3" placeholder="Reason (required)…" :class="textareaClass" />
      <template #footer>
        <UiButton variant="ghost" @click="showApprove = false">Cancel</UiButton>
        <UiButton :loading="busy === 'approve'" :disabled="approveNote.trim().length < 3" @click="submitApprove">Approve anyway</UiButton>
      </template>
    </UiModal>

    <UiModal :open="showDispute" title="Dispute this invoice" @close="showDispute = false">
      <p class="text-sm text-slate-500 mb-3">The invoice is held back from approval until the dispute is settled.</p>
      <textarea v-model="disputeNote" rows="3" placeholder="What is wrong with it? (required)…" :class="textareaClass" />
      <template #footer>
        <UiButton variant="ghost" @click="showDispute = false">Cancel</UiButton>
        <UiButton variant="danger" :loading="busy === 'dispute'" :disabled="disputeNote.trim().length < 3" @click="submitDispute">Dispute</UiButton>
      </template>
    </UiModal>

    <UiModal :open="showPay" title="Record payment to supplier" @close="showPay = false">
      <div class="space-y-4">
        <p class="text-sm text-slate-500">{{ gbp(bill?.balance) }} still to pay on invoice {{ bill?.invoiceNumber }}.</p>
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="payment.amount" label="Amount £" type="number" required />
          <UiSelect v-model="payment.method" label="Paid by" :options="methodOptions" />
          <UiInput v-model="payment.paidAt" label="Date paid" type="date" />
          <UiInput v-model="payment.reference" label="Reference" />
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showPay = false">Cancel</UiButton>
        <UiButton :loading="busy === 'pay'" :disabled="!(Number(payment.amount) > 0)" @click="submitPay">Record payment</UiButton>
      </template>
    </UiModal>
  </GeneralSliderPanel>
</template>
