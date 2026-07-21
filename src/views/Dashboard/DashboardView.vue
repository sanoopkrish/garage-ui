<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import VueApexCharts from 'vue3-apexcharts'
import {
  Wrench, PoundSterling, RotateCcw, Truck, MapPin, CheckCircle2, CalendarPlus,
} from 'lucide-vue-next'
import {
  getDashboardToday, getDashboardKpis, getDashboardTrends,
  type DashboardToday, type DashboardKpis, type DashboardTrends,
} from '@/api/dashboard.api'
import { jobStatusLabels } from '@/utils/jobStatus'
import { JobStatus } from '@/types/generated/enums/job'
import { usePermissions } from '@/composables/usePermissions'
import { useDarkMode } from '@/composables/useDarkMode'

const { hasPermission: canSeeFinance } = usePermissions('menus.finance.invoices.read')
const { dark: isDark } = useDarkMode()

const today = ref<DashboardToday | null>(null)
const kpis = ref<DashboardKpis | null>(null)
const trends = ref<DashboardTrends | null>(null)
const loading = ref(true)

const BRAND = '#f97316'
const SLATE = '#64748b'
const GREEN = '#22c55e'

const baseChart = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'inherit', foreColor: isDark.value ? '#94a3b8' : '#64748b', background: 'transparent' },
  theme: { mode: (isDark.value ? 'dark' : 'light') as 'dark' | 'light' },
  grid: { borderColor: isDark.value ? '#334155' : '#e2e8f0' },
  dataLabels: { enabled: false },
}))

const revenueChart = computed(() => ({
  options: {
    ...baseChart.value,
    chart: { ...baseChart.value.chart, type: 'area' as const },
    colors: [BRAND],
    stroke: { curve: 'smooth' as const, width: 2.5 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
    xaxis: { categories: trends.value?.revenueByWeek.map((r) => new Date(r.week).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })) ?? [] },
    yaxis: { labels: { formatter: (v: number) => `£${Math.round(v)}` } },
  },
  series: [{ name: 'Payments', data: trends.value?.revenueByWeek.map((r) => r.revenue) ?? [] }],
}))

const jobsChart = computed(() => ({
  options: {
    ...baseChart.value,
    chart: { ...baseChart.value.chart, type: 'bar' as const },
    colors: [SLATE, GREEN],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 3 } },
    xaxis: { categories: trends.value?.jobsByWeek.map((r) => new Date(r.week).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })) ?? [] },
    legend: { position: 'top' as const },
  },
  series: [
    { name: 'Created', data: trends.value?.jobsByWeek.map((r) => r.created) ?? [] },
    { name: 'Completed', data: trends.value?.jobsByWeek.map((r) => r.completed) ?? [] },
  ],
}))

const utilisationChart = computed(() => ({
  options: {
    ...baseChart.value,
    chart: { ...baseChart.value.chart, type: 'bar' as const },
    colors: [BRAND],
    plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 3 } },
    xaxis: { categories: kpis.value?.utilisation.map((u) => u.name) ?? [], max: 100, labels: { formatter: (v: string) => `${v}%` } },
    tooltip: { y: { formatter: (v: number, opts: any) => {
      const u = kpis.value?.utilisation[opts.dataPointIndex]
      return `${v}% (${u?.billableHours ?? 0}h billable${u?.reworkHours ? `, ${u.reworkHours}h rework excluded` : ''})`
    } } },
  },
  series: [{ name: 'Utilisation', data: kpis.value?.utilisation.map((u) => u.utilisationPercent) ?? [] }],
}))

const partsChart = computed(() => ({
  options: {
    ...baseChart.value,
    chart: { ...baseChart.value.chart, type: 'donut' as const },
    labels: trends.value?.partsSpendBySupplier.map((s) => s.supplier) ?? [],
    legend: { position: 'bottom' as const },
    colors: [BRAND, '#fb923c', '#fdba74', SLATE, '#94a3b8', '#cbd5e1'],
  },
  series: trends.value?.partsSpendBySupplier.map((s) => s.spend) ?? [],
}))

const quoteFunnelChart = computed(() => {
  const order = ['draft', 'sent', 'awaiting', 'approved', 'partially_approved', 'rejected']
  const rows = [...(kpis.value?.quotePipeline.byStatus ?? [])].sort(
    (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
  )
  return {
    options: {
      ...baseChart.value,
      chart: { ...baseChart.value.chart, type: 'bar' as const },
      colors: [BRAND],
      plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 3 } },
      xaxis: { categories: rows.map((r) => r.status.replace('_', ' ')) },
      tooltip: { y: { formatter: (v: number, opts: any) => `${v} quotes · £${rows[opts.dataPointIndex]?.value.toFixed(0)}` } },
    },
    series: [{ name: 'Quotes', data: rows.map((r) => r.count) }],
  }
})

const activeStatusOrder: JobStatus[] = [
  JobStatus.CHECKED_IN, JobStatus.DIAGNOSIS, JobStatus.QUOTED, JobStatus.AWAITING_AUTHORISATION,
  JobStatus.APPROVED, JobStatus.PARTS_ORDERED, JobStatus.IN_REPAIR, JobStatus.QUALITY_CHECK,
]
const workshopStrip = computed(() =>
  activeStatusOrder
    .map((status) => ({
      status,
      label: jobStatusLabels[status],
      count: today.value?.vehiclesInWorkshop.find((v) => v.status === status)?.count ?? 0,
    }))
    .filter((s) => s.count > 0),
)
const workshopTotal = computed(() => workshopStrip.value.reduce((s, r) => s + r.count, 0))

function lastSeen(iso: string | null): string {
  if (!iso) return 'no signal'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return mins < 1 ? 'just now' : `${mins}m ago`
}

onMounted(async () => {
  try {
    const [t, k, tr] = await Promise.all([getDashboardToday(), getDashboardKpis(), getDashboardTrends(6)])
    today.value = t
    kpis.value = k
    trends.value = tr
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DefaultLayout>
    <div v-if="loading" class="space-y-4">
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div v-for="i in 6" :key="i" class="card h-24 animate-pulse bg-slate-100 dark:bg-white/5" />
      </div>
      <div class="card h-72 animate-pulse bg-slate-100 dark:bg-white/5" />
    </div>

    <template v-else>
      <!-- Today tiles -->
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
        <div class="card !p-4">
          <div class="flex items-center gap-2 text-xs text-slate-400 mb-1"><CalendarPlus class="w-3.5 h-3.5" /> Booked today</div>
          <p class="text-2xl font-bold text-slate-800 dark:text-white">{{ today?.bookedToday ?? 0 }}</p>
        </div>
        <div class="card !p-4">
          <div class="flex items-center gap-2 text-xs text-slate-400 mb-1"><CheckCircle2 class="w-3.5 h-3.5" /> Completed today</div>
          <p class="text-2xl font-bold text-slate-800 dark:text-white">{{ today?.completedToday ?? 0 }}</p>
        </div>
        <div v-if="canSeeFinance" class="card !p-4">
          <div class="flex items-center gap-2 text-xs text-slate-400 mb-1"><PoundSterling class="w-3.5 h-3.5" /> Payments today</div>
          <p class="text-2xl font-bold text-slate-800 dark:text-white">£{{ (today?.paymentsTakenToday ?? 0).toFixed(0) }}</p>
        </div>
        <div v-if="canSeeFinance" class="card !p-4">
          <div class="flex items-center gap-2 text-xs text-slate-400 mb-1"><PoundSterling class="w-3.5 h-3.5" /> Invoiced today</div>
          <p class="text-2xl font-bold text-slate-800 dark:text-white">£{{ (today?.invoicedToday ?? 0).toFixed(0) }}</p>
        </div>
        <router-link to="/jobs?rework=1" class="card !p-4 hover:border-brand-300 transition-colors">
          <div class="flex items-center gap-2 text-xs text-slate-400 mb-1"><RotateCcw class="w-3.5 h-3.5" /> Open reworks</div>
          <p class="text-2xl font-bold" :class="(today?.openReworks ?? 0) > 0 ? 'text-amber-500' : 'text-slate-800 dark:text-white'">{{ today?.openReworks ?? 0 }}</p>
        </router-link>
        <router-link to="/inventory" class="card !p-4 hover:border-brand-300 transition-colors">
          <div class="flex items-center gap-2 text-xs text-slate-400 mb-1"><Truck class="w-3.5 h-3.5" /> Parts overdue</div>
          <p class="text-2xl font-bold" :class="(today?.partsOverdue ?? 0) > 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'">{{ today?.partsOverdue ?? 0 }}</p>
        </router-link>
      </div>

      <!-- Workshop strip + live field -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div class="card xl:col-span-2">
          <div class="flex items-center gap-2 mb-3">
            <Wrench class="w-4 h-4 text-brand-500" />
            <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">In the workshop ({{ workshopTotal }})</h2>
          </div>
          <div v-if="workshopStrip.length" class="flex flex-wrap gap-2">
            <router-link
              v-for="s in workshopStrip"
              :key="s.status"
              :to="`/jobs?status=${s.status}`"
              class="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
            >
              <span class="text-lg font-bold text-slate-800 dark:text-white">{{ s.count }}</span>
              <span class="text-xs text-slate-500">{{ s.label }}</span>
            </router-link>
          </div>
          <p v-else class="text-sm text-slate-400">No vehicles in the workshop right now.</p>
        </div>

        <div class="card">
          <div class="flex items-center gap-2 mb-3">
            <MapPin class="w-4 h-4 text-brand-500" />
            <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Live field</h2>
          </div>
          <ul v-if="today?.liveField?.length" class="space-y-2.5">
            <li v-for="f in today.liveField" :key="f.technicianId" class="flex items-center gap-3 text-sm">
              <span class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="font-medium text-slate-700 dark:text-slate-200 truncate">{{ f.name }}</p>
                <router-link :to="`/jobs/${f.jobId}`" class="text-xs text-brand-600 hover:underline">{{ f.jobNumber }} · {{ f.registration }}</router-link>
              </div>
              <span class="text-xs text-slate-400 flex-shrink-0">{{ lastSeen(f.lastSeenAt) }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-slate-400">No field jobs in progress.</p>
          <router-link to="/schedule" class="inline-block mt-3 text-xs text-brand-600 hover:underline">Open field map →</router-link>
        </div>
      </div>

      <!-- KPI row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div class="card">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Quote conversion</h3>
          <p class="text-3xl font-bold text-slate-800 dark:text-white">{{ kpis?.quotePipeline.conversionPercent != null ? `${kpis.quotePipeline.conversionPercent}%` : '—' }}</p>
          <p class="text-xs text-slate-400 mt-1">approved ÷ responded quotes, last 30 days</p>
        </div>
        <div class="card">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Rework rate</h3>
          <p class="text-3xl font-bold" :class="(kpis?.rework.ratePercent ?? 0) > 10 ? 'text-amber-500' : 'text-slate-800 dark:text-white'">
            {{ kpis?.rework.ratePercent != null ? `${kpis.rework.ratePercent}%` : '—' }}
          </p>
          <p class="text-xs text-slate-400 mt-1">{{ kpis?.rework.created ?? 0 }} reworks / {{ kpis?.rework.jobsCompleted ?? 0 }} completed</p>
        </div>
        <div class="card" v-if="canSeeFinance">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Top B2B accounts</h3>
          <ul class="space-y-1.5">
            <li v-for="b in (kpis?.b2bProfitability ?? []).slice(0, 3)" :key="b.customerId" class="flex items-center justify-between text-sm">
              <span class="text-slate-600 dark:text-slate-300 truncate">{{ b.name }}</span>
              <span class="text-slate-800 dark:text-white font-semibold">£{{ b.revenue.toFixed(0) }} <span class="text-xs font-normal text-green-600">+£{{ b.margin.toFixed(0) }}</span></span>
            </li>
            <li v-if="!kpis?.b2bProfitability?.length" class="text-sm text-slate-400">No B2B invoices in range.</li>
          </ul>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <div class="card" v-if="canSeeFinance">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Revenue (payments by week)</h3>
          <VueApexCharts height="240" :options="revenueChart.options" :series="revenueChart.series" />
        </div>
        <div class="card">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Jobs created vs completed</h3>
          <VueApexCharts height="240" :options="jobsChart.options" :series="jobsChart.series" />
        </div>
        <div class="card">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Technician utilisation (billable, rework excluded)</h3>
          <VueApexCharts height="240" :options="utilisationChart.options" :series="utilisationChart.series" />
        </div>
        <div class="card">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Quote pipeline (last 30 days)</h3>
          <VueApexCharts height="240" :options="quoteFunnelChart.options" :series="quoteFunnelChart.series" />
        </div>
        <div class="card" v-if="canSeeFinance && (trends?.partsSpendBySupplier?.length ?? 0) > 0">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Parts spend by supplier</h3>
          <VueApexCharts height="260" :options="partsChart.options" :series="partsChart.series" />
        </div>
        <div class="card" v-if="kpis?.fuel?.length">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Field fleet (last 30 days)</h3>
          <ul class="space-y-2">
            <li v-for="f in kpis.fuel" :key="f.technicianId" class="flex items-center justify-between text-sm">
              <span class="text-slate-600 dark:text-slate-300">{{ f.name }}</span>
              <span class="text-slate-500">{{ f.miles }} mi · est. £{{ f.estFuelCost.toFixed(0) }} fuel · {{ f.co2Kg.toFixed(0) }}kg CO₂</span>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </DefaultLayout>
</template>
