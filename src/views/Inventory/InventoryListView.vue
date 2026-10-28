<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import GeneralSliderPanel from '@/components/Ui/GeneralSliderPanel.vue'
import BarcodeScannerModal from '@/components/Inventory/BarcodeScannerModal.vue'
import { Package, Plus, ScanBarcode, Truck, MapPin, Trash2 } from 'lucide-vue-next'
import {
  getPartsOrders, createManualOrder, updatePartsOrder, updatePartsOrderStatus, updateOrderLine, deletePartsOrder,
  type PartsOrder,
} from '@/api/parts-orders.api'
import { PartsOrderStatus } from '@/types/generated/enums/job'
import { useCrudPermissions, usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { getSuppliersBasic } from '@/api/procurement/suppliers.api'
import { useProcurementStore } from '@/stores/procurement.store'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showTextareaDialog } from '@/utils/alert'

const { canCreate, canUpdate, canDelete } = useCrudPermissions('stock', 'inventory')
const { hasPermission: canAdjustStock } = usePermissions('menus.stock.inventory.adjustStock')

const activeTab = ref<'orders' | 'stock'>('orders')
const loading = ref(true)
const orders = ref<PartsOrder[]>([])
const search = ref('')
const statusFilter = ref<PartsOrderStatus | ''>('')
const scannerOpen = ref(false)

const statusChips: { value: PartsOrderStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: PartsOrderStatus.TO_ORDER, label: 'To Order' },
  { value: PartsOrderStatus.ORDERED, label: 'Ordered' },
  { value: PartsOrderStatus.DELAYED, label: 'Delayed' },
  { value: PartsOrderStatus.RECEIVED, label: 'Received' },
  { value: PartsOrderStatus.WRONG_PART, label: 'Returns' },
]

const statusLabels: Record<PartsOrderStatus, string> = {
  [PartsOrderStatus.TO_ORDER]: 'To Order',
  [PartsOrderStatus.ORDERED]: 'Ordered',
  [PartsOrderStatus.DELAYED]: 'Delayed',
  [PartsOrderStatus.RECEIVED]: 'Received',
  [PartsOrderStatus.WRONG_PART]: 'Wrong Part',
  [PartsOrderStatus.RETURNED]: 'Returned',
}
const statusVariant: Record<PartsOrderStatus, string> = {
  [PartsOrderStatus.TO_ORDER]: 'open',
  [PartsOrderStatus.ORDERED]: 'progress',
  [PartsOrderStatus.DELAYED]: 'pending',
  [PartsOrderStatus.RECEIVED]: 'done',
  [PartsOrderStatus.WRONG_PART]: 'cancelled',
  [PartsOrderStatus.RETURNED]: 'cancelled',
}
const transitionLabels: Record<PartsOrderStatus, string> = {
  [PartsOrderStatus.TO_ORDER]: 'Back to To Order',
  [PartsOrderStatus.ORDERED]: 'Mark Ordered',
  [PartsOrderStatus.DELAYED]: 'Mark Delayed',
  [PartsOrderStatus.RECEIVED]: 'Receive All',
  [PartsOrderStatus.WRONG_PART]: 'Wrong Part',
  [PartsOrderStatus.RETURNED]: 'Mark Returned',
}

async function load() {
  loading.value = true
  try {
    const result = await getPartsOrders({
      status: statusFilter.value || undefined,
      search: search.value.trim() || undefined,
      pageSize: 100,
    })
    orders.value = result.items
  } catch {
    ToastService.error('Failed to load parts orders')
  } finally {
    loading.value = false
  }
}

function setStatusFilter(value: PartsOrderStatus | '') {
  statusFilter.value = value
  load()
}

/** Stock tab: every received line, flattened, searchable */
const stockRows = computed(() => {
  const term = search.value.trim().toLowerCase()
  const rows: { order: PartsOrder; line: PartsOrder['lines'][number] }[] = []
  for (const order of orders.value) {
    for (const line of order.lines) {
      if (line.receivedQuantity <= 0) continue
      if (
        term &&
        ![line.description, line.partNumber, line.barcode, line.shelfLocation, order.jobNumber, order.orderNumber]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      ) continue
      rows.push({ order, line })
    }
  }
  return rows
})

// ── Detail slider ─────────────────────────────────────────────────────────────
const selected = ref<PartsOrder | null>(null)
const detailOpen = ref(false)
const editForm = reactive({
  supplierName: '', supplierRef: '', expectedDate: '',
  supplierInvoiceRef: '', supplierInvoiceAmount: '', notes: '',
})
const savingDetail = ref(false)

function openDetail(order: PartsOrder) {
  selected.value = order
  editForm.supplierName = order.supplierName
  editForm.supplierRef = order.supplierRef ?? ''
  editForm.expectedDate = order.expectedDate ?? ''
  editForm.supplierInvoiceRef = order.supplierInvoiceRef ?? ''
  editForm.supplierInvoiceAmount = order.supplierInvoiceAmount != null ? String(order.supplierInvoiceAmount) : ''
  editForm.notes = order.notes ?? ''
  detailOpen.value = true
}

function refreshSelected(updated: PartsOrder) {
  selected.value = updated
  const i = orders.value.findIndex((o) => o.id === updated.id)
  if (i >= 0) orders.value[i] = updated
}

async function saveDetail() {
  if (!selected.value) return
  savingDetail.value = true
  try {
    refreshSelected(await updatePartsOrder(selected.value.id, {
      supplierName: editForm.supplierName.trim() || undefined,
      supplierRef: editForm.supplierRef.trim() || undefined,
      expectedDate: editForm.expectedDate || undefined,
      supplierInvoiceRef: editForm.supplierInvoiceRef.trim() || undefined,
      supplierInvoiceAmount: editForm.supplierInvoiceAmount !== '' ? Number(editForm.supplierInvoiceAmount) : undefined,
      notes: editForm.notes.trim() || undefined,
    }))
    ToastService.success('Order updated')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to update the order')
  } finally {
    savingDetail.value = false
  }
}

async function transition(status: PartsOrderStatus) {
  if (!selected.value) return
  let note: string | undefined
  if (status === PartsOrderStatus.DELAYED || status === PartsOrderStatus.RETURNED) {
    const result = await showTextareaDialog(
      transitionLabels[status],
      status === PartsOrderStatus.DELAYED ? 'Reason / new ETA' : 'Return reason',
      '', true,
    )
    if (!result.isConfirmed) return
    note = result.value
  }
  try {
    refreshSelected(await updatePartsOrderStatus(selected.value.id, status, note))
    ToastService.success(`Order ${statusLabels[status].toLowerCase()}`)
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Status change failed')
  }
}

async function saveLine(lineId: string, patch: { barcode?: string; shelfLocation?: string; receivedQuantity?: number }) {
  if (!selected.value) return
  try {
    refreshSelected(await updateOrderLine(selected.value.id, lineId, patch))
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to update the line')
  }
}

async function removeOrder() {
  if (!selected.value) return
  const result = await showConfirmDialog(`${selected.value.orderNumber} will be deleted.`)
  if (!result.isConfirmed) return
  try {
    await deletePartsOrder(selected.value.id)
    detailOpen.value = false
    ToastService.success('Order deleted')
    load()
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to delete')
  }
}

// ── Manual order modal ────────────────────────────────────────────────────────
// Where Purchasing is in use, anything NOT for a job is raised as a purchase order there; this screen is
// for job parts only. The manual order stays for tenants that have not switched Purchasing on.
const router = useRouter()
const procurement = useProcurementStore()
const { hasPermission: canSeePurchasing } = usePermissions('menus.finance.procurement.read')
const { hasPermission: canRaisePurchaseOrder } = usePermissions('menus.finance.procurement.createOrder')
const purchasingInUse = computed(() => canSeePurchasing.value && procurement.settings?.enabled === true)
const createOpen = ref(false)
const createSubmitting = ref(false)
const createForm = reactive({
  supplierName: '',
  expectedDate: '',
  lines: [{ description: '', partNumber: '', quantity: 1, unitCost: '', barcode: '' }],
})

function addCreateLine() {
  createForm.lines.push({ description: '', partNumber: '', quantity: 1, unitCost: '', barcode: '' })
}

async function submitCreate() {
  const lines = createForm.lines
    .filter((l) => l.description.trim())
    .map((l) => ({
      description: l.description.trim(),
      partNumber: l.partNumber.trim() || undefined,
      quantity: Number(l.quantity) || 1,
      unitCost: l.unitCost !== '' ? Number(l.unitCost) : undefined,
      barcode: l.barcode.trim() || undefined,
    }))
  if (!createForm.supplierName.trim() || !lines.length) {
    ToastService.error('Supplier and at least one line are required')
    return
  }
  createSubmitting.value = true
  try {
    await createManualOrder({
      supplierName: createForm.supplierName.trim(),
      expectedDate: createForm.expectedDate || undefined,
      lines,
    })
    createOpen.value = false
    createForm.supplierName = ''
    createForm.expectedDate = ''
    createForm.lines = [{ description: '', partNumber: '', quantity: 1, unitCost: '', barcode: '' }]
    ToastService.success('Parts order created')
    load()
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to create the order')
  } finally {
    createSubmitting.value = false
  }
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) } catch { return d }
}

function isOverdue(order: PartsOrder): boolean {
  return !!order.expectedDate
    && [PartsOrderStatus.ORDERED, PartsOrderStatus.DELAYED].includes(order.status)
    && new Date(order.expectedDate) < new Date(new Date().toDateString())
}

// Sprint 23 — suggest existing supplier records so the same supplier is not typed two ways
const supplierNames = ref<string[]>([])
onMounted(() => {
  load()
  if (canSeePurchasing.value) procurement.fetchSettings()
  getSuppliersBasic().then((list) => { supplierNames.value = list.map((s) => s.name) }).catch(() => {})
})
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Job Parts" :subtitle="purchasingInUse ? 'Parts ordered for jobs — receiving, shelf locations and returns. Order from the quote on the job; anything else is a purchase order.' : 'Parts orders, receiving and shelf locations.'">
      <UiButton v-if="canAdjustStock" variant="secondary" @click="scannerOpen = true"><ScanBarcode class="w-4 h-4" /> Receive by Scan</UiButton>
      <UiButton v-if="canCreate && !purchasingInUse" @click="createOpen = true"><Plus class="w-4 h-4" /> New Order</UiButton>
      <UiButton v-else-if="purchasingInUse && canRaisePurchaseOrder" variant="secondary" @click="router.push('/procurement/orders/new')"><Plus class="w-4 h-4" /> New purchase order</UiButton>
    </UiPageHeader>

    <!-- Tabs -->
    <div class="flex gap-1 mb-5 border-b border-slate-200 dark:border-dark-border">
      <button
        v-for="tab in [{ key: 'orders', label: 'Parts Orders', icon: Truck }, { key: 'stock', label: 'Stock', icon: Package }]"
        :key="tab.key"
        @click="activeTab = tab.key as typeof activeTab"
        :class="[
          'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
          activeTab === tab.key
            ? 'border-brand-500 text-brand-600'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
        ]"
      >
        <component :is="tab.icon" class="w-4 h-4" /> {{ tab.label }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <UiSearchInput v-model="search" placeholder="Search orders, parts, barcodes…" class="w-72" @update:modelValue="load()" />
      <div v-if="activeTab === 'orders'" class="flex gap-1.5">
        <button
          v-for="chip in statusChips"
          :key="chip.value"
          @click="setStatusFilter(chip.value)"
          :class="[
            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            statusFilter === chip.value
              ? 'bg-brand-500 text-white'
              : 'bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-border',
          ]"
        >
          {{ chip.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="card h-48 animate-pulse bg-slate-100 dark:bg-white/5" />

    <!-- Parts Orders tab -->
    <template v-else-if="activeTab === 'orders'">
      <div v-if="orders.length" class="card !p-0 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 dark:border-dark-border text-left text-xs font-semibold text-slate-400 uppercase">
              <th class="px-5 py-3">Order</th>
              <th class="px-3 py-3">Supplier</th>
              <th class="px-3 py-3">Job</th>
              <th class="px-3 py-3">Lines</th>
              <th class="px-3 py-3">ETA</th>
              <th class="px-3 py-3 text-right">Cost</th>
              <th class="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
            <tr v-for="order in orders" :key="order.id" class="hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer" @click="openDetail(order)">
              <td class="px-5 py-3 font-semibold text-brand-600">{{ order.orderNumber }}</td>
              <td class="px-3 py-3 text-slate-700 dark:text-slate-200">{{ order.supplierName }}</td>
              <td class="px-3 py-3">
                <span v-if="order.jobNumber" class="text-slate-600 dark:text-slate-300">{{ order.jobNumber }} <span class="text-slate-400 font-mono text-xs">{{ order.vehicleRegistration }}</span></span>
                <span v-else class="text-slate-400">Stock</span>
              </td>
              <td class="px-3 py-3 text-slate-500">
                {{ order.lines.reduce((s, l) => s + l.receivedQuantity, 0) }}/{{ order.lines.reduce((s, l) => s + l.quantity, 0) }} received
              </td>
              <td class="px-3 py-3" :class="isOverdue(order) ? 'text-red-500 font-semibold' : 'text-slate-500'">{{ formatDate(order.expectedDate) }}</td>
              <td class="px-3 py-3 text-right text-slate-600 dark:text-slate-300">£{{ order.totalCost.toFixed(2) }}</td>
              <td class="px-5 py-3"><UiBadge :variant="(statusVariant[order.status] as any)" dot>{{ statusLabels[order.status] }}</UiBadge></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="card py-16 text-center">
        <Truck class="w-10 h-10 mx-auto text-slate-200 dark:text-slate-600 mb-3" />
        <p class="text-sm text-slate-400">No parts orders yet — create one from an approved quote on the job page, or add a stock order.</p>
      </div>
    </template>

    <!-- Stock tab -->
    <template v-else>
      <div v-if="stockRows.length" class="card !p-0 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 dark:border-dark-border text-left text-xs font-semibold text-slate-400 uppercase">
              <th class="px-5 py-3">Part</th>
              <th class="px-3 py-3">Part No.</th>
              <th class="px-3 py-3">Barcode</th>
              <th class="px-3 py-3">Qty</th>
              <th class="px-3 py-3">Shelf</th>
              <th class="px-3 py-3">Job</th>
              <th class="px-5 py-3">Received</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
            <tr v-for="row in stockRows" :key="row.line.id" class="hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer" @click="openDetail(row.order)">
              <td class="px-5 py-3 text-slate-700 dark:text-slate-200">{{ row.line.description }}</td>
              <td class="px-3 py-3 font-mono text-xs text-slate-400">{{ row.line.partNumber ?? '—' }}</td>
              <td class="px-3 py-3 font-mono text-xs text-slate-400">{{ row.line.barcode ?? '—' }}</td>
              <td class="px-3 py-3 text-slate-500">{{ row.line.receivedQuantity }}</td>
              <td class="px-3 py-3">
                <span v-if="row.line.shelfLocation" class="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200 font-semibold"><MapPin class="w-3.5 h-3.5 text-brand-500" /> {{ row.line.shelfLocation }}</span>
                <span v-else class="text-slate-400">—</span>
              </td>
              <td class="px-3 py-3 text-slate-500">{{ row.order.jobNumber ?? 'Stock' }}</td>
              <td class="px-5 py-3 text-slate-400">{{ formatDate(row.line.receivedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="card py-16 text-center">
        <Package class="w-10 h-10 mx-auto text-slate-200 dark:text-slate-600 mb-3" />
        <p class="text-sm text-slate-400">No received parts on the shelf yet.</p>
      </div>
    </template>

    <!-- Order detail slider -->
    <GeneralSliderPanel v-model="detailOpen" :title="selected?.orderNumber ?? ''" size="lg">
      <div v-if="selected" class="space-y-5">
        <div class="flex flex-wrap items-center gap-2">
          <UiBadge :variant="(statusVariant[selected.status] as any)" dot>{{ statusLabels[selected.status] }}</UiBadge>
          <span v-if="selected.jobNumber" class="text-sm text-slate-500">{{ selected.jobNumber }} · {{ selected.vehicleRegistration }}</span>
          <span v-if="selected.delayNotes" class="text-sm text-amber-600">{{ selected.delayNotes }}</span>
        </div>

        <!-- Status actions -->
        <div v-if="canUpdate && selected.allowedTransitions.length" class="flex flex-wrap gap-2">
          <UiButton v-for="t in selected.allowedTransitions" :key="t" size="sm" :variant="t === PartsOrderStatus.RECEIVED ? 'primary' : 'secondary'" @click="transition(t)">
            {{ transitionLabels[t] }}
          </UiButton>
          <UiButton v-if="canDelete && selected.status === PartsOrderStatus.TO_ORDER" size="sm" variant="danger" @click="removeOrder"><Trash2 class="w-3.5 h-3.5" /> Delete</UiButton>
        </div>

        <!-- Supplier / ETA -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <UiInput v-model="editForm.supplierName" label="Supplier" list="supplier-names" :disabled="!canUpdate" />
          <UiInput v-model="editForm.supplierRef" label="Supplier ref" :disabled="!canUpdate" />
          <UiInput v-model="editForm.expectedDate" label="Expected date" type="date" :disabled="!canUpdate" />
        </div>

        <!-- Supplier invoice (Module 6: recharge discipline) + progress notes -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UiInput v-model="editForm.supplierInvoiceRef" label="Supplier invoice ref" placeholder="e.g. SI-48211" :disabled="!canUpdate" />
          <UiInput v-model="editForm.supplierInvoiceAmount" label="Invoice amount (£)" type="number" :disabled="!canUpdate" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Notes (delivery condition, chase-ups…)</label>
          <textarea
            v-model="editForm.notes" rows="2" :disabled="!canUpdate"
            class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-60"
          />
        </div>
        <UiButton v-if="canUpdate" size="sm" variant="secondary" :disabled="savingDetail" @click="saveDetail">{{ savingDetail ? 'Saving…' : 'Save details' }}</UiButton>

        <!-- Lines -->
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Lines</h4>
          <div class="space-y-3">
            <div v-for="line in selected.lines" :key="line.id" class="p-3 rounded-lg border border-slate-100 dark:border-dark-border">
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ line.description }}</p>
                <span :class="['text-xs font-semibold', line.receivedQuantity >= line.quantity ? 'text-green-600' : 'text-slate-400']">
                  {{ line.receivedQuantity }}/{{ line.quantity }} received
                </span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  :value="line.barcode ?? ''" :disabled="!canUpdate" placeholder="Barcode"
                  class="text-xs font-mono rounded-md border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-slate-700 dark:text-slate-200"
                  @change="saveLine(line.id, { barcode: ($event.target as HTMLInputElement).value })"
                />
                <input
                  :value="line.shelfLocation ?? ''" :disabled="!canUpdate" placeholder="Shelf (e.g. B3)"
                  class="text-xs rounded-md border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-slate-700 dark:text-slate-200"
                  @change="saveLine(line.id, { shelfLocation: ($event.target as HTMLInputElement).value })"
                />
                <input
                  :value="line.receivedQuantity" :disabled="!canUpdate" type="number" min="0" :max="line.quantity" placeholder="Received"
                  class="text-xs rounded-md border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-slate-700 dark:text-slate-200"
                  @change="saveLine(line.id, { receivedQuantity: Number(($event.target as HTMLInputElement).value) })"
                />
                <span class="text-xs text-slate-400 self-center">{{ line.unitCost != null ? `£${line.unitCost.toFixed(2)} × ${line.quantity}` : '' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GeneralSliderPanel>

    <datalist id="supplier-names"><option v-for="name in supplierNames" :key="name" :value="name" /></datalist>

    <!-- Manual order modal -->
    <UiModal :open="createOpen" title="New Parts Order" @close="createOpen = false">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <UiInput v-model="createForm.supplierName" label="Supplier" list="supplier-names" required />
          <UiInput v-model="createForm.expectedDate" label="Expected date" type="date" />
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Lines</p>
          <div v-for="(line, i) in createForm.lines" :key="i" class="grid grid-cols-12 gap-2 mb-2">
            <input v-model="line.description" placeholder="Description" class="col-span-5 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2.5 py-2 text-slate-700 dark:text-slate-200" />
            <input v-model="line.partNumber" placeholder="Part no." class="col-span-2 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2.5 py-2 text-slate-700 dark:text-slate-200" />
            <input v-model.number="line.quantity" type="number" min="1" placeholder="Qty" class="col-span-1 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2.5 py-2 text-slate-700 dark:text-slate-200" />
            <input v-model="line.unitCost" type="number" placeholder="£ cost" class="col-span-2 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2.5 py-2 text-slate-700 dark:text-slate-200" />
            <input v-model="line.barcode" placeholder="Barcode" class="col-span-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2.5 py-2 text-slate-700 dark:text-slate-200" />
          </div>
          <UiButton variant="ghost" size="sm" @click="addCreateLine"><Plus class="w-3.5 h-3.5" /> Add line</UiButton>
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="createOpen = false">Cancel</UiButton>
        <UiButton :loading="createSubmitting" @click="submitCreate">Create Order</UiButton>
      </template>
    </UiModal>

    <BarcodeScannerModal :open="scannerOpen" @close="scannerOpen = false" @received="load()" />
  </DefaultLayout>
</template>
