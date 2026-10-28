<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import type { ChartData } from '@/api/dashboard.api'
import { useDarkMode } from '@/composables/useDarkMode'
import { baseChartOptions, axisFormatter, BRAND, SLATE, GREEN } from './chart-theme'

const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts'))
const props = defineProps<{ data: ChartData; size: string }>()
const { dark } = useDarkMode()

const hasData = computed(() => (props.data?.categories?.length ?? 0) > 0)
/** Fixed so charts in the same row line up; long horizontal lists grow past it */
const height = computed(() => (props.data?.horizontal ? Math.max(240, 36 * props.data.categories.length + 40) : 240))

const chart = computed(() => {
  const d = props.data
  const fmt = axisFormatter(d?.format ?? 'number')
  const multi = (d?.series?.length ?? 0) > 1
  const counts = (d?.format ?? 'number') === 'number'
  const maxValue = Math.ceil(Math.max(0, ...(d?.series ?? []).flatMap((s) => s.data.map((v) => Number(v) || 0))))
  return {
    options: {
      ...baseChartOptions(dark.value),
      chart: { ...baseChartOptions(dark.value).chart, type: 'bar' as const, stacked: !!d?.stacked },
      colors: multi ? [SLATE, GREEN, BRAND] : [BRAND],
      plotOptions: { bar: { horizontal: !!d?.horizontal, columnWidth: '55%', barHeight: '55%', borderRadius: 3 } },
      xaxis: {
        categories: d?.categories ?? [],
        ...(d?.horizontal ? { labels: { formatter: fmt }, ...(d.format === 'percent' ? { max: 100 } : {}), ...(counts ? { tickAmount: Math.min(5, Math.max(1, maxValue)) } : {}) } : {}),
      },
      yaxis: d?.horizontal ? {} : { labels: { formatter: fmt }, ...(counts ? { tickAmount: Math.min(5, Math.max(1, maxValue)), forceNiceScale: true } : {}) },
      legend: { position: 'top' as const, show: multi },
      tooltip: { ...baseChartOptions(dark.value).tooltip, y: { formatter: fmt } },
    },
    series: d?.series ?? [],
  }
})
</script>

<template>
  <div>
    <VueApexCharts v-if="hasData" :height="height" :options="chart.options" :series="chart.series" />
    <p v-else class="text-sm text-slate-400 py-6 text-center">No data yet.</p>
  </div>
</template>
