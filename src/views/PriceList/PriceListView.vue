<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Upload, Users } from 'lucide-vue-next'
import {
  createPriceListItem, deletePriceListItem, getItemCustomerPrices, getPriceList, getPriceListCategories, importPriceList,
  setItemCustomerPrices, updatePriceListItem, type PriceListImportResult, type PriceListItem,
} from '@/api/price-list.api'
import { getCustomers } from '@/api/customers.api'
import { InvoiceLineType } from '@/types/generated/enums/invoice'
import { gbp } from '@/utils/invoiceStatus'
import { apiMessage } from '@/utils/procurement'
import { useCrudPermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/**
 * Price list (Sprint 32) — saved fixed-price items picked onto jobs and invoices, with an
 * optional price per customer. An item with no price is priced each time it is used.
 */
const { canCreate, canUpdate, canDelete } = useCrudPermissions('finance', 'priceList')

const rows = ref<PriceListItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(true)
const searchQuery = ref('')
const categoryFilter = ref('')
const activeFilter = ref<'' | 'true' | 'false'>('')
const categories = ref<string[]>([])
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const categoryOptions = computed(() => [{ value: '', label: 'All categories' }, ...categories.value.map((c) => ({ value: c, label: c }))])
const activeOptions = [{ value: '', label: 'Active and inactive' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]
const lineTypeOptions = [
  { value: InvoiceLineType.LABOUR, label: 'Labour / service' },
  { value: InvoiceLineType.PART, label: 'Part' },
  { value: InvoiceLineType.DIAGNOSIS_FEE, label: 'Diagnosis fee' },
  { value: InvoiceLineType.OTHER, label: 'Other charge' },
]
const lineTypeLabel = (type: string) => lineTypeOptions.find((o) => o.value === type)?.label ?? type

async function load(toPage = page.value) {
  loading.value = true
  try {
    const result = await getPriceList({
      search: searchQuery.value || undefined,
      category: categoryFilter.value || undefined,
      active: activeFilter.value === '' ? undefined : activeFilter.value === 'true',
      page: toPage, pageSize,
    })
    rows.value = result.items
    total.value = result.total
    page.value = toPage
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to load the price list'))
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try { categories.value = await getPriceListCategories() } catch { /* suggestions only */ }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(1), 300)
}

// ── Item form ────────────────────────────────────────────────────────────────
const showForm = ref(false)
const editing = ref<PriceListItem | null>(null)
const saving = ref(false)
const formTab = ref<'details' | 'customers'>('details')
const errors = reactive({ name: '', price: '' })
const form = reactive({ name: '', category: '', lineType: InvoiceLineType.LABOUR as InvoiceLineType, priced: true, defaultPrice: '' as string | number, isActive: true })

// Customer prices of the item being edited
interface CustomerPriceRow { key: number; customerId: string; price: string | number }
let rowKey = 0
const customerPrices = ref<CustomerPriceRow[]>([])
const customerOptions = ref<{ value: string; label: string }[]>([])
const customerPricesLoaded = ref(false)

async function openForm(item: PriceListItem | null = null, tab: 'details' | 'customers' = 'details') {
  editing.value = item
  formTab.value = item ? tab : 'details'
  errors.name = ''; errors.price = ''
  Object.assign(form, item
    ? { name: item.name, category: item.category ?? '', lineType: item.lineType, priced: item.defaultPrice !== null, defaultPrice: item.defaultPrice ?? '', isActive: item.isActive }
    : { name: '', category: '', lineType: InvoiceLineType.LABOUR, priced: true, defaultPrice: '', isActive: true })
  customerPrices.value = []
  customerPricesLoaded.value = false
  showForm.value = true
  if (item) {
    try {
      const [prices, customers] = await Promise.all([getItemCustomerPrices(item.id), getCustomers({ pageSize: 500 })])
      customerOptions.value = customers.items
        .map((c) => ({ value: c.id, label: c.businessName || c.name }))
        .sort((a, b) => a.label.localeCompare(b.label))
      customerPrices.value = prices.map((p) => ({ key: rowKey++, customerId: p.customerId, price: p.price }))
      customerPricesLoaded.value = true
    } catch (err) {
      ToastService.error(apiMessage(err, 'Failed to load customer prices'))
    }
  }
}

function addCustomerPrice() {
  customerPrices.value = [...customerPrices.value, { key: rowKey++, customerId: '', price: form.priced ? form.defaultPrice : '' }]
}
function removeCustomerPrice(key: number) {
  customerPrices.value = customerPrices.value.filter((r) => r.key !== key)
}
/** A customer can only appear once, so each row's options leave out the customers chosen on the other rows */
function optionsFor(row: CustomerPriceRow) {
  const taken = new Set(customerPrices.value.filter((r) => r.key !== row.key).map((r) => r.customerId))
  return [{ value: '', label: 'Choose a customer…' }, ...customerOptions.value.filter((o) => !taken.has(o.value))]
}

async function save() {
  errors.name = form.name.trim() ? '' : 'Enter the item name'
  const price = form.priced ? Number(form.defaultPrice) : null
  errors.price = form.priced && (form.defaultPrice === '' || !Number.isFinite(price) || (price as number) < 0) ? 'Enter a price, or switch off "Has a standard price"' : ''
  if (errors.name || errors.price) { formTab.value = 'details'; return }
  const incomplete = customerPrices.value.some((r) => !r.customerId || r.price === '' || !(Number(r.price) >= 0))
  if (incomplete) { formTab.value = 'customers'; ToastService.error('Each customer price needs a customer and a price'); return }

  saving.value = true
  try {
    const dto = { name: form.name.trim(), category: form.category.trim() || null, lineType: form.lineType, defaultPrice: price, isActive: form.isActive }
    const saved = editing.value ? await updatePriceListItem(editing.value.id, dto) : await createPriceListItem(dto)
    if (editing.value && customerPricesLoaded.value) {
      await setItemCustomerPrices(saved.id, customerPrices.value.map((r) => ({ customerId: r.customerId, price: Number(r.price) })))
    }
    ToastService.success(editing.value ? 'Item updated' : 'Item added to the price list')
    showForm.value = false
    await Promise.all([load(editing.value ? page.value : 1), loadCategories()])
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to save the item'))
  } finally {
    saving.value = false
  }
}

async function handleDelete(item: PriceListItem) {
  const result = await showConfirmDialog(`Remove "${item.name}" from the price list? Jobs and invoices that already use it keep their lines.`, true, 'Remove')
  if (!result.isConfirmed) return
  try {
    await deletePriceListItem(item.id)
    ToastService.success('Item removed')
    await Promise.all([load(), loadCategories()])
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to remove the item'))
  }
}

// ── Import ───────────────────────────────────────────────────────────────────
const showImport = ref(false)
const importCsv = ref('')
const importResult = ref<PriceListImportResult | null>(null)
const importBusy = ref(false)

function openImport() {
  importCsv.value = ''
  importResult.value = null
  showImport.value = true
}
async function onImportFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importCsv.value = await file.text()
  importResult.value = null
}
async function runImport(dryRun: boolean) {
  if (!importCsv.value.trim()) { ToastService.error('Choose a CSV file or paste the rows first'); return }
  importBusy.value = true
  try {
    importResult.value = await importPriceList(importCsv.value, dryRun)
    if (!dryRun) {
      ToastService.success(`${importResult.value.created} added, ${importResult.value.updated} updated`)
      await Promise.all([load(1), loadCategories()])
      if (!importResult.value.errors.length) showImport.value = false
    }
  } catch (err) {
    ToastService.error(apiMessage(err, 'Import failed'))
  } finally {
    importBusy.value = false
  }
}

onMounted(() => { load(1); loadCategories() })
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Price List" subtitle="Your standard items and prices — pick them onto a job or an invoice instead of typing.">
      <UiButton v-if="canCreate" variant="secondary" @click="openImport"><Upload class="w-4 h-4" /> Import</UiButton>
      <UiButton v-if="canCreate" @click="openForm()"><Plus class="w-4 h-4" /> New item</UiButton>
    </UiPageHeader>

    <div class="flex flex-wrap items-center gap-3 mb-5">
      <div class="w-64"><UiSearchInput v-model="searchQuery" placeholder="Search item or category…" @update:modelValue="onSearch" /></div>
      <div class="w-44"><UiSelect v-model="categoryFilter" :options="categoryOptions" @update:modelValue="load(1)" /></div>
      <div class="w-48"><UiSelect v-model="activeFilter" :options="activeOptions" @update:modelValue="load(1)" /></div>
      <span class="text-sm text-slate-400 ml-auto">{{ total }} items</span>
    </div>

    <UiTable :headers="['Item', 'Category', 'Type', 'Standard price', 'Customer prices', 'Status', '']">
      <template v-if="loading && rows.length === 0">
        <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in 7" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded" /></td>
        </tr>
      </template>
      <template v-else-if="rows.length === 0">
        <tr><td colspan="7" class="px-4 py-10 text-center text-sm text-slate-400">
          No items yet. Add your standard work, or import your existing list.
        </td></tr>
      </template>
      <tr v-else v-for="item in rows" :key="item.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
        <td class="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-200">{{ item.name }}</td>
        <td class="px-4 py-3.5 text-sm text-slate-500">{{ item.category || '—' }}</td>
        <td class="px-4 py-3.5 text-sm text-slate-500">{{ lineTypeLabel(item.lineType) }}</td>
        <td class="px-4 py-3.5 text-sm">
          <span v-if="item.defaultPrice !== null" class="font-medium text-slate-700 dark:text-slate-200">{{ gbp(item.defaultPrice) }}</span>
          <span v-else class="text-slate-400">Entered on the job</span>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-500">
          <button v-if="item.customerPriceCount > 0 || canUpdate" class="inline-flex items-center gap-1 hover:text-brand-600" @click="openForm(item, 'customers')">
            <Users class="w-3.5 h-3.5" /> {{ item.customerPriceCount > 0 ? item.customerPriceCount : 'None' }}
          </button>
          <span v-else>None</span>
        </td>
        <td class="px-4 py-3.5"><UiBadge :variant="item.isActive ? 'done' : 'cancelled'" dot>{{ item.isActive ? 'Active' : 'Inactive' }}</UiBadge></td>
        <td class="px-4 py-3.5">
          <div class="flex items-center justify-end gap-1">
            <button v-if="canUpdate" class="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-white/10" title="Edit" @click="openForm(item)"><Pencil class="w-4 h-4" /></button>
            <button v-if="canDelete" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-white/10" title="Remove" @click="handleDelete(item)"><Trash2 class="w-4 h-4" /></button>
          </div>
        </td>
      </tr>
    </UiTable>

    <div v-if="totalPages > 1" class="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="page <= 1" @click="load(page - 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronLeft class="w-4 h-4" /></button>
      <button :disabled="page >= totalPages" @click="load(page + 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronRight class="w-4 h-4" /></button>
    </div>

    <!-- Item form -->
    <UiModal :open="showForm" :title="editing ? `Edit ${editing.name}` : 'New price list item'" size="lg" @close="showForm = false">
      <div v-if="editing" class="flex gap-1 mb-4 border-b border-slate-100 dark:border-dark-border">
        <button v-for="tab in ([['details', 'Details'], ['customers', 'Customer prices']] as const)" :key="tab[0]"
          :class="['px-3 py-2 text-sm font-medium border-b-2 -mb-px', formTab === tab[0] ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700']"
          @click="formTab = tab[0]">{{ tab[1] }}<template v-if="tab[0] === 'customers' && customerPrices.length"> ({{ customerPrices.length }})</template></button>
      </div>

      <div v-show="formTab === 'details'" class="space-y-4">
        <UiInput v-model="form.name" label="Item name" required placeholder="e.g. ADAS - 360 Camera Calibration" :error="errors.name" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <UiInput v-model="form.category" label="Category" placeholder="e.g. ADAS, Coding, Scan" list="price-list-categories" />
            <datalist id="price-list-categories"><option v-for="c in categories" :key="c" :value="c" /></datalist>
          </div>
          <UiSelect v-model="form.lineType" label="Type on the invoice" :options="lineTypeOptions" />
        </div>
        <div class="rounded-lg border border-slate-100 dark:border-dark-border px-3 py-3 space-y-3">
          <UiToggle v-model="form.priced" label="Has a standard price"
            description="Switch off for items priced each time, such as online access that depends on the vehicle." />
          <UiInput v-if="form.priced" v-model="form.defaultPrice" label="Standard price (£, before VAT)" type="number" placeholder="0.00" :error="errors.price" />
        </div>
        <UiToggle v-model="form.isActive" label="Active" description="Inactive items are hidden from the pickers but stay on past jobs and invoices." />
      </div>

      <div v-show="formTab === 'customers'" class="space-y-3">
        <p class="text-sm text-slate-500">Customers listed here pay their own price for this item. Everyone else pays the standard price
          <template v-if="form.priced && form.defaultPrice !== ''"> ({{ gbp(Number(form.defaultPrice)) }})</template>.</p>
        <p v-if="!customerPricesLoaded" class="text-sm text-slate-400 animate-pulse">Loading…</p>
        <template v-else>
          <div v-for="row in customerPrices" :key="row.key" class="flex items-end gap-2">
            <div class="flex-1"><UiSelect v-model="row.customerId" :options="optionsFor(row)" /></div>
            <div class="w-32"><UiInput v-model="row.price" type="number" placeholder="Price £" /></div>
            <button class="p-2 mb-0.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-white/10" title="Remove" @click="removeCustomerPrice(row.key)"><Trash2 class="w-4 h-4" /></button>
          </div>
          <p v-if="customerPrices.length === 0" class="text-sm text-slate-400">No customer prices — everyone pays the standard price.</p>
          <UiButton variant="secondary" size="sm" @click="addCustomerPrice"><Plus class="w-3.5 h-3.5" /> Add customer price</UiButton>
        </template>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="showForm = false">Cancel</UiButton>
        <UiButton :loading="saving" @click="save">{{ editing ? 'Save changes' : 'Add item' }}</UiButton>
      </template>
    </UiModal>

    <!-- Import -->
    <UiModal :open="showImport" title="Import price list" size="lg" @close="showImport = false">
      <div class="space-y-4">
        <p class="text-sm text-slate-500">A CSV file with the columns <strong>name</strong>, <strong>category</strong> and <strong>price</strong>.
          Leave the price empty for items priced on the job. Items already on the list are updated by name.</p>
        <input type="file" accept=".csv,text/csv" class="block text-sm text-slate-500" @change="onImportFile" />
        <textarea v-model="importCsv" rows="6" placeholder="name,category,price&#10;ADAS - 360 Camera Calibration,ADAS,250&#10;Online Access,Other,"
          class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400" />
        <div v-if="importResult" class="rounded-lg border border-slate-100 dark:border-dark-border px-3 py-2.5 text-sm">
          <p class="font-medium text-slate-700 dark:text-slate-200">
            {{ importResult.dryRun ? 'Check' : 'Imported' }}: {{ importResult.total }} rows — {{ importResult.created }} new, {{ importResult.updated }} to update<template v-if="importResult.errors.length">, {{ importResult.errors.length }} with problems</template>
          </p>
          <ul v-if="importResult.errors.length" class="mt-1.5 text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
            <li v-for="e in importResult.errors" :key="e.line">Line {{ e.line }}<template v-if="e.name"> ({{ e.name }})</template>: {{ e.errors.join('; ') }}</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showImport = false">Close</UiButton>
        <UiButton variant="secondary" :loading="importBusy" @click="runImport(true)">Check file</UiButton>
        <UiButton :loading="importBusy" @click="runImport(false)">Import</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
