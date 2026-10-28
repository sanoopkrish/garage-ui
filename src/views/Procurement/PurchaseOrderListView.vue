<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import PurchaseOrderDetailPanel from '@/components/Procurement/PurchaseOrderDetailPanel.vue'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { getCombinedOrders, getPendingApprovals, type CombinedOrderRow, type PurchaseOrder } from '@/api/procurement/purchase-orders.api'
import { PurchaseOrderKind, PurchaseOrderStatus } from '@/types/generated/enums/procurement'
import { apiMessage, formatDate, gbp, orderKindLabels, orderStatusLabels, orderStatusVariant } from '@/utils/procurement'
import { useProcurementStore } from '@/stores/procurement.store'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/**
 * Purchasing → Orders (Sprint 23). ONE list for everything ordered: purchase orders and the
 * job parts orders raised from the Parts screen, so staff have a single place to look.
 */
const route = useRoute()
const router = useRouter()
const procurement = useProcurementStore()
const { hasPermission: canCreate } = usePermissions('menus.finance.procurement.createOrder')
const { hasPermission: canApprove } = usePermissions('menus.finance.procurement.approveOrder')

const activeTab = ref<'all' | 'pending'>('all')
const rows = ref<CombinedOrderRow[]>([])
const pending = ref<PurchaseOrder[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(true)
const switchedOff = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const kindFilter = ref('')
const supplierFilter = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const showApprovals = computed(() => procurement.approvalsEnabled && canApprove.value)

const statusOptions = [
  { value: '', label: 'All statuses' },
  ...Object.values(PurchaseOrderStatus).map((s) => ({ value: s, label: orderStatusLabels[s] })),
]
const kindOptions = [
  { value: '', label: 'All types' },
  ...Object.values(PurchaseOrderKind).map((k) => ({ value: k, label: orderKindLabels[k] })),
  { value: 'job_parts', label: 'Job parts' },
]
const supplierOptions = computed(() => [{ value: '', label: 'All suppliers' }, ...procurement.supplierOptions])

async function load(toPage = page.value) {
  loading.value = true
  try {
    const [result, approvals] = await Promise.all([
      getCombinedOrders({
        search: searchQuery.value || undefined, status: statusFilter.value || undefined, kind: kindFilter.value || undefined,
        supplierId: supplierFilter.value || undefined, page: toPage, pageSize,
      }),
      showApprovals.value ? getPendingApprovals().catch(() => []) : Promise.resolve([]),
    ])
    rows.value = result.items
    total.value = result.total
    page.value = toPage
    pending.value = approvals
  } catch (err: any) {
    if (err?.response?.status === 403 && String(err.response?.data?.message ?? '').includes('Feature not enabled')) switchedOff.value = true
    else ToastService.error(apiMessage(err, 'Failed to load orders'))
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(1), 300)
}

// Detail slider (purchase orders); job parts orders live on the Parts screen
const showDetail = ref(false)
const detailId = ref<string | null>(null)
function openRow(row: { id: string; type?: string }) {
  if (row.type === 'parts') { router.push('/inventory'); return }
  detailId.value = row.id
  showDetail.value = true
}

onMounted(async () => {
  await procurement.fetchSettings()
  procurement.fetchSuppliers().catch(() => {})
  await load(1)
  // deep link from a supplier / invoice: /procurement/orders?open=<id>
  if (typeof route.query.open === 'string') openRow({ id: route.query.open })
})
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Orders" subtitle="Everything you have ordered — purchase orders and the parts ordered for jobs.">
      <UiButton v-if="canCreate && !switchedOff" @click="router.push('/procurement/orders/new')"><Plus class="w-4 h-4" /> New purchase order</UiButton>
    </UiPageHeader>

    <div v-if="switchedOff" class="rounded-lg border border-slate-200 dark:border-dark-border p-8 text-center text-sm text-slate-500">
      Purchasing is switched off for this organisation. It can be switched on in Settings → Purchasing.
    </div>

    <template v-else>
      <div v-if="showApprovals" class="flex items-center gap-1 mb-5 border-b border-slate-200 dark:border-dark-border">
        <button
          v-for="t in [{ key: 'all', label: 'All orders' }, { key: 'pending', label: `Waiting for approval (${pending.length})` }]"
          :key="t.key"
          :class="['px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === t.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300']"
          @click="activeTab = t.key as typeof activeTab"
        >{{ t.label }}</button>
      </div>

      <template v-if="activeTab === 'all'">
        <div class="flex flex-wrap items-center gap-3 mb-5">
          <div class="w-64"><UiSearchInput v-model="searchQuery" placeholder="Search order number or supplier…" @update:modelValue="onSearch" /></div>
          <div class="w-44"><UiSelect v-model="statusFilter" :options="statusOptions" @update:modelValue="load(1)" /></div>
          <div class="w-40"><UiSelect v-model="kindFilter" :options="kindOptions" @update:modelValue="load(1)" /></div>
          <div class="w-48"><UiSelect v-model="supplierFilter" :options="supplierOptions" @update:modelValue="load(1)" /></div>
          <span class="text-sm text-slate-400 ml-auto">{{ total }} orders</span>
        </div>

        <UiTable :headers="['Order', 'Type', 'Supplier', 'Job', 'Expected', 'Total', 'Status']">
          <template v-if="loading && rows.length === 0">
            <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse">
              <td v-for="col in 7" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded" /></td>
            </tr>
          </template>
          <template v-else-if="rows.length === 0">
            <tr><td colspan="7" class="px-4 py-10 text-center text-sm text-slate-400">No orders found.</td></tr>
          </template>
          <tr v-else v-for="o in rows" :key="o.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" @click="openRow(o)">
            <td class="px-4 py-3.5">
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{ o.number }}</span>
              <p class="text-xs text-slate-400">{{ formatDate(o.createdAt) }}</p>
            </td>
            <td class="px-4 py-3.5 text-sm text-slate-500">{{ orderKindLabels[o.kind] ?? o.kind }}</td>
            <td class="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">{{ o.supplierName || '—' }}</td>
            <td class="px-4 py-3.5 text-sm" @click.stop>
              <router-link v-if="o.jobId" :to="`/jobs/${o.jobId}`" class="text-brand-600 hover:underline">{{ o.jobNumber }}</router-link>
              <span v-else class="text-slate-400">—</span>
            </td>
            <td class="px-4 py-3.5 text-sm text-slate-500">{{ formatDate(o.expectedDate) }}</td>
            <td class="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200">
              {{ gbp(o.grossTotal) }}<span v-if="o.type === 'parts'" class="text-xs font-normal text-slate-400"> net</span>
            </td>
            <td class="px-4 py-3.5"><UiBadge :variant="(orderStatusVariant[o.status] as any)" dot>{{ orderStatusLabels[o.status] ?? o.status }}</UiBadge></td>
          </tr>
        </UiTable>

        <div v-if="totalPages > 1" class="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
          <span>Page {{ page }} of {{ totalPages }}</span>
          <button :disabled="page <= 1" @click="load(page - 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronLeft class="w-4 h-4" /></button>
          <button :disabled="page >= totalPages" @click="load(page + 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronRight class="w-4 h-4" /></button>
        </div>
      </template>

      <UiTable v-else :headers="['Order', 'Type', 'Supplier', 'Total', 'Raised']">
        <template v-if="pending.length === 0">
          <tr><td colspan="5" class="px-4 py-10 text-center text-sm text-slate-400">Nothing is waiting for approval.</td></tr>
        </template>
        <tr v-else v-for="o in pending" :key="o.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" @click="openRow(o)">
          <td class="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-200">{{ o.poNumber }}</td>
          <td class="px-4 py-3.5 text-sm text-slate-500">{{ orderKindLabels[o.kind] ?? o.kind }}</td>
          <td class="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">{{ o.supplierName }}</td>
          <td class="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200">{{ gbp(o.grossTotal) }}</td>
          <td class="px-4 py-3.5 text-sm text-slate-500">{{ formatDate(o.createdAt) }}</td>
        </tr>
      </UiTable>
    </template>

    <PurchaseOrderDetailPanel v-model="showDetail" :orderId="detailId" @changed="load()" />
  </DefaultLayout>
</template>
