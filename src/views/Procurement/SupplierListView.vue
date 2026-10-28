<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import GeneralSliderPanel from '@/components/Ui/GeneralSliderPanel.vue'
import SupplierFormModal from '@/components/Procurement/SupplierFormModal.vue'
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Merge, Star } from 'lucide-vue-next'
import { deleteSupplier, getSupplier, getSuppliers, mergeSupplier, type Supplier } from '@/api/procurement/suppliers.api'
import { getCombinedOrders, type CombinedOrderRow } from '@/api/procurement/purchase-orders.api'
import { getBills, type SupplierBill } from '@/api/procurement/bills.api'
import { SupplierCategory, SupplierStatus } from '@/types/generated/enums/procurement'
import {
  apiMessage, billStatusLabels, billStatusVariant, formatDate, gbp, orderStatusLabels, orderStatusVariant,
  supplierCategoryLabels, supplierStatusLabels, supplierStatusVariant,
} from '@/utils/procurement'
import { useProcurementStore } from '@/stores/procurement.store'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/** Suppliers (Sprint 23) — list + modal form (psa-ui SupplierList), detail slider with orders and invoices, merge */
const router = useRouter()
const procurement = useProcurementStore()
const { hasPermission: canUpdate } = usePermissions('menus.finance.suppliers.update')
const { hasPermission: canSeeOrders } = usePermissions('menus.finance.procurement.read')

const rows = ref<Supplier[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref<'' | SupplierStatus>('')
const categoryFilter = ref<'' | SupplierCategory>('')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const statusOptions = [{ value: '', label: 'All statuses' }, ...Object.values(SupplierStatus).map((s) => ({ value: s, label: supplierStatusLabels[s] }))]
const categoryOptions = [{ value: '', label: 'All categories' }, ...Object.values(SupplierCategory).map((c) => ({ value: c, label: supplierCategoryLabels[c] }))]

async function load(toPage = page.value) {
  loading.value = true
  try {
    const result = await getSuppliers({
      search: searchQuery.value || undefined, status: statusFilter.value || undefined, category: categoryFilter.value || undefined,
      page: toPage, pageSize,
    })
    rows.value = result.items
    total.value = result.total
    page.value = toPage
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to load suppliers'))
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(1), 300)
}

// Form
const showForm = ref(false)
const editing = ref<Supplier | null>(null)
function openForm(supplier: Supplier | null = null) {
  editing.value = supplier
  showForm.value = true
}
async function onSaved(saved: Supplier) {
  await load(editing.value ? page.value : 1)
  if (detail.value?.id === saved.id) openDetail(saved)
}

// Detail slider
const showDetail = ref(false)
const detail = ref<Supplier | null>(null)
const detailLoading = ref(false)
const detailOrders = ref<CombinedOrderRow[]>([])
const detailBills = ref<SupplierBill[]>([])
const spend = computed(() => detailBills.value.filter((b) => b.status !== 'void').reduce((s, b) => s + b.total, 0))
const owed = computed(() => detailBills.value.filter((b) => !['void', 'paid'].includes(b.status)).reduce((s, b) => s + b.balance, 0))

async function openDetail(supplier: Supplier) {
  showDetail.value = true
  detailLoading.value = true
  detail.value = supplier
  detailOrders.value = []
  detailBills.value = []
  try {
    detail.value = await getSupplier(supplier.id)
    if (canSeeOrders.value) {
      await procurement.fetchSettings()
      const [orders, bills] = await Promise.all([
        getCombinedOrders({ supplierId: supplier.id, pageSize: 50 }).catch(() => ({ items: [] })),
        procurement.billsEnabled ? getBills({ supplierId: supplier.id, pageSize: 50 }).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
      ])
      detailOrders.value = orders.items
      detailBills.value = bills.items as SupplierBill[]
    }
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to load the supplier'))
  } finally {
    detailLoading.value = false
  }
}

async function handleDelete(supplier: Supplier) {
  const result = await showConfirmDialog(`Delete ${supplier.name}? This cannot be undone.`, true, 'Delete')
  if (!result.isConfirmed) return
  try {
    await deleteSupplier(supplier.id)
    ToastService.success('Supplier deleted')
    showDetail.value = false
    await load()
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to delete the supplier'))
  }
}

// Merge — tidy duplicates such as "Euro Car Parts" and "ECP"
const merging = ref<Supplier | null>(null)
const mergeTargetId = ref('')
const mergeBusy = ref(false)
const mergeOptions = computed(() => procurement.suppliers.filter((s) => s.id !== merging.value?.id).map((s) => ({ value: s.id, label: s.name })))
async function openMerge(supplier: Supplier) {
  merging.value = supplier
  mergeTargetId.value = ''
  try { await procurement.fetchSuppliers() } catch { ToastService.error('Failed to load suppliers') }
}
async function submitMerge() {
  if (!merging.value || !mergeTargetId.value) return
  mergeBusy.value = true
  try {
    const target = await mergeSupplier(merging.value.id, mergeTargetId.value)
    ToastService.success(`${merging.value.name} merged into ${target.name}`)
    merging.value = null
    showDetail.value = false
    await load()
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to merge the suppliers'))
  } finally {
    mergeBusy.value = false
  }
}

function addressLine(supplier: Supplier): string {
  return [supplier.address?.street, supplier.address?.city, supplier.address?.postcode].filter(Boolean).join(', ')
}

onMounted(() => load(1))
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Suppliers" subtitle="Who you buy from — contact details, terms and what you have ordered from each.">
      <UiButton v-if="canUpdate" @click="openForm()"><Plus class="w-4 h-4" /> New supplier</UiButton>
    </UiPageHeader>

    <div class="flex flex-wrap items-center gap-3 mb-5">
      <div class="w-64"><UiSearchInput v-model="searchQuery" placeholder="Search name, contact, email…" @update:modelValue="onSearch" /></div>
      <div class="w-40"><UiSelect v-model="statusFilter" :options="statusOptions" @update:modelValue="load(1)" /></div>
      <div class="w-44"><UiSelect v-model="categoryFilter" :options="categoryOptions" @update:modelValue="load(1)" /></div>
      <span class="text-sm text-slate-400 ml-auto">{{ total }} suppliers</span>
    </div>

    <UiTable :headers="['Supplier', 'Contact', 'Supplies', 'Terms', 'Orders', 'Status', '']">
      <template v-if="loading && rows.length === 0">
        <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in 7" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded" /></td>
        </tr>
      </template>
      <template v-else-if="rows.length === 0">
        <tr><td colspan="7" class="px-4 py-10 text-center text-sm text-slate-400">No suppliers found.</td></tr>
      </template>
      <tr v-else v-for="s in rows" :key="s.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" @click="openDetail(s)">
        <td class="px-4 py-3.5">
          <span class="font-semibold text-slate-700 dark:text-slate-200">{{ s.name }}</span>
          <Star v-if="s.preferred" class="inline w-3.5 h-3.5 ml-1 text-amber-400 fill-amber-400" />
          <p v-if="s.accountRef" class="text-xs text-slate-400">Account {{ s.accountRef }}</p>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-500">
          <p>{{ s.contactPerson || '—' }}</p>
          <p v-if="s.email" class="text-xs text-slate-400">{{ s.email }}</p>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-500">{{ s.categories.map((c) => supplierCategoryLabels[c] ?? c).join(', ') || '—' }}</td>
        <td class="px-4 py-3.5 text-sm text-slate-500">{{ s.paymentTermsDays != null ? `${s.paymentTermsDays} days` : '—' }}</td>
        <td class="px-4 py-3.5 text-sm text-slate-500">{{ s.orderCount ?? 0 }}</td>
        <td class="px-4 py-3.5"><UiBadge :variant="(supplierStatusVariant[s.status] as any)" dot>{{ supplierStatusLabels[s.status] }}</UiBadge></td>
        <td class="px-4 py-3.5" @click.stop>
          <div v-if="canUpdate" class="flex items-center justify-end gap-1">
            <button class="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-white/10" title="Edit" @click="openForm(s)"><Pencil class="w-4 h-4" /></button>
          </div>
        </td>
      </tr>
    </UiTable>

    <div v-if="totalPages > 1" class="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="page <= 1" @click="load(page - 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronLeft class="w-4 h-4" /></button>
      <button :disabled="page >= totalPages" @click="load(page + 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronRight class="w-4 h-4" /></button>
    </div>

    <!-- Detail slider -->
    <GeneralSliderPanel v-model="showDetail" :title="detail?.name ?? 'Supplier'" :subtitle="detail?.contactPerson ?? ''" size="lg">
      <div v-if="!detail" class="h-40 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />
      <div v-else class="space-y-5">
        <div class="flex flex-wrap items-center gap-2">
          <UiBadge :variant="(supplierStatusVariant[detail.status] as any)" dot>{{ supplierStatusLabels[detail.status] }}</UiBadge>
          <UiBadge v-if="detail.preferred" variant="progress">Preferred</UiBadge>
          <div v-if="canUpdate" class="ml-auto flex items-center gap-2">
            <UiButton variant="secondary" size="sm" @click="openForm(detail)"><Pencil class="w-3.5 h-3.5" /> Edit</UiButton>
            <UiButton variant="secondary" size="sm" @click="openMerge(detail)"><Merge class="w-3.5 h-3.5" /> Merge</UiButton>
            <UiButton variant="danger" size="sm" @click="handleDelete(detail)"><Trash2 class="w-3.5 h-3.5" /> Delete</UiButton>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><p class="text-xs text-slate-400">Email</p><p class="text-slate-700 dark:text-slate-200">{{ detail.email || '—' }}</p></div>
          <div><p class="text-xs text-slate-400">Phone</p><p class="text-slate-700 dark:text-slate-200">{{ detail.phone || '—' }}</p></div>
          <div><p class="text-xs text-slate-400">Address</p><p class="text-slate-700 dark:text-slate-200">{{ addressLine(detail) || '—' }}</p></div>
          <div><p class="text-xs text-slate-400">Our account number</p><p class="text-slate-700 dark:text-slate-200">{{ detail.accountRef || '—' }}</p></div>
          <div><p class="text-xs text-slate-400">Payment terms</p><p class="text-slate-700 dark:text-slate-200">{{ detail.paymentTermsDays != null ? `${detail.paymentTermsDays} days` : '—' }}</p></div>
          <div><p class="text-xs text-slate-400">VAT number</p><p class="text-slate-700 dark:text-slate-200">{{ detail.taxId || '—' }}</p></div>
          <div><p class="text-xs text-slate-400">Supplies</p><p class="text-slate-700 dark:text-slate-200">{{ detail.categories.map((c) => supplierCategoryLabels[c] ?? c).join(', ') || '—' }}</p></div>
          <div><p class="text-xs text-slate-400">Bank details</p>
            <p class="text-slate-700 dark:text-slate-200 whitespace-pre-line">{{ detail.bankDetails || (detail.hasBankDetails ? 'On file' : '—') }}</p></div>
        </div>
        <p v-if="detail.notes" class="text-sm text-slate-500 whitespace-pre-line">{{ detail.notes }}</p>

        <template v-if="canSeeOrders">
          <div v-if="procurement.billsEnabled" class="grid grid-cols-2 gap-3">
            <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3">
              <p class="text-xs text-slate-400">Invoiced by this supplier</p>
              <p class="text-lg font-semibold text-slate-800 dark:text-slate-100">{{ gbp(spend) }}</p>
            </div>
            <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3">
              <p class="text-xs text-slate-400">Still to pay</p>
              <p class="text-lg font-semibold text-slate-800 dark:text-slate-100">{{ gbp(owed) }}</p>
            </div>
          </div>

          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Orders</p>
            <div v-if="detailLoading" class="h-16 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />
            <p v-else-if="!detailOrders.length" class="text-sm text-slate-400">Nothing ordered from this supplier yet.</p>
            <ul v-else class="divide-y divide-slate-50 dark:divide-dark-border text-sm">
              <li v-for="o in detailOrders" :key="o.id" class="flex items-center gap-3 py-2">
                <button class="font-medium text-brand-600 hover:underline" @click="router.push(o.type === 'purchase' ? `/procurement/orders?open=${o.id}` : '/inventory')">{{ o.number }}</button>
                <UiBadge :variant="(orderStatusVariant[o.status] as any)">{{ orderStatusLabels[o.status] ?? o.status }}</UiBadge>
                <span class="text-xs text-slate-400">{{ formatDate(o.createdAt) }}</span>
                <span class="ml-auto text-slate-600 dark:text-slate-300">{{ gbp(o.grossTotal) }}</span>
              </li>
            </ul>
          </div>

          <div v-if="procurement.billsEnabled">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Supplier invoices</p>
            <div v-if="detailLoading" class="h-16 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />
            <p v-else-if="!detailBills.length" class="text-sm text-slate-400">No invoices entered for this supplier yet.</p>
            <ul v-else class="divide-y divide-slate-50 dark:divide-dark-border text-sm">
              <li v-for="b in detailBills" :key="b.id" class="flex items-center gap-3 py-2">
                <button class="font-medium text-brand-600 hover:underline" @click="router.push(`/procurement/bills?open=${b.id}`)">{{ b.invoiceNumber }}</button>
                <UiBadge :variant="(billStatusVariant[b.status] as any)">{{ billStatusLabels[b.status] }}</UiBadge>
                <span class="text-xs text-slate-400">{{ formatDate(b.invoiceDate) }}</span>
                <span class="ml-auto text-slate-600 dark:text-slate-300">{{ gbp(b.total) }}</span>
              </li>
            </ul>
          </div>
        </template>
      </div>
    </GeneralSliderPanel>

    <SupplierFormModal :open="showForm" :supplier="editing" @close="showForm = false" @saved="onSaved" />

    <UiModal :open="!!merging" title="Merge supplier" @close="merging = null">
      <p class="text-sm text-slate-500 mb-3">
        Every order and invoice of <strong>{{ merging?.name }}</strong> moves to the supplier you pick, and {{ merging?.name }} is removed. Use this to tidy duplicates.
      </p>
      <UiSelect v-model="mergeTargetId" label="Merge into" :options="mergeOptions" placeholder="Choose the supplier to keep" required />
      <template #footer>
        <UiButton variant="ghost" @click="merging = null">Cancel</UiButton>
        <UiButton variant="danger" :loading="mergeBusy" :disabled="!mergeTargetId" @click="submitMerge">Merge</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
