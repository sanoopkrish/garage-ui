<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import AssetFormModal from '@/components/Assets/AssetFormModal.vue'
import AssetDetailPanel from '@/components/Assets/AssetDetailPanel.vue'
import { Plus, ChevronLeft, ChevronRight, Upload, MapPinned, Trash2, Check, X } from 'lucide-vue-next'
import {
  createAssetArea, deleteAssetArea, getAssetAreas, getAssetStaff, getAssetSummary, getAssets, importAssets, updateAssetArea,
  type Asset, type AssetArea, type AssetSummary, type ImportResult,
} from '@/api/assets.api'
import { getSuppliersBasic } from '@/api/procurement/suppliers.api'
import { AssetCategory, AssetStatus } from '@/types/generated/enums/asset'
import { apiMessage, assetCategoryLabels, assetStatusLabels, assetStatusVariant, formatDate, gbp } from '@/utils/assets'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/** Asset register (Sprint 21): what we own, where it is, when it is due for calibration */
const route = useRoute()
const { hasPermission: canCreate } = usePermissions('menus.assets.register.create')
const { hasPermission: canUpdate } = usePermissions('menus.assets.register.update')
const { hasPermission: canDelete } = usePermissions('menus.assets.register.delete')

const rows = ref<Asset[]>([])
const summary = ref<AssetSummary | null>(null)
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(true)
const searchQuery = ref('')
const categoryFilter = ref('')
const statusFilter = ref('')
const locationFilter = ref('')
const dueFilter = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const staff = ref<{ id: string; name: string }[]>([])
const areas = ref<AssetArea[]>([])
const supplierOptions = ref<{ value: string; label: string }[]>([])

const categoryOptions = [{ value: '', label: 'All categories' }, ...Object.values(AssetCategory).map((c) => ({ value: c, label: assetCategoryLabels[c] }))]
const statusOptions = [{ value: '', label: 'In use, in repair, lost' }, ...Object.values(AssetStatus).map((s) => ({ value: s, label: assetStatusLabels[s] }))]
const dueOptions = [{ value: '', label: 'Any calibration' }, { value: 'overdue', label: 'Calibration overdue' }, { value: '30', label: 'Due within 30 days' }, { value: '90', label: 'Due within 90 days' }, { value: 'warranty', label: 'Warranty ending (30d)' }]
const locationOptions = computed(() => [
  { value: '', label: 'Anywhere' },
  ...staff.value.map((s) => ({ value: `staff:${s.id}`, label: `With ${s.name}` })),
  ...areas.value.map((a) => ({ value: `area:${a.id}`, label: a.name })),
])

async function load(toPage = page.value) {
  loading.value = true
  try {
    const [kind, id] = locationFilter.value.split(':')
    const [result, s] = await Promise.all([
      getAssets({
        search: searchQuery.value || undefined, category: (categoryFilter.value as AssetCategory) || undefined, status: (statusFilter.value as AssetStatus) || undefined,
        locationUserId: kind === 'staff' ? id : undefined, locationId: kind === 'area' ? id : undefined,
        calibrationDue: dueFilter.value && dueFilter.value !== 'warranty' ? dueFilter.value : undefined, warrantyDue: dueFilter.value === 'warranty' || undefined,
        page: toPage, pageSize,
      }),
      getAssetSummary(),
    ])
    rows.value = result.items
    total.value = result.total
    page.value = toPage
    summary.value = s
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to load the register'))
  } finally {
    loading.value = false
  }
}
let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => load(1), 300) }
async function loadPickers() {
  const [s, a, sup] = await Promise.all([getAssetStaff().catch(() => []), getAssetAreas().catch(() => []), getSuppliersBasic().catch(() => [])])
  staff.value = s
  areas.value = a
  supplierOptions.value = sup.map((x) => ({ value: x.id, label: x.name }))
}

// Form + detail
const showForm = ref(false)
const editing = ref<Asset | null>(null)
const showDetail = ref(false)
const detailId = ref<string | null>(null)
function openDetail(id: string) { detailId.value = id; showDetail.value = true }
function openForm(asset: Asset | null = null) { editing.value = asset; showForm.value = true }
async function onSaved(saved: Asset) {
  await load(editing.value ? page.value : 1)
  openDetail(saved.id)
}

// Workshop areas
const showAreas = ref(false)
const newArea = ref('')
const areaBusy = ref('')
async function addArea() {
  if (!newArea.value.trim()) return
  areaBusy.value = 'add'
  try { await createAssetArea(newArea.value.trim()); newArea.value = ''; areas.value = await getAssetAreas(true) } catch (err) { ToastService.error(apiMessage(err, 'Failed to add the area')) } finally { areaBusy.value = '' }
}
async function toggleArea(area: AssetArea) {
  areaBusy.value = area.id
  try { await updateAssetArea(area.id, { isActive: !area.isActive }); areas.value = await getAssetAreas(true) } catch (err) { ToastService.error(apiMessage(err, 'Failed to update the area')) } finally { areaBusy.value = '' }
}
async function removeArea(area: AssetArea) {
  const result = await showConfirmDialog(`Delete the area "${area.name}"?`, true, 'Delete')
  if (!result.isConfirmed) return
  try { await deleteAssetArea(area.id); areas.value = await getAssetAreas(true) } catch (err) { ToastService.error(apiMessage(err, 'Failed to delete the area')) }
}
function closeAreas() { showAreas.value = false; getAssetAreas().then((a) => { areas.value = a }).catch(() => {}) }

// CSV import
const showImport = ref(false)
const importState = reactive({ csv: '', fileName: '', result: null as ImportResult | null, busy: false })
const csvInput = ref<HTMLInputElement | null>(null)
async function onCsv(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importState.csv = await file.text()
  importState.fileName = file.name
  importState.result = null
  await checkImport()
}
async function checkImport() {
  importState.busy = true
  try { importState.result = await importAssets(importState.csv, true) } catch (err) { ToastService.error(apiMessage(err, 'The file could not be read')); importState.result = null } finally { importState.busy = false }
}
async function runImport() {
  importState.busy = true
  try {
    const result = await importAssets(importState.csv, false)
    ToastService.success(`${result.created} item${result.created === 1 ? '' : 's'} added to the register`)
    showImport.value = false
    importState.csv = ''; importState.fileName = ''; importState.result = null
    await load(1)
  } catch (err) { ToastService.error(apiMessage(err, 'Import failed')) } finally { importState.busy = false }
}

onMounted(async () => {
  await loadPickers()
  await load(1)
  if (typeof route.query.open === 'string') openDetail(route.query.open)
})
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Asset register" subtitle="What the workshop owns, where it is, and when it is due for calibration.">
      <UiButton v-if="canUpdate" variant="secondary" @click="showAreas = true; getAssetAreas(true).then((a) => { areas = a })"><MapPinned class="w-4 h-4" /> Workshop areas</UiButton>
      <UiButton v-if="canCreate" variant="secondary" @click="showImport = true"><Upload class="w-4 h-4" /> Import CSV</UiButton>
      <UiButton v-if="canCreate" @click="openForm()"><Plus class="w-4 h-4" /> Add item</UiButton>
    </UiPageHeader>

    <div v-if="summary" class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
      <div class="rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface p-3"><p class="text-xs text-slate-400">Items</p><p class="text-xl font-semibold text-slate-800 dark:text-slate-100">{{ summary.items }}</p><p class="text-xs text-slate-400">{{ summary.inRepair }} in repair · {{ summary.lost }} lost</p></div>
      <div class="rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface p-3"><p class="text-xs text-slate-400">Purchase cost</p><p class="text-xl font-semibold text-slate-800 dark:text-slate-100">{{ gbp(summary.purchaseCost) }}</p></div>
      <div class="rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface p-3"><p class="text-xs text-slate-400">Book value</p><p class="text-xl font-semibold text-slate-800 dark:text-slate-100">{{ gbp(summary.bookValue) }}</p></div>
      <button class="rounded-lg border p-3 text-left" :class="summary.calibrationOverdue ? 'border-red-200 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface'" @click="dueFilter = summary.calibrationOverdue ? 'overdue' : '30'; load(1)">
        <p class="text-xs text-slate-400">Calibration</p><p class="text-xl font-semibold" :class="summary.calibrationOverdue ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'">{{ summary.calibrationOverdue }} overdue</p><p class="text-xs text-slate-400">{{ summary.calibrationDueSoon }} due within 30 days</p>
      </button>
      <button class="rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface p-3 text-left" @click="dueFilter = 'warranty'; load(1)"><p class="text-xs text-slate-400">Warranty ending (30d)</p><p class="text-xl font-semibold text-slate-800 dark:text-slate-100">{{ summary.warrantyExpiring }}</p></button>
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-5">
      <div class="w-60"><UiSearchInput v-model="searchQuery" placeholder="Search name, tag, serial…" @update:modelValue="onSearch" /></div>
      <div class="w-44"><UiSelect v-model="categoryFilter" :options="categoryOptions" @update:modelValue="load(1)" /></div>
      <div class="w-44"><UiSelect v-model="statusFilter" :options="statusOptions" @update:modelValue="load(1)" /></div>
      <div class="w-48"><UiSelect v-model="locationFilter" :options="locationOptions" @update:modelValue="load(1)" /></div>
      <div class="w-48"><UiSelect v-model="dueFilter" :options="dueOptions" @update:modelValue="load(1)" /></div>
      <span class="text-sm text-slate-400 ml-auto">{{ total }} items</span>
    </div>

    <UiTable :headers="['Tag', 'Item', 'Where', 'Next calibration', 'Book value', 'Status']">
      <template v-if="loading && rows.length === 0">
        <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse"><td v-for="col in 6" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded" /></td></tr>
      </template>
      <template v-else-if="rows.length === 0">
        <tr><td colspan="6" class="px-4 py-10 text-center text-sm text-slate-400">Nothing on the register matches.</td></tr>
      </template>
      <tr v-else v-for="a in rows" :key="a.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" @click="openDetail(a.id)">
        <td class="px-4 py-3.5 font-mono text-sm text-slate-500">{{ a.assetTag }}</td>
        <td class="px-4 py-3.5">
          <span class="font-semibold text-slate-700 dark:text-slate-200">{{ a.name }}</span>
          <p class="text-xs text-slate-400">{{ [assetCategoryLabels[a.category], a.make, a.model, a.serialNumber ? `S/N ${a.serialNumber}` : ''].filter(Boolean).join(' · ') }}</p>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">{{ a.locationLabel }}</td>
        <td class="px-4 py-3.5 text-sm" :class="a.calibrationOverdue ? 'text-red-600 font-medium' : 'text-slate-500'">{{ a.calibrationIntervalMonths ? formatDate(a.nextCalibrationDue) : '—' }}</td>
        <td class="px-4 py-3.5 text-sm text-slate-500">{{ gbp(a.bookValue) }}</td>
        <td class="px-4 py-3.5"><UiBadge :variant="(assetStatusVariant[a.status] as any)" dot>{{ assetStatusLabels[a.status] }}</UiBadge></td>
      </tr>
    </UiTable>

    <div v-if="totalPages > 1" class="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="page <= 1" @click="load(page - 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronLeft class="w-4 h-4" /></button>
      <button :disabled="page >= totalPages" @click="load(page + 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronRight class="w-4 h-4" /></button>
    </div>

    <AssetDetailPanel v-model="showDetail" :assetId="detailId" :staff="staff" :areas="areas" @changed="load()" @edit="openForm" />
    <AssetFormModal :open="showForm" :asset="editing" :staff="staff" :areas="areas" :supplierOptions="supplierOptions" @close="showForm = false" @saved="onSaved" />

    <UiModal :open="showAreas" title="Workshop areas" @close="closeAreas">
      <p class="text-sm text-slate-500 mb-3">The places kit can be kept when it is not with someone.</p>
      <ul class="divide-y divide-slate-100 dark:divide-dark-border mb-3">
        <li v-for="area in areas" :key="area.id" class="flex items-center gap-3 py-2 text-sm">
          <span :class="area.isActive ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 line-through'">{{ area.name }}</span>
          <span class="text-xs text-slate-400">{{ area.assetCount ?? 0 }} item{{ area.assetCount === 1 ? '' : 's' }}</span>
          <div class="ml-auto flex gap-1">
            <button class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10" :title="area.isActive ? 'Stop using' : 'Use again'" @click="toggleArea(area)"><X v-if="area.isActive" class="w-4 h-4" /><Check v-else class="w-4 h-4" /></button>
            <button v-if="canDelete" class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/10" title="Delete" @click="removeArea(area)"><Trash2 class="w-4 h-4" /></button>
          </div>
        </li>
        <li v-if="!areas.length" class="py-3 text-sm text-slate-400">No areas yet.</li>
      </ul>
      <div class="flex items-end gap-2">
        <div class="flex-1"><UiInput v-model="newArea" label="New area" placeholder="e.g. ADAS bay" /></div>
        <UiButton :loading="areaBusy === 'add'" :disabled="!newArea.trim()" @click="addArea">Add</UiButton>
      </div>
      <template #footer><UiButton @click="closeAreas">Done</UiButton></template>
    </UiModal>

    <UiModal :open="showImport" title="Import from a spreadsheet" size="lg" @close="showImport = false">
      <div class="space-y-4">
        <p class="text-sm text-slate-500">Save the list as CSV with a header line. Columns we read: <strong>name</strong>, category, make, model, serial, purchase date, cost, <strong>location</strong> (a staff member's name or email, or a workshop area), calibration interval months, last calibrated. Anything else is ignored.</p>
        <button type="button" class="w-full rounded-lg border-2 border-dashed border-slate-200 dark:border-dark-border px-4 py-5 text-sm text-slate-500 hover:border-brand-300" @click="csvInput?.click()">{{ importState.fileName || 'Choose the CSV file' }}</button>
        <input ref="csvInput" type="file" accept=".csv,text/csv" class="hidden" @change="onCsv" />
        <div v-if="importState.busy" class="h-10 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />
        <div v-else-if="importState.result" class="space-y-2">
          <p class="text-sm" :class="importState.result.valid === importState.result.total ? 'text-green-700' : 'text-amber-700'">
            {{ importState.result.valid }} of {{ importState.result.total }} rows can be imported{{ importState.result.valid < importState.result.total ? ' — the rest are skipped:' : '.' }}
          </p>
          <ul v-if="importState.result.rows.some((r) => r.errors.length)" class="max-h-48 overflow-y-auto text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <li v-for="r in importState.result.rows.filter((x) => x.errors.length)" :key="r.line"><strong>Line {{ r.line }}</strong> {{ r.name ? `(${r.name})` : '' }}: {{ r.errors.join('; ') }}</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showImport = false">Cancel</UiButton>
        <UiButton :loading="importState.busy" :disabled="!importState.result || !importState.result.valid" @click="runImport">Import {{ importState.result?.valid || '' }} item{{ importState.result?.valid === 1 ? '' : 's' }}</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
