<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import BillFormModal from '@/components/Procurement/BillFormModal.vue'
import BillDetailPanel from '@/components/Procurement/BillDetailPanel.vue'
import { Plus, ChevronLeft, ChevronRight, CalendarClock } from 'lucide-vue-next'
import { getBills, getBillsDueThisWeek, type SupplierBill } from '@/api/procurement/bills.api'
import { SupplierInvoiceMatchStatus, SupplierInvoiceStatus } from '@/types/generated/enums/procurement'
import { apiMessage, billStatusLabels, billStatusVariant, formatDate, gbp, matchStatusLabels } from '@/utils/procurement'
import { useProcurementStore } from '@/stores/procurement.store'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/** Purchasing → Supplier invoices (Sprint 23): inbox with what is due, order match and upload */
const route = useRoute()
const procurement = useProcurementStore()
const { hasPermission: canManage } = usePermissions('menus.finance.procurement.manageBills')

const rows = ref<SupplierBill[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(true)
const switchedOff = ref(false)
const searchQuery = ref('')
const statusFilter = ref<'' | SupplierInvoiceStatus>('')
const matchFilter = ref<'' | SupplierInvoiceMatchStatus>('')
const supplierFilter = ref('')
const due = ref<{ total: number; totalDue: number; overdue: number }>({ total: 0, totalDue: 0, overdue: 0 })
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const statusOptions = [{ value: '', label: 'All statuses' }, ...Object.values(SupplierInvoiceStatus).map((s) => ({ value: s, label: billStatusLabels[s] }))]
const matchOptions = [{ value: '', label: 'Any match' }, ...Object.values(SupplierInvoiceMatchStatus).map((m) => ({ value: m, label: matchStatusLabels[m] }))]
const supplierOptions = computed(() => [{ value: '', label: 'All suppliers' }, ...procurement.supplierOptions])

async function load(toPage = page.value) {
  loading.value = true
  try {
    const [result, dueNow] = await Promise.all([
      getBills({
        search: searchQuery.value || undefined, status: statusFilter.value || undefined, matchStatus: matchFilter.value || undefined,
        supplierId: supplierFilter.value || undefined, page: toPage, pageSize,
      }),
      getBillsDueThisWeek().catch(() => null),
    ])
    rows.value = result.items
    total.value = result.total
    page.value = toPage
    if (dueNow) due.value = { total: dueNow.total, totalDue: dueNow.totalDue, overdue: dueNow.items.filter((b) => b.isOverdue).length }
  } catch (err: any) {
    if (err?.response?.status === 403 && String(err.response?.data?.message ?? '').includes('Feature not enabled')) switchedOff.value = true
    else ToastService.error(apiMessage(err, 'Failed to load supplier invoices'))
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(1), 300)
}

const showForm = ref(false)
const showDetail = ref(false)
const detailId = ref<string | null>(null)
function openDetail(id: string) {
  detailId.value = id
  showDetail.value = true
}
async function onCreated(bill: SupplierBill) {
  await load(1)
  openDetail(bill.id)
}

onMounted(async () => {
  await procurement.fetchSettings()
  procurement.fetchSuppliers().catch(() => {})
  await load(1)
  if (typeof route.query.open === 'string') openDetail(route.query.open)
})
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Supplier invoices" subtitle="Invoices from your suppliers — checked against what was ordered and received before they are approved.">
      <UiButton v-if="canManage && !switchedOff" @click="showForm = true"><Plus class="w-4 h-4" /> Add supplier invoice</UiButton>
    </UiPageHeader>

    <div v-if="switchedOff" class="rounded-lg border border-slate-200 dark:border-dark-border p-8 text-center text-sm text-slate-500">
      Supplier invoices are switched off for this organisation. They can be switched on in Settings → Purchasing.
    </div>

    <template v-else>
      <div v-if="due.total > 0" class="flex items-center gap-3 mb-5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        <CalendarClock class="w-4 h-4 flex-shrink-0" />
        <span><strong>{{ gbp(due.totalDue) }}</strong> across {{ due.total }} invoice{{ due.total === 1 ? '' : 's' }} is due in the next 7 days{{ due.overdue ? ` — ${due.overdue} already overdue` : '' }}.</span>
      </div>

      <div class="flex flex-wrap items-center gap-3 mb-5">
        <div class="w-64"><UiSearchInput v-model="searchQuery" placeholder="Search invoice number or supplier…" @update:modelValue="onSearch" /></div>
        <div class="w-44"><UiSelect v-model="statusFilter" :options="statusOptions" @update:modelValue="load(1)" /></div>
        <div class="w-40"><UiSelect v-model="matchFilter" :options="matchOptions" @update:modelValue="load(1)" /></div>
        <div class="w-48"><UiSelect v-model="supplierFilter" :options="supplierOptions" @update:modelValue="load(1)" /></div>
        <span class="text-sm text-slate-400 ml-auto">{{ total }} invoices</span>
      </div>

      <UiTable :headers="['Invoice', 'Supplier', 'For order', 'Due', 'Total', 'Order check', 'Status']">
        <template v-if="loading && rows.length === 0">
          <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse">
            <td v-for="col in 7" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded" /></td>
          </tr>
        </template>
        <template v-else-if="rows.length === 0">
          <tr><td colspan="7" class="px-4 py-10 text-center text-sm text-slate-400">No supplier invoices found.</td></tr>
        </template>
        <tr v-else v-for="b in rows" :key="b.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" @click="openDetail(b.id)">
          <td class="px-4 py-3.5">
            <span class="font-semibold text-slate-700 dark:text-slate-200">{{ b.invoiceNumber }}</span>
            <span v-if="b.captureSource === 'field'" class="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Field receipt</span>
            <p class="text-xs text-slate-400">{{ formatDate(b.invoiceDate) }}</p>
          </td>
          <td class="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">{{ b.supplierName }}</td>
          <td class="px-4 py-3.5 text-sm text-slate-500">{{ b.allocations.map((a) => a.orderNumber).join(', ') || '—' }}</td>
          <td class="px-4 py-3.5 text-sm" :class="b.isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'">{{ formatDate(b.dueDate) }}</td>
          <td class="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200">{{ gbp(b.total) }}</td>
          <td class="px-4 py-3.5 text-sm">
            <span v-if="b.matchStatus === SupplierInvoiceMatchStatus.MATCHED" class="text-green-600">Matches</span>
            <span v-else-if="b.matchStatus === SupplierInvoiceMatchStatus.VARIANCE" class="text-red-600 font-medium">{{ gbp(Math.abs(b.varianceAmount)) }} {{ b.varianceAmount > 0 ? 'over' : 'under' }}</span>
            <span v-else class="text-slate-400">No order</span>
          </td>
          <td class="px-4 py-3.5">
            <div class="flex items-center gap-1.5">
              <UiBadge :variant="(billStatusVariant[b.status] as any)" dot>{{ billStatusLabels[b.status] }}</UiBadge>
              <UiBadge v-if="b.accountingSyncStatus === 'synced'" variant="done">Xero ✓</UiBadge>
              <UiBadge v-else-if="b.accountingSyncStatus === 'error'" variant="cancelled">Xero failed</UiBadge>
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

    <BillFormModal :open="showForm" @close="showForm = false" @saved="onCreated" />
    <BillDetailPanel v-model="showDetail" :billId="detailId" @changed="load()" />
  </DefaultLayout>
</template>
