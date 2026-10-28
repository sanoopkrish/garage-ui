import type { ValueFormat } from '@/api/dashboard.api'
import { formatValue } from '@/utils/dashboard'

export const BRAND = '#f97316'
export const SLATE = '#64748b'
export const GREEN = '#22c55e'
export const PALETTE = [BRAND, '#fb923c', '#fdba74', SLATE, '#94a3b8', '#cbd5e1']

/** ApexCharts options shared by every chart widget (dark-mode aware) */
export function baseChartOptions(dark: boolean) {
  return {
    chart: { toolbar: { show: false }, fontFamily: 'inherit', foreColor: dark ? '#94a3b8' : '#64748b', background: 'transparent', animations: { enabled: false } },
    theme: { mode: (dark ? 'dark' : 'light') as 'dark' | 'light' },
    grid: { borderColor: dark ? '#334155' : '#e2e8f0' },
    dataLabels: { enabled: false },
    tooltip: { theme: (dark ? 'dark' : 'light') as 'dark' | 'light' },
  }
}

/** Axis / tooltip formatter for a widget's value format */
export function axisFormatter(format: ValueFormat) {
  return (v: number | string) => formatValue(typeof v === 'string' ? Number(v) : v, format)
}
