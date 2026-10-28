<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import { Download } from 'lucide-vue-next'
import {
  getReport, type JobCostRow, type MonthlyTrendRow, type ReportName, type SpendByCategoryRow, type SpendBySupplierRow, type SupplierPerformanceRow,
} from '@/api/procurement/reports.api'
import { apiMessage, formatDate, gbp, orderKindLabels } from '@/utils/procurement'
import { ToastService } from '@/services/toast.service'

/** Purchasing → Reports (Sprint 23): where the money goes, how suppliers perform, margin on job parts. CSV export. */
type Tab = { key: ReportName; label: string; hint: string }
const tabs: Tab[] = [
  { key: 'spend-by-supplier', label: 'By supplier', hint: 'Net value of orders placed with each supplier, including parts ordered for jobs.' },
  { key: 'spend-by-category', label: 'By type', hint: 'Net value of orders by what they were for.' },
  { key: 'monthly-trend', label: 'By month', hint: 'Net value of orders placed each month.' },
  { key: 'supplier-performance', label: 'Supplier performance', hint: 'Purchase orders only: how many arrived by the date asked for, and how much was rejected at booking-in.' },
  { key: 'job-cost-recharge', label: 'Job parts margin', hint: 'What the parts for each job cost against what they were invoiced for (net).' },
]
const active = ref<ReportName>('spend-by-supplier')
const activeTab = computed(() => tabs.find((t) => t.key === active.value)!)
const from = ref('')
const to = ref('')
const loading = ref(true)
const rows = ref<any[]>([])
const maxNet = computed(() => Math.max(1, ...rows.value.map((r) => Number(r.net) || 0)))
const totalNet = computed(() => rows.value.reduce((s, r) => s + (Number(r.net) || 0), 0))
const pct = (v: number | null) => (v === null || v === undefined ? '—' : `${v}%`)
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

async function load() {
  loading.value = true
  try {
    const result = await getReport<any>(active.value, { from: from.value || undefined, to: to.value || undefined })
    rows.value = result.items
    from.value = result.from
    to.value = result.to
  } catch (err) {
    rows.value = []
    ToastService.error(apiMessage(err, 'Failed to load the report'))
  } finally {
    loading.value = false
  }
}
function select(tab: ReportName) {
  active.value = tab
  rows.value = []
  load()
}

const columns: Record<ReportName, { headers: string[]; cells: (r: any) => (string | number)[] }> = {
  'spend-by-supplier': { headers: ['Supplier', 'Orders', 'Net', 'Share'], cells: (r: SpendBySupplierRow) => [r.supplierName, r.orders, r.net.toFixed(2), `${r.share}%`] },
  'spend-by-category': { headers: ['Type', 'Orders', 'Net', 'Share'], cells: (r: SpendByCategoryRow) => [orderKindLabels[r.kind] ?? r.kind, r.orders, r.net.toFixed(2), `${r.share}%`] },
  'monthly-trend': { headers: ['Month', 'Orders', 'Net'], cells: (r: MonthlyTrendRow) => [monthLabel(r.month), r.orders, r.net.toFixed(2)] },
  'supplier-performance': { headers: ['Supplier', 'Orders', 'Delivered', 'On time', 'Rejected'], cells: (r: SupplierPerformanceRow) => [r.supplierName, r.orders, r.delivered, pct(r.onTimePercent), pct(r.rejectedPercent)] },
  'job-cost-recharge': { headers: ['Job', 'Parts cost', 'Parts sold', 'Margin', 'Margin %'], cells: (r: JobCostRow) => [r.jobNumber, r.cost.toFixed(2), r.sold.toFixed(2), r.margin.toFixed(2), pct(r.marginPercent)] },
}

function exportCsv() {
  const { headers, cells } = columns[active.value]
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [headers, ...rows.value.map(cells)].map((line) => line.map(escape).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `purchasing-${active.value}-${from.value}-to-${to.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(load)
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Purchasing reports" subtitle="Where the money goes and how your suppliers perform.">
      <UiButton variant="secondary" :disabled="!rows.length" @click="exportCsv"><Download class="w-4 h-4" /> Export CSV</UiButton>
    </UiPageHeader>

    <div class="flex flex-wrap items-center gap-1 mb-5 border-b border-slate-200 dark:border-dark-border">
      <button
        v-for="t in tabs" :key="t.key"
        :class="['px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
          active === t.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300']"
        @click="select(t.key)"
      >{{ t.label }}</button>
    </div>

    <div class="flex flex-wrap items-end gap-3 mb-2">
      <div class="w-44"><UiInput v-model="from" label="From" type="date" /></div>
      <div class="w-44"><UiInput v-model="to" label="To" type="date" /></div>
      <UiButton variant="secondary" @click="load">Show</UiButton>
      <span v-if="['spend-by-supplier', 'spend-by-category', 'monthly-trend'].includes(active)" class="ml-auto text-sm text-slate-500">Total <strong class="text-slate-800 dark:text-slate-100">{{ gbp(totalNet) }}</strong> net</span>
    </div>
    <p class="text-xs text-slate-400 mb-4">{{ activeTab.hint }} {{ from && to ? `${formatDate(from)} to ${formatDate(to)}.` : '' }}</p>

    <UiTable :headers="columns[active].headers.concat(['spend-by-supplier', 'spend-by-category', 'monthly-trend'].includes(active) ? [''] : [])">
      <template v-if="loading">
        <tr v-for="n in 4" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in columns[active].headers.length" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded" /></td>
        </tr>
      </template>
      <template v-else-if="rows.length === 0">
        <tr><td :colspan="columns[active].headers.length + 1" class="px-4 py-10 text-center text-sm text-slate-400">Nothing in this period.</td></tr>
      </template>

      <template v-else-if="active === 'spend-by-supplier' || active === 'spend-by-category' || active === 'monthly-trend'">
        <tr v-for="(r, index) in rows" :key="index">
          <td class="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
            {{ active === 'spend-by-supplier' ? r.supplierName : active === 'spend-by-category' ? (orderKindLabels[r.kind] ?? r.kind) : monthLabel(r.month) }}
          </td>
          <td class="px-4 py-3 text-sm text-slate-500">{{ r.orders }}</td>
          <td class="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{{ gbp(r.net) }}</td>
          <td v-if="active !== 'monthly-trend'" class="px-4 py-3 text-sm text-slate-500">{{ r.share }}%</td>
          <td class="px-4 py-3 w-1/3"><div class="h-2 rounded-full bg-slate-100 dark:bg-white/10"><div class="h-2 rounded-full bg-brand-500" :style="{ width: `${Math.max(2, (r.net / maxNet) * 100)}%` }" /></div></td>
        </tr>
      </template>

      <template v-else-if="active === 'supplier-performance'">
        <tr v-for="r in (rows as SupplierPerformanceRow[])" :key="r.supplierId">
          <td class="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{{ r.supplierName }}</td>
          <td class="px-4 py-3 text-sm text-slate-500">{{ r.orders }}</td>
          <td class="px-4 py-3 text-sm text-slate-500">{{ r.delivered }}</td>
          <td class="px-4 py-3 text-sm" :class="r.onTimePercent === null ? 'text-slate-400' : r.onTimePercent >= 90 ? 'text-green-600' : r.onTimePercent >= 60 ? 'text-amber-600' : 'text-red-600'">{{ pct(r.onTimePercent) }}</td>
          <td class="px-4 py-3 text-sm" :class="r.rejectedPercent ? 'text-red-600' : 'text-slate-500'">{{ pct(r.rejectedPercent) }}</td>
        </tr>
      </template>

      <template v-else>
        <tr v-for="r in (rows as JobCostRow[])" :key="r.jobId">
          <td class="px-4 py-3"><router-link :to="`/jobs/${r.jobId}`" class="font-medium text-brand-600 hover:underline">{{ r.jobNumber }}</router-link></td>
          <td class="px-4 py-3 text-sm text-slate-500">{{ gbp(r.cost) }}</td>
          <td class="px-4 py-3 text-sm text-slate-500">{{ r.sold > 0 ? gbp(r.sold) : 'Not invoiced' }}</td>
          <td class="px-4 py-3 font-medium" :class="r.margin < 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'">{{ r.sold > 0 ? gbp(r.margin) : '—' }}</td>
          <td class="px-4 py-3 text-sm" :class="(r.marginPercent ?? 0) < 0 ? 'text-red-600' : 'text-slate-500'">{{ pct(r.marginPercent) }}</td>
        </tr>
      </template>
    </UiTable>
  </DefaultLayout>
</template>
