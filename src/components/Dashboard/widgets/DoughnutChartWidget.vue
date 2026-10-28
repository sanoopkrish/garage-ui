<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import type { DoughnutData } from '@/api/dashboard.api'
import { useDarkMode } from '@/composables/useDarkMode'
import { baseChartOptions, axisFormatter, PALETTE } from './chart-theme'

const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts'))
const props = defineProps<{ data: DoughnutData; size: string }>()
const { dark } = useDarkMode()

const hasData = computed(() => (props.data?.values?.length ?? 0) > 0)

const chart = computed(() => {
  const d = props.data
  const fmt = axisFormatter(d?.format ?? 'number')
  return {
    options: {
      ...baseChartOptions(dark.value),
      chart: { ...baseChartOptions(dark.value).chart, type: 'donut' as const },
      labels: d?.labels ?? [],
      colors: PALETTE,
      legend: { position: 'bottom' as const },
      plotOptions: { pie: { donut: { size: '60%' } } },
      tooltip: { ...baseChartOptions(dark.value).tooltip, y: { formatter: fmt } },
    },
    series: d?.values ?? [],
  }
})
</script>

<template>
  <div>
    <VueApexCharts v-if="hasData" height="260" :options="chart.options" :series="chart.series" />
    <p v-else class="text-sm text-slate-400 py-6 text-center">No data yet.</p>
  </div>
</template>
