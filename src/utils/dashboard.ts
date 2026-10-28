import type { ValueFormat, Tone } from '@/api/dashboard.api'
import { WidgetSize, WidgetCategory, WidgetType } from '@/types/generated/enums/dashboard'

/** Column span per size on the 12-column grid (cms pattern) */
export const SIZE_CLASSES: Record<WidgetSize, string> = {
  [WidgetSize.SMALL]: 'col-span-12 md:col-span-6 xl:col-span-3',
  [WidgetSize.MEDIUM]: 'col-span-12 md:col-span-6',
  [WidgetSize.LARGE]: 'col-span-12 xl:col-span-9',
  [WidgetSize.FULL]: 'col-span-12',
}

export const SIZE_OPTIONS = [
  { value: WidgetSize.SMALL, label: 'Small' },
  { value: WidgetSize.MEDIUM, label: 'Medium' },
  { value: WidgetSize.LARGE, label: 'Large' },
  { value: WidgetSize.FULL, label: 'Full width' },
]

export const REFRESH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 60, label: 'Every minute' },
  { value: 300, label: 'Every 5 minutes' },
  { value: 900, label: 'Every 15 minutes' },
]

export const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  [WidgetCategory.TODAY]: 'Today',
  [WidgetCategory.WORKSHOP]: 'Workshop',
  [WidgetCategory.FIELD]: 'Field',
  [WidgetCategory.FINANCE]: 'Finance',
  [WidgetCategory.PURCHASING]: 'Purchasing',
  [WidgetCategory.HR]: 'HR',
  [WidgetCategory.ASSETS]: 'Assets',
  [WidgetCategory.ACTIVITY]: 'Activity',
}

export const CATEGORY_ORDER: WidgetCategory[] = [
  WidgetCategory.TODAY, WidgetCategory.WORKSHOP, WidgetCategory.FIELD, WidgetCategory.FINANCE,
  WidgetCategory.PURCHASING, WidgetCategory.HR, WidgetCategory.ASSETS, WidgetCategory.ACTIVITY,
]

export const TYPE_LABELS: Record<WidgetType, string> = {
  [WidgetType.STAT_CARD]: 'Number',
  [WidgetType.STAT_CARD_TREND]: 'Number with trend',
  [WidgetType.CHART_BAR]: 'Bar chart',
  [WidgetType.CHART_LINE]: 'Line chart',
  [WidgetType.CHART_DOUGHNUT]: 'Doughnut chart',
  [WidgetType.GAUGE]: 'Gauge',
  [WidgetType.LIST]: 'List',
  [WidgetType.STATUS_LIST]: 'Status chips',
  [WidgetType.TABLE]: 'Table',
  [WidgetType.TIMELINE]: 'Timeline',
}

export const isStatType = (t: WidgetType) => t === WidgetType.STAT_CARD || t === WidgetType.STAT_CARD_TREND

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
const gbpExact = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })

/** Formats a widget figure; `compact` drops pence for headline numbers */
export function formatValue(value: number | null | undefined, format: ValueFormat | 'datetime' = 'number', compact = true): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  const v = Number(value)
  switch (format) {
    case 'currency': return compact ? gbp.format(v) : gbpExact.format(v)
    case 'percent': return `${num.format(v)}%`
    case 'hours': return `${num.format(v)}h`
    case 'miles': return `${num.format(v)} mi`
    default: return num.format(v)
  }
}

export function formatCell(value: any, format?: ValueFormat | 'datetime'): string {
  if (value === null || value === undefined || value === '') return '—'
  if (format === 'datetime') return relativeTime(value)
  if (format) return formatValue(Number(value), format, false)
  return String(value)
}

export function relativeTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

export function timeOfDay(iso: string | Date | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export const TONE_TEXT: Record<Tone, string> = {
  default: 'text-slate-800 dark:text-white',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-500',
  danger: 'text-red-500',
  info: 'text-brand-600 dark:text-brand-400',
}

export const TONE_BADGE: Record<Tone, 'pending' | 'done' | 'progress' | 'cancelled' | 'info'> = {
  default: 'pending',
  success: 'done',
  warning: 'progress',
  danger: 'cancelled',
  info: 'info',
}
