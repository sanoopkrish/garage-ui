<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import { Upload, FileText, X, Sparkles } from 'lucide-vue-next'
import { captureBill, createBill, updateBill, type SupplierBill } from '@/api/procurement/bills.api'
import { getCombinedOrders, type CombinedOrderRow } from '@/api/procurement/purchase-orders.api'
import { uploadTemporary } from '@/api/files.api'
import { apiMessage, formatDate, gbp, orderStatusLabels, todayIso } from '@/utils/procurement'
import { useProcurementStore } from '@/stores/procurement.store'
import { ToastService } from '@/services/toast.service'

/**
 * Add / edit a supplier invoice: upload the supplier's PDF or photo, enter the figures and
 * say which order(s) it is for. Orders offered are the chosen supplier's, placed and not cancelled.
 */
const props = defineProps<{ open: boolean; bill?: SupplierBill | null; presetSupplierId?: string; presetOrder?: { id: string; type: 'purchase' | 'parts' } | null }>()
const emit = defineEmits<{ close: []; saved: [bill: SupplierBill] }>()
const procurement = useProcurementStore()

const isEdit = computed(() => !!props.bill)
const saving = ref(false)
const errors = reactive({ supplierId: '', invoiceNumber: '', invoiceDate: '' })
const form = reactive({ supplierId: '', invoiceNumber: '', invoiceDate: todayIso(), dueDate: '', subtotal: '' as string | number, taxAmount: '' as string | number, notes: '' })
const total = computed(() => Math.round(((Number(form.subtotal) || 0) + (Number(form.taxAmount) || 0)) * 100) / 100)

// Document upload (two-stage: straight to storage, then attached on save)
const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const file = ref<File | null>(null)
const dragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
function pick(f: File | undefined | null) {
  if (!f) return
  if (!ACCEPT.includes(f.type)) { ToastService.error('Upload a PDF or a photo (JPG, PNG)'); return }
  if (f.size > 10 * 1024 * 1024) { ToastService.error('The file is larger than 10 MB'); return }
  file.value = f
  uploadedKey.value = null
  readWarnings.value = []
  if (procurement.aiInvoiceCapture) readInvoice()
}

// AI reading (the "Supplier invoice reading" AI feature): fills the form in for the user to CHECK — nothing is saved
const uploadedKey = ref<string | null>(null)
const reading = ref(false)
const readWarnings = ref<string[]>([])
const wasRead = ref(false)
async function readInvoice() {
  if (!file.value) return
  reading.value = true
  wasRead.value = false
  try {
    uploadedKey.value = await uploadTemporary(file.value)
    const draft = await captureBill(uploadedKey.value)
    if (draft.supplierId) { form.supplierId = draft.supplierId; await loadOrders() }
    if (draft.invoiceNumber) form.invoiceNumber = draft.invoiceNumber
    if (draft.invoiceDate) form.invoiceDate = draft.invoiceDate
    if (draft.dueDate) form.dueDate = draft.dueDate
    if (draft.subtotal !== null) form.subtotal = draft.subtotal
    if (draft.taxAmount !== null) form.taxAmount = draft.taxAmount
    // tick an order whose number is printed on the invoice
    for (const order of orders.value) if (draft.orderNumbers.includes(order.number.toUpperCase())) order.selected = true
    readWarnings.value = draft.warnings
    wasRead.value = true
  } catch (err) {
    readWarnings.value = [apiMessage(err, 'The invoice could not be read — enter the details by hand')]
  } finally {
    reading.value = false
  }
}

// Orders this invoice can be for
interface Pick { id: string; type: 'purchase' | 'parts'; number: string; label: string; selected: boolean; amount: number | string }
const orders = ref<Pick[]>([])
const ordersLoading = ref(false)
const selected = computed(() => orders.value.filter((o) => o.selected))
const allocated = computed(() => Math.round(selected.value.reduce((s, o) => s + (Number(o.amount) || 0), 0) * 100) / 100)
const NOT_PLACED = ['draft', 'pending_approval', 'rejected', 'cancelled']

async function loadOrders() {
  orders.value = []
  if (!form.supplierId) return
  ordersLoading.value = true
  try {
    const { items } = await getCombinedOrders({ supplierId: form.supplierId, pageSize: 50 })
    const existing = new Map((props.bill?.allocations ?? []).map((a) => [a.purchaseOrderId ?? a.partsOrderId, a.amount]))
    orders.value = items
      .filter((o: CombinedOrderRow) => !NOT_PLACED.includes(o.status) || existing.has(o.id))
      .map((o) => ({
        id: o.id, type: o.type, number: o.number,
        label: `${o.number} · ${orderStatusLabels[o.status] ?? o.status} · ${formatDate(o.createdAt)} · ${gbp(o.grossTotal)}${o.type === 'parts' ? ' net' : ''}`,
        selected: existing.has(o.id) || props.presetOrder?.id === o.id,
        amount: existing.get(o.id) ?? '',
      }))
  } catch {
    ToastService.error('Failed to load this supplier\'s orders')
  } finally {
    ordersLoading.value = false
  }
}

/** One order ticked and no amount typed → it takes the whole invoice */
function toggle(order: Pick) {
  order.selected = !order.selected
  if (!order.selected) order.amount = ''
}

watch(() => props.open, async (open) => {
  if (!open) return
  file.value = null
  uploadedKey.value = null
  readWarnings.value = []
  wasRead.value = false
  await procurement.fetchSettings()
  errors.supplierId = ''; errors.invoiceNumber = ''; errors.invoiceDate = ''
  if (!procurement.suppliers.length) await procurement.fetchSuppliers().catch(() => {})
  const b = props.bill
  Object.assign(form, b
    ? { supplierId: b.supplierId, invoiceNumber: b.invoiceNumber, invoiceDate: b.invoiceDate.slice(0, 10), dueDate: b.dueDate?.slice(0, 10) ?? '', subtotal: b.subtotal, taxAmount: b.taxAmount, notes: b.notes ?? '' }
    : { supplierId: props.presetSupplierId ?? '', invoiceNumber: '', invoiceDate: todayIso(), dueDate: '', subtotal: '', taxAmount: '', notes: '' })
  await loadOrders()
})

async function save() {
  errors.supplierId = form.supplierId ? '' : 'Choose the supplier'
  errors.invoiceNumber = form.invoiceNumber.trim() ? '' : 'Enter the number printed on the invoice'
  errors.invoiceDate = form.invoiceDate ? '' : 'Enter the invoice date'
  if (errors.supplierId || errors.invoiceNumber || errors.invoiceDate) return
  if (!(total.value > 0)) { ToastService.error('Enter the invoice amounts'); return }

  const picks = selected.value
  const allocations = picks.map((o) => ({
    ...(o.type === 'purchase' ? { purchaseOrderId: o.id } : { partsOrderId: o.id }),
    amount: picks.length === 1 && !Number(o.amount) ? total.value : Number(o.amount) || 0,
  }))
  if (allocations.some((a) => !(a.amount > 0))) { ToastService.error('Enter how much of the invoice is for each ticked order'); return }
  if (allocations.reduce((s, a) => s + a.amount, 0) > total.value + 0.005) { ToastService.error('The amounts against orders add up to more than the invoice total'); return }

  saving.value = true
  try {
    let saved: SupplierBill
    if (props.bill) {
      saved = await updateBill(props.bill.id, {
        ...(form.supplierId !== props.bill.supplierId ? { supplierId: form.supplierId } : {}),
        invoiceNumber: form.invoiceNumber.trim(), invoiceDate: form.invoiceDate, dueDate: form.dueDate || undefined,
        subtotal: Number(form.subtotal) || 0, taxAmount: Number(form.taxAmount) || 0, total: total.value, notes: form.notes.trim(), allocations,
      })
    } else {
      const s3Key = file.value ? (uploadedKey.value ?? await uploadTemporary(file.value)) : undefined
      saved = await createBill({
        supplierId: form.supplierId, invoiceNumber: form.invoiceNumber.trim(), invoiceDate: form.invoiceDate, dueDate: form.dueDate || undefined,
        subtotal: Number(form.subtotal) || 0, taxAmount: Number(form.taxAmount) || 0, notes: form.notes.trim() || undefined, s3Key, allocations,
      })
      if (file.value && !saved.documents.length) ToastService.error('The invoice was saved but the file did not attach — add it again from the invoice')
    }
    ToastService.success(props.bill ? 'Supplier invoice updated' : `Invoice ${saved.invoiceNumber} added`)
    emit('saved', saved)
    emit('close')
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to save the supplier invoice'))
  } finally {
    saving.value = false
  }
}

const inputClass = 'w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
</script>

<template>
  <UiModal :open="open" :title="isEdit ? `Edit invoice ${bill?.invoiceNumber}` : 'Add supplier invoice'" size="lg" @close="emit('close')">
    <div class="space-y-4">
      <!-- Upload -->
      <div v-if="!isEdit">
        <div
          v-if="!file"
          :class="['flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-sm cursor-pointer transition-colors',
            dragging ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/10' : 'border-slate-200 dark:border-dark-border text-slate-500 hover:border-brand-300']"
          @click="fileInput?.click()"
          @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false"
          @drop.prevent="dragging = false; pick($event.dataTransfer?.files?.[0])"
        >
          <Upload class="w-5 h-5 text-slate-400" />
          <span>Drop the supplier's invoice here, or click to choose it</span>
          <span class="text-xs text-slate-400">PDF or photo, up to 10 MB</span>
        </div>
        <div v-else class="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-dark-border px-3 py-2 text-sm">
          <FileText class="w-4 h-4 text-brand-500" />
          <span class="text-slate-700 dark:text-slate-200 truncate">{{ file.name }}</span>
          <span class="text-xs text-slate-400">{{ Math.max(1, Math.round(file.size / 1024)) }} KB</span>
          <button type="button" class="ml-auto p-1 text-slate-400 hover:text-red-500" title="Remove file" @click="file = null; uploadedKey = null; readWarnings = []; wasRead = false"><X class="w-4 h-4" /></button>
        </div>
        <p v-if="reading" class="mt-2 flex items-center gap-1.5 text-sm text-brand-600"><Sparkles class="w-4 h-4 animate-pulse" /> Reading the invoice…</p>
        <div v-else-if="wasRead || readWarnings.length" class="mt-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          <p v-if="wasRead" class="font-medium">Filled in from the document — check every figure against the invoice before adding it.</p>
          <ul v-if="readWarnings.length" class="list-disc ml-5 mt-1"><li v-for="warning in readWarnings" :key="warning">{{ warning }}</li></ul>
        </div>
        <input ref="fileInput" type="file" class="hidden" accept="application/pdf,image/jpeg,image/png,image/webp" @change="pick(($event.target as HTMLInputElement).files?.[0]); ($event.target as HTMLInputElement).value = ''" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiSelect v-model="form.supplierId" label="Supplier" :options="procurement.supplierOptions" placeholder="Choose the supplier" required :disabled="isEdit && bill?.captureSource !== 'field'" :error="errors.supplierId" @update:modelValue="loadOrders" />
        <UiInput v-model="form.invoiceNumber" label="Invoice number" required :error="errors.invoiceNumber" />
        <UiInput v-model="form.invoiceDate" label="Invoice date" type="date" required :error="errors.invoiceDate" />
        <UiInput v-model="form.dueDate" label="Due date (blank = supplier's terms)" type="date" />
      </div>

      <div class="grid grid-cols-3 gap-4 items-end">
        <UiInput v-model="form.subtotal" label="Net £" type="number" required />
        <UiInput v-model="form.taxAmount" label="VAT £" type="number" required />
        <div>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total</p>
          <p class="py-2 text-lg font-semibold text-slate-800 dark:text-slate-100">{{ gbp(total) }}</p>
        </div>
      </div>

      <div>
        <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Which order is it for?</p>
        <p v-if="!form.supplierId" class="text-sm text-slate-400">Choose the supplier to see their orders.</p>
        <div v-else-if="ordersLoading" class="h-12 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />
        <p v-else-if="!orders.length" class="text-sm text-slate-400">No orders placed with this supplier. The invoice will be saved without an order and needs a note to approve.</p>
        <ul v-else class="max-h-48 overflow-y-auto rounded-lg border border-slate-100 dark:border-dark-border divide-y divide-slate-50 dark:divide-dark-border">
          <li v-for="order in orders" :key="order.id" class="flex items-center gap-3 px-3 py-2 text-sm">
            <input type="checkbox" :checked="order.selected" class="rounded border-slate-300 text-brand-500 focus:ring-brand-400" @change="toggle(order)" />
            <span class="flex-1 text-slate-600 dark:text-slate-300 cursor-pointer" @click="toggle(order)">{{ order.label }}</span>
            <input v-if="order.selected && selected.length > 1" v-model.number="order.amount" type="number" min="0" step="0.01" placeholder="£ of invoice" :class="[inputClass, 'w-28 text-right']" />
          </li>
        </ul>
        <p v-if="selected.length > 1" class="text-xs mt-1" :class="allocated > total + 0.005 ? 'text-red-500' : 'text-slate-400'">{{ gbp(allocated) }} of {{ gbp(total) }} put against orders</p>
      </div>

      <div>
        <label class="block text-xs font-medium text-slate-500 mb-1">Notes</label>
        <textarea v-model="form.notes" rows="2" class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
      </div>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Cancel</UiButton>
      <UiButton :loading="saving" :disabled="reading" @click="save">{{ isEdit ? 'Save changes' : 'Add invoice' }}</UiButton>
    </template>
  </UiModal>
</template>
