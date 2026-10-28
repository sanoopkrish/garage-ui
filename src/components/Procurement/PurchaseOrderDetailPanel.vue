<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import GeneralSliderPanel from '@/components/Ui/GeneralSliderPanel.vue'
import ReceiveGoodsModal from '@/components/Procurement/ReceiveGoodsModal.vue'
import { Download, Send, Check, X, Pencil, Trash2, PackageCheck, Ban, Lock, Mail } from 'lucide-vue-next'
import {
  approvePurchaseOrder, deletePurchaseOrder, downloadPurchaseOrderPdf, getGoodsReceiptsForOrder, getPurchaseOrder, orderAction,
  rejectPurchaseOrder, resendPurchaseOrder, type GoodsReceipt, type OrderAction, type PurchaseOrder,
} from '@/api/procurement/purchase-orders.api'
import { getBills, type SupplierBill } from '@/api/procurement/bills.api'
import { PurchaseOrderStatus } from '@/types/generated/enums/procurement'
import {
  apiMessage, billStatusLabels, billStatusVariant, conditionLabels, formatDate, gbp, orderKindLabels, orderStatusLabels, orderStatusVariant,
} from '@/utils/procurement'
import { useProcurementStore } from '@/stores/procurement.store'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/** Purchase order detail slider: items (ordered / received), deliveries, linked supplier invoices and every action */
const props = defineProps<{ modelValue: boolean; orderId: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean]; changed: [] }>()

const router = useRouter()
const procurement = useProcurementStore()
const authStore = useAuthStore()
const { hasPermission: canCreate } = usePermissions('menus.finance.procurement.createOrder')
const { hasPermission: canApprove } = usePermissions('menus.finance.procurement.approveOrder')
const { hasPermission: canReceive } = usePermissions('menus.finance.procurement.receive')

const open = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })
const order = ref<PurchaseOrder | null>(null)
const receipts = ref<GoodsReceipt[]>([])
const bills = ref<SupplierBill[]>([])
const loading = ref(false)
const busy = ref('')
const myUserId = computed(() => (authStore.user as any)?.id ?? null)

const S = PurchaseOrderStatus
const editable = computed(() => !!order.value && [S.DRAFT, S.REJECTED].includes(order.value.status))
const receivable = computed(() => !!order.value && [S.SENT_TO_SUPPLIER, S.PARTIALLY_RECEIVED].includes(order.value.status))
const cancellable = computed(() => !!order.value && [S.DRAFT, S.PENDING_APPROVAL, S.APPROVED, S.REJECTED, S.SENT_TO_SUPPLIER].includes(order.value.status))
const closable = computed(() => !!order.value && [S.PARTIALLY_RECEIVED, S.FULLY_RECEIVED].includes(order.value.status))

async function load() {
  if (!props.orderId) return
  loading.value = true
  try {
    order.value = await getPurchaseOrder(props.orderId)
    const [r, b] = await Promise.all([
      getGoodsReceiptsForOrder(props.orderId).catch(() => []),
      procurement.billsEnabled ? getBills({ purchaseOrderId: props.orderId, pageSize: 50 }).then((x) => x.items).catch(() => []) : Promise.resolve([]),
    ])
    receipts.value = r
    bills.value = b
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to load the order'))
    open.value = false
  } finally {
    loading.value = false
  }
}
watch(() => [props.modelValue, props.orderId], ([isOpen]) => {
  if (!isOpen) return
  order.value = null
  receipts.value = []
  bills.value = []
  load()
}, { immediate: true })

async function changed() {
  await load()
  emit('changed')
}

async function run(action: OrderAction, confirmText: string | null, done: string) {
  if (!order.value) return
  if (confirmText) {
    const result = await showConfirmDialog(confirmText, action === 'cancel', 'Yes')
    if (!result.isConfirmed) return
  }
  busy.value = action
  try {
    const updated = await orderAction(order.value.id, action)
    if (action === 'submit') {
      ToastService.success(updated.status === S.PENDING_APPROVAL ? 'Sent for approval' : 'Order approved — ready to send to the supplier')
    } else if (action === 'send') {
      ToastService.success(updated.emailed ? `Order emailed to ${order.value.supplierEmail}` : 'Marked as sent — the supplier has no email address, so download the PDF and send it yourself')
    } else {
      ToastService.success(done)
    }
    await changed()
  } catch (err) {
    ToastService.error(apiMessage(err, 'That did not work'))
  } finally {
    busy.value = ''
  }
}

async function handleApprove() {
  if (!order.value) return
  const result = await showConfirmDialog(`Approve ${order.value.poNumber} for ${gbp(order.value.grossTotal)}?`, false, 'Approve')
  if (!result.isConfirmed) return
  busy.value = 'approve'
  try {
    await approvePurchaseOrder(order.value.id)
    ToastService.success('Order approved')
    await changed()
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to approve'))
  } finally {
    busy.value = ''
  }
}

const showReject = ref(false)
const rejectReason = ref('')
async function submitReject() {
  if (!order.value || rejectReason.value.trim().length < 3) return
  busy.value = 'reject'
  try {
    await rejectPurchaseOrder(order.value.id, rejectReason.value.trim())
    ToastService.success('Order rejected')
    showReject.value = false
    await changed()
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to reject'))
  } finally {
    busy.value = ''
  }
}

async function handleResend() {
  if (!order.value) return
  busy.value = 'resend'
  try {
    const result = await resendPurchaseOrder(order.value.id)
    ToastService.success(result.sent ? `Order emailed to ${result.email}` : 'The email could not be sent')
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to send the email'))
  } finally {
    busy.value = ''
  }
}

async function handleDelete() {
  if (!order.value) return
  const result = await showConfirmDialog(`Delete draft ${order.value.poNumber}?`, true, 'Delete')
  if (!result.isConfirmed) return
  try {
    await deletePurchaseOrder(order.value.id)
    ToastService.success('Draft deleted')
    open.value = false
    emit('changed')
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to delete'))
  }
}

async function handlePdf() {
  if (!order.value) return
  try { await downloadPurchaseOrderPdf(order.value) } catch { ToastService.error('Failed to download the PDF') }
}

const showReceive = ref(false)
</script>

<template>
  <GeneralSliderPanel v-model="open" :title="order?.poNumber ?? 'Purchase order'" :subtitle="order ? `${order.supplierName ?? ''} · ${orderKindLabels[order.kind] ?? order.kind}` : ''" size="lg">
    <div v-if="loading && !order" class="h-40 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />
    <div v-else-if="order" class="space-y-5">
      <div class="flex flex-wrap items-center gap-2">
        <UiBadge :variant="(orderStatusVariant[order.status] as any)" dot>{{ orderStatusLabels[order.status] }}</UiBadge>
        <span class="ml-auto text-xs text-slate-400">Created {{ formatDate(order.createdAt) }}</span>
      </div>

      <div v-if="order.status === S.REJECTED && order.rejectionReason" class="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
        Rejected: {{ order.rejectionReason }}. Edit the order and submit it again.
      </div>
      <div v-if="order.status === S.PENDING_APPROVAL" class="rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
        Over the {{ gbp(procurement.settings?.poApprovalThreshold) }} approval limit — waiting for a manager to approve it.
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-2">
        <template v-if="canCreate">
          <UiButton v-if="editable" variant="secondary" size="sm" @click="router.push(`/procurement/orders/${order.id}/edit`)"><Pencil class="w-3.5 h-3.5" /> Edit</UiButton>
          <UiButton v-if="order.status === S.DRAFT" size="sm" :loading="busy === 'submit'" @click="run('submit', null, '')"><Check class="w-3.5 h-3.5" /> Submit</UiButton>
          <UiButton v-if="order.status === S.APPROVED" size="sm" :loading="busy === 'send'" @click="run('send', order.supplierEmail ? `Email ${order.poNumber} to ${order.supplierEmail}?` : `Mark ${order.poNumber} as sent to the supplier?`, '')"><Send class="w-3.5 h-3.5" /> Send to supplier</UiButton>
          <UiButton v-if="receivable && order.supplierEmail" variant="secondary" size="sm" :loading="busy === 'resend'" @click="handleResend"><Mail class="w-3.5 h-3.5" /> Email again</UiButton>
        </template>
        <template v-if="canApprove && order.status === S.PENDING_APPROVAL && order.requestedById !== myUserId">
          <UiButton size="sm" :loading="busy === 'approve'" @click="handleApprove"><Check class="w-3.5 h-3.5" /> Approve</UiButton>
          <UiButton variant="danger" size="sm" @click="showReject = true; rejectReason = ''"><X class="w-3.5 h-3.5" /> Reject</UiButton>
        </template>
        <UiButton v-if="canReceive && receivable" size="sm" @click="showReceive = true"><PackageCheck class="w-3.5 h-3.5" /> Book in delivery</UiButton>
        <UiButton variant="secondary" size="sm" @click="handlePdf"><Download class="w-3.5 h-3.5" /> PDF</UiButton>
        <template v-if="canCreate">
          <UiButton v-if="closable" variant="secondary" size="sm" :loading="busy === 'close'" @click="run('close', 'Close this order? Nothing more is expected on it.', 'Order closed')"><Lock class="w-3.5 h-3.5" /> Close</UiButton>
          <UiButton v-if="cancellable && order.status !== S.DRAFT" variant="secondary" size="sm" :loading="busy === 'cancel'" @click="run('cancel', `Cancel ${order.poNumber}?`, 'Order cancelled')"><Ban class="w-3.5 h-3.5" /> Cancel order</UiButton>
          <UiButton v-if="order.status === S.DRAFT" variant="danger" size="sm" @click="handleDelete"><Trash2 class="w-3.5 h-3.5" /> Delete</UiButton>
        </template>
      </div>

      <div class="grid grid-cols-2 gap-3 text-sm">
        <div><p class="text-xs text-slate-400">Supplier</p><p class="text-slate-700 dark:text-slate-200">{{ order.supplierName }}</p></div>
        <div><p class="text-xs text-slate-400">Sent to supplier</p><p class="text-slate-700 dark:text-slate-200">{{ formatDate(order.orderDate) }}</p></div>
        <div><p class="text-xs text-slate-400">Delivery expected</p><p class="text-slate-700 dark:text-slate-200">{{ formatDate(order.expectedDeliveryDate) }}</p></div>
        <div><p class="text-xs text-slate-400">Deliver to</p><p class="text-slate-700 dark:text-slate-200">{{ order.deliverTo || '—' }}</p></div>
        <div v-if="order.jobId"><p class="text-xs text-slate-400">Job</p>
          <router-link :to="`/jobs/${order.jobId}`" class="text-brand-600 hover:underline">{{ order.jobNumber }}</router-link></div>
        <div v-if="order.paymentTerms"><p class="text-xs text-slate-400">Payment terms</p><p class="text-slate-700 dark:text-slate-200">{{ order.paymentTerms }}</p></div>
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 dark:border-dark-border">
            <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Item</th>
            <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Ordered</th>
            <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Received</th>
            <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Unit</th>
            <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Net</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
          <tr v-for="item in order.items" :key="item.id">
            <td class="py-2.5 text-slate-700 dark:text-slate-200">{{ item.description }}<span v-if="item.partNumber" class="block text-xs text-slate-400">{{ item.partNumber }}</span></td>
            <td class="py-2.5 text-right text-slate-500">{{ item.quantity }}</td>
            <td class="py-2.5 text-right" :class="item.receivedQuantity >= item.quantity ? 'text-green-600 font-medium' : item.receivedQuantity > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'">{{ item.receivedQuantity }}</td>
            <td class="py-2.5 text-right text-slate-500">{{ gbp(item.unitPrice) }}</td>
            <td class="py-2.5 text-right font-medium text-slate-700 dark:text-slate-200">{{ gbp(item.totalPrice) }}</td>
          </tr>
        </tbody>
        <tfoot class="text-sm">
          <tr><td colspan="4" class="pt-3 text-right text-slate-500">Net</td><td class="pt-3 text-right text-slate-700 dark:text-slate-200">{{ gbp(order.totalAmount) }}</td></tr>
          <tr><td colspan="4" class="text-right text-slate-500">VAT</td><td class="text-right text-slate-700 dark:text-slate-200">{{ gbp(order.taxAmount) }}</td></tr>
          <tr v-if="order.shippingCost > 0"><td colspan="4" class="text-right text-slate-500">Delivery</td><td class="text-right text-slate-700 dark:text-slate-200">{{ gbp(order.shippingCost) }}</td></tr>
          <tr><td colspan="4" class="pt-1 text-right font-semibold text-slate-700 dark:text-slate-200">Total</td><td class="pt-1 text-right font-semibold text-slate-800 dark:text-slate-100">{{ gbp(order.grossTotal) }}</td></tr>
        </tfoot>
      </table>

      <p v-if="order.notes" class="text-sm text-slate-500 whitespace-pre-line">{{ order.notes }}</p>

      <div v-if="receipts.length">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Deliveries booked in</p>
        <div v-for="receipt in receipts" :key="receipt.id" class="rounded-lg border border-slate-100 dark:border-dark-border p-3 mb-2 text-sm">
          <div class="flex items-center gap-2">
            <span class="font-medium text-slate-700 dark:text-slate-200">{{ receipt.grnNumber }}</span>
            <span class="text-xs text-slate-400">{{ formatDate(receipt.receivedDate) }}{{ receipt.receivedByName ? ` · ${receipt.receivedByName}` : '' }}{{ receipt.deliveryNoteRef ? ` · delivery note ${receipt.deliveryNoteRef}` : '' }}</span>
          </div>
          <ul class="mt-1.5 space-y-0.5 text-slate-500">
            <li v-for="item in receipt.items" :key="item.id">
              {{ item.quantityAccepted }} × {{ item.itemDescription }}
              <span v-if="item.quantityRejected > 0" class="text-red-500"> · {{ item.quantityRejected }} rejected ({{ conditionLabels[item.condition] ?? item.condition }}{{ item.remarks ? `: ${item.remarks}` : '' }})</span>
            </li>
          </ul>
        </div>
      </div>

      <div v-if="procurement.billsEnabled && bills.length">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Supplier invoices for this order</p>
        <ul class="divide-y divide-slate-50 dark:divide-dark-border text-sm">
          <li v-for="b in bills" :key="b.id" class="flex items-center gap-3 py-2">
            <button class="font-medium text-brand-600 hover:underline" @click="router.push(`/procurement/bills?open=${b.id}`)">{{ b.invoiceNumber }}</button>
            <UiBadge :variant="(billStatusVariant[b.status] as any)">{{ billStatusLabels[b.status] }}</UiBadge>
            <span class="text-xs text-slate-400">{{ formatDate(b.invoiceDate) }}</span>
            <span class="ml-auto text-slate-600 dark:text-slate-300">{{ gbp(b.total) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <ReceiveGoodsModal :open="showReceive" :order="order" @close="showReceive = false" @saved="changed" />

    <UiModal :open="showReject" title="Reject purchase order" @close="showReject = false">
      <p class="text-sm text-slate-500 mb-3">{{ order?.poNumber }} goes back to the person who raised it with your reason.</p>
      <textarea v-model="rejectReason" rows="3" placeholder="Reason for rejecting (required)…"
        class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
      <template #footer>
        <UiButton variant="ghost" @click="showReject = false">Cancel</UiButton>
        <UiButton variant="danger" :loading="busy === 'reject'" :disabled="rejectReason.trim().length < 3" @click="submitReject">Reject</UiButton>
      </template>
    </UiModal>
  </GeneralSliderPanel>
</template>
