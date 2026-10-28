<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import { Plus, Minus, ChevronLeft, ChevronRight, Pencil, Trash2, ShoppingCart, AlertTriangle } from 'lucide-vue-next'
import {
  adjustStock, createStockItem, deleteStockItem, getStockItems, getStockSuggestions, orderSuggestion, updateStockItem,
  type StockItem, type StockSuggestion,
} from '@/api/procurement/stock.api'
import { apiMessage, gbp } from '@/utils/procurement'
import { useProcurementStore } from '@/stores/procurement.store'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/** Purchasing → Stock (Sprint 23): what is on the shelf, re-order points and suggested orders */
const router = useRouter()
const procurement = useProcurementStore()
const { hasPermission: canManage } = usePermissions('menus.finance.procurement.createOrder')
const { hasPermission: canAdjust } = usePermissions('menus.finance.procurement.receive')

const rows = ref<StockItem[]>([])
const suggestions = ref<StockSuggestion[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(true)
const switchedOff = ref(false)
const searchQuery = ref('')
const lowOnly = ref(false)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function load(toPage = page.value) {
  loading.value = true
  try {
    const [result, low] = await Promise.all([
      getStockItems({ search: searchQuery.value || undefined, lowOnly: lowOnly.value || undefined, page: toPage, pageSize }),
      getStockSuggestions(),
    ])
    rows.value = result.items
    total.value = result.total
    page.value = toPage
    suggestions.value = low
  } catch (err: any) {
    if (err?.response?.status === 403 && String(err.response?.data?.message ?? '').includes('Feature not enabled')) switchedOff.value = true
    else ToastService.error(apiMessage(err, 'Failed to load stock'))
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(1), 300)
}

// Suggested orders
const ordering = ref('')
async function raiseOrder(group: StockSuggestion) {
  if (!group.supplierId) return
  const result = await showConfirmDialog(`Raise a draft order with ${group.supplierName} for ${group.items.length} item${group.items.length === 1 ? '' : 's'} (about ${gbp(group.estimatedNet)} net)? You can change it before it is submitted.`, false, 'Raise draft')
  if (!result.isConfirmed) return
  ordering.value = group.supplierId
  try {
    const order = await orderSuggestion(group.supplierId)
    ToastService.success(`Draft ${order.poNumber} raised`)
    router.push(`/procurement/orders/${order.id}/edit`)
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to raise the order'))
  } finally {
    ordering.value = ''
  }
}

// Use / add stock
const adjusting = ref<StockItem | null>(null)
const adjust = reactive({ direction: 'use' as 'use' | 'add', quantity: 1 as number | string, reason: '' })
const adjustBusy = ref(false)
function openAdjust(item: StockItem, direction: 'use' | 'add') {
  adjusting.value = item
  Object.assign(adjust, { direction, quantity: 1, reason: '' })
}
async function submitAdjust() {
  if (!adjusting.value || !(Number(adjust.quantity) > 0)) return
  adjustBusy.value = true
  try {
    await adjustStock(adjusting.value.id, (adjust.direction === 'use' ? -1 : 1) * Number(adjust.quantity), adjust.reason.trim() || undefined)
    ToastService.success('Stock updated')
    adjusting.value = null
    await load()
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to update the stock'))
  } finally {
    adjustBusy.value = false
  }
}

// Add / edit item
const showForm = ref(false)
const editing = ref<StockItem | null>(null)
const saving = ref(false)
const errors = reactive({ name: '' })
const blank = () => ({ name: '', partNumber: '', supplierId: '', quantityOnHand: 0 as number | string, minStockQty: 0 as number | string, reorderQty: 1 as number | string, unitPrice: 0 as number | string, location: '' })
const form = reactive(blank())
const supplierOptions = computed(() => [{ value: '', label: 'No supplier set' }, ...procurement.supplierOptions])
function openForm(item: StockItem | null = null) {
  editing.value = item
  errors.name = ''
  Object.assign(form, item
    ? { name: item.name, partNumber: item.partNumber ?? '', supplierId: item.supplierId ?? '', quantityOnHand: item.quantityOnHand, minStockQty: item.minStockQty, reorderQty: item.reorderQty, unitPrice: item.unitPrice, location: item.location ?? '' }
    : blank())
  showForm.value = true
}
async function save() {
  errors.name = form.name.trim() ? '' : 'Enter a name'
  if (errors.name) return
  if (!(Number(form.reorderQty) > 0)) { ToastService.error('The order quantity must be more than zero'); return }
  const payload = {
    name: form.name.trim(), partNumber: form.partNumber.trim(), supplierId: form.supplierId,
    quantityOnHand: Number(form.quantityOnHand) || 0, minStockQty: Number(form.minStockQty) || 0,
    reorderQty: Number(form.reorderQty), unitPrice: Number(form.unitPrice) || 0, location: form.location.trim(),
  }
  saving.value = true
  try {
    if (editing.value) await updateStockItem(editing.value.id, payload)
    else await createStockItem(payload)
    ToastService.success(editing.value ? 'Stock item updated' : 'Stock item added')
    showForm.value = false
    await load(editing.value ? page.value : 1)
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to save the stock item'))
  } finally {
    saving.value = false
  }
}
async function handleDelete(item: StockItem) {
  const result = await showConfirmDialog(`Remove ${item.name} from stock?`, true, 'Remove')
  if (!result.isConfirmed) return
  try {
    await deleteStockItem(item.id)
    ToastService.success('Stock item removed')
    await load()
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to remove the stock item'))
  }
}

onMounted(async () => {
  await procurement.fetchSettings()
  procurement.fetchSuppliers().catch(() => {})
  await load(1)
})
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Stock" subtitle="What you keep on the shelf. Deliveries add to it; anything at its re-order point is suggested for ordering.">
      <UiButton v-if="canManage && !switchedOff" @click="openForm()"><Plus class="w-4 h-4" /> New stock item</UiButton>
    </UiPageHeader>

    <div v-if="switchedOff" class="rounded-lg border border-slate-200 dark:border-dark-border p-8 text-center text-sm text-slate-500">
      Stock levels are switched off for this organisation. They can be switched on in Settings → Purchasing.
    </div>

    <template v-else>
      <!-- Suggested orders -->
      <div v-if="suggestions.length" class="mb-5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10 p-4">
        <p class="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3"><AlertTriangle class="w-4 h-4" /> Running low — suggested orders</p>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div v-for="group in suggestions" :key="group.supplierId ?? 'none'" class="rounded-lg bg-white dark:bg-dark-surface border border-amber-100 dark:border-dark-border p-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{ group.supplierName ?? 'No supplier set' }}</span>
              <span v-if="group.supplierId" class="text-xs text-slate-400">about {{ gbp(group.estimatedNet) }} net</span>
              <UiButton v-if="canManage && group.supplierId" size="sm" class="ml-auto" :loading="ordering === group.supplierId" @click="raiseOrder(group)"><ShoppingCart class="w-3.5 h-3.5" /> Raise order</UiButton>
            </div>
            <ul class="text-sm text-slate-500 space-y-0.5">
              <li v-for="item in group.items" :key="item.id">{{ item.name }} — {{ item.quantityOnHand }} left, order {{ item.reorderQty }}</li>
            </ul>
            <p v-if="!group.supplierId" class="text-xs text-slate-400 mt-1.5">Set a supplier on these items to raise an order for them.</p>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-4 mb-5">
        <div class="w-64"><UiSearchInput v-model="searchQuery" placeholder="Search name or part number…" @update:modelValue="onSearch" /></div>
        <UiToggle v-model="lowOnly" label="Low stock only" @update:modelValue="load(1)" />
        <span class="text-sm text-slate-400 ml-auto">{{ total }} items</span>
      </div>

      <UiTable :headers="['Item', 'Supplier', 'Where', 'On hand', 'Re-order at', 'Order qty', 'Unit (net)', '']">
        <template v-if="loading && rows.length === 0">
          <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse">
            <td v-for="col in 8" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-16 bg-slate-200 dark:bg-white/10 rounded" /></td>
          </tr>
        </template>
        <template v-else-if="rows.length === 0">
          <tr><td colspan="8" class="px-4 py-10 text-center text-sm text-slate-400">{{ lowOnly ? 'Nothing is low on stock.' : 'No stock items yet — add the things you keep on the shelf.' }}</td></tr>
        </template>
        <tr v-else v-for="item in rows" :key="item.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          <td class="px-4 py-3.5">
            <span class="font-semibold text-slate-700 dark:text-slate-200">{{ item.name }}</span>
            <p v-if="item.partNumber" class="text-xs text-slate-400">{{ item.partNumber }}</p>
          </td>
          <td class="px-4 py-3.5 text-sm text-slate-500">{{ item.supplierName || '—' }}</td>
          <td class="px-4 py-3.5 text-sm text-slate-500">{{ item.location || '—' }}</td>
          <td class="px-4 py-3.5">
            <span :class="['font-semibold', item.isLow ? 'text-red-600' : 'text-slate-700 dark:text-slate-200']">{{ item.quantityOnHand }}</span>
            <span v-if="item.isLow" class="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Low</span>
          </td>
          <td class="px-4 py-3.5 text-sm text-slate-500">{{ item.minStockQty || '—' }}</td>
          <td class="px-4 py-3.5 text-sm text-slate-500">{{ item.reorderQty }}</td>
          <td class="px-4 py-3.5 text-sm text-slate-500">{{ gbp(item.unitPrice) }}</td>
          <td class="px-4 py-3.5">
            <div class="flex items-center justify-end gap-1">
              <template v-if="canAdjust">
                <button class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300" @click="openAdjust(item, 'use')"><Minus class="w-3 h-3" /> Use</button>
                <button class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300" @click="openAdjust(item, 'add')"><Plus class="w-3 h-3" /> Add</button>
              </template>
              <template v-if="canManage">
                <button class="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-white/10" title="Edit" @click="openForm(item)"><Pencil class="w-4 h-4" /></button>
                <button class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/10" title="Remove" @click="handleDelete(item)"><Trash2 class="w-4 h-4" /></button>
              </template>
            </div>
          </td>
        </tr>
      </UiTable>

      <div v-if="totalPages > 1" class="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
        <span>Page {{ page }} of {{ totalPages }}</span>
        <button :disabled="page <= 1" @click="load(page - 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronLeft class="w-4 h-4" /></button>
        <button :disabled="page >= totalPages" @click="load(page + 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronRight class="w-4 h-4" /></button>
      </div>
    </template>

    <UiModal :open="!!adjusting" :title="adjust.direction === 'use' ? `Use stock — ${adjusting?.name ?? ''}` : `Add stock — ${adjusting?.name ?? ''}`" @close="adjusting = null">
      <div class="space-y-4">
        <p class="text-sm text-slate-500">{{ adjusting?.quantityOnHand }} on hand now. {{ adjust.direction === 'add' ? 'Deliveries booked in on a purchase order are added automatically — use this for stock found or returned.' : '' }}</p>
        <UiInput v-model="adjust.quantity" :label="adjust.direction === 'use' ? 'How many were used?' : 'How many to add?'" type="number" required />
        <UiInput v-model="adjust.reason" label="Note (optional)" placeholder="e.g. Used on JOB-00012" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="adjusting = null">Cancel</UiButton>
        <UiButton :loading="adjustBusy" :disabled="!(Number(adjust.quantity) > 0)" @click="submitAdjust">{{ adjust.direction === 'use' ? 'Take off stock' : 'Add to stock' }}</UiButton>
      </template>
    </UiModal>

    <UiModal :open="showForm" :title="editing ? `Edit ${editing.name}` : 'New stock item'" size="lg" @close="showForm = false">
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UiInput v-model="form.name" label="Name" required :error="errors.name" />
          <UiInput v-model="form.partNumber" label="Part number (matches deliveries to this item)" />
          <UiSelect v-model="form.supplierId" label="Usually bought from" :options="supplierOptions" />
          <UiInput v-model="form.location" label="Where it is kept" placeholder="e.g. Stores — shelf A" />
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <UiInput v-model="form.quantityOnHand" label="On hand" type="number" />
          <UiInput v-model="form.minStockQty" label="Re-order at" type="number" />
          <UiInput v-model="form.reorderQty" label="Order quantity" type="number" />
          <UiInput v-model="form.unitPrice" label="Unit £ (net)" type="number" />
        </div>
        <p class="text-xs text-slate-400">When "On hand" falls to "Re-order at" the item is suggested for ordering. Leave "Re-order at" as 0 for no suggestion.</p>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showForm = false">Cancel</UiButton>
        <UiButton :loading="saving" @click="save">{{ editing ? 'Save changes' : 'Add item' }}</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
