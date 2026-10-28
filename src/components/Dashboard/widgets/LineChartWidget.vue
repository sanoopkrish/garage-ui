<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import type { ChartData } from '@/api/dashboard.api'
import { useDarkMode } from '@/composables/useDarkMode'
import { baseChartOptions, axisFormatter, BRAND, SLATE } from './chart-theme'

const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts'))
const props = defineProps<{ data: ChartData; size: string }>()
const { dark } = useDarkMode()

const hasData = computed(() => (props.data?.categories?.length ?? 0) > 0)

const chart = computed(() => {
  const d = props.data
  const fmt = axisFormatter(d?.format ?? 'number')
  return {
    options: {
      ...baseChartOptions(dark.value),
      chart: { ...baseChartOptions(dark.value).chart, type: 'area' as const },
      colors: [BRAND, SLATE],
      stroke: { curve: 'smooth' as const, width: 2.5 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
      xaxis: { categories: d?.categories ?? [] },
      yaxis: { labels: { formatter: fmt } },
      legend: { position: 'top' as const, show: (d?.series?.length ?? 0) > 1 },
      tooltip: { ...baseChartOptions(dark.value).tooltip, y: { formatter: fmt } },
    },
    series: d?.series ?? [],
  }
})
</script>

<template>
  <div>
    <VueApexCharts v-if="hasData" height="240" :options="chart.options" :series="chart.series" />
    <p v-else class="text-sm text-slate-400 py-6 text-center">No data yet.</p>
  </div>
</template>
