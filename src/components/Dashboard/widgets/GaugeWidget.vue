<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import type { GaugeData } from '@/api/dashboard.api'
import { useDarkMode } from '@/composables/useDarkMode'
import { baseChartOptions, BRAND } from './chart-theme'

const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts'))
const props = defineProps<{ data: GaugeData; size: string }>()
const { dark } = useDarkMode()

const value = computed(() => (props.data?.value === null || props.data?.value === undefined ? null : Math.max(0, Math.min(100, props.data.value))))
const colour = computed(() => (value.value === null ? BRAND : value.value >= 70 ? '#22c55e' : value.value >= 40 ? '#f59e0b' : '#ef4444'))

const chart = computed(() => ({
  options: {
    ...baseChartOptions(dark.value),
    chart: { ...baseChartOptions(dark.value).chart, type: 'radialBar' as const, sparkline: { enabled: true } },
    colors: [colour.value],
    plotOptions: {
      radialBar: {
        hollow: { size: '62%' },
        track: { background: dark.value ? '#334155' : '#e2e8f0' },
        dataLabels: {
          name: { show: false },
          value: { fontSize: '22px', fontWeight: 700, color: dark.value ? '#ffffff' : '#1e293b', offsetY: 8, formatter: (v: number) => `${Math.round(v * 10) / 10}%` },
        },
      },
    },
  },
  series: [value.value ?? 0],
}))
</script>

<template>
  <div class="flex flex-col items-center">
    <VueApexCharts v-if="value !== null" height="150" width="150" :options="chart.options" :series="chart.series" />
    <p v-else class="text-2xl font-bold text-slate-300 py-8">—</p>
    <p v-if="data?.label" class="text-xs text-slate-400 -mt-1">{{ data.label }}</p>
  </div>
</template>
