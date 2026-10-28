import api from '@/api/client'
import type { WidgetCategory, WidgetSize, WidgetType } from '@/types/generated/enums/dashboard'

/**
 * Configurable dashboard (Sprint 24). Mirrors garage-api src/dashboard:
 * user endpoints under /dashboard, one-widget refresh under /dashboard/data,
 * default layouts (company / per role) under /dashboard/config.
 */

// ---- shared shapes -----------------------------------------------------------

export type ValueFormat = 'number' | 'currency' | 'percent' | 'hours' | 'miles'
export type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info'

/** A registry entry as the API exposes it */
export interface WidgetSummary {
  key: string
  displayName: string
  description: string
  category: WidgetCategory
  widgetType: WidgetType
  defaultSize: WidgetSize
  requiredPermission: string
  requiredModule: string
  isDefaultVisible: boolean
  link: string | null
}

/** A layout entry as the user dashboard receives it */
export interface LayoutEntry {
  widgetKey: string
  order: number
  size: WidgetSize
  isVisible: boolean
  isLocked: boolean
  widgetType: WidgetType
  displayName: string
  description: string
  category: WidgetCategory
  link: string | null
}

/** A placement in a default layout (admin side) */
export interface WidgetPlacement {
  widgetKey: string
  order: number
  size: WidgetSize
  isLocked: boolean
  isVisible: boolean
  customConfig?: Record<string, any>
}

export interface DashboardSettings {
  refreshSeconds: number
}

export interface DashboardResponse {
  layout: LayoutEntry[]
  widgetData: Record<string, any>
  errors: string[]
  isCustomized: boolean
  source: 'role' | 'company' | null
  settings: DashboardSettings
  fetchedAt: string
}

export interface WidgetDataResponse {
  widgetKey: string
  widgetType: WidgetType
  displayName: string
  data: any
  fetchedAt: string
}

export interface DashboardConfig {
  id: string | null
  companyId: string
  systemRoleId: string | null
  name: string
  description: string | null
  widgets: WidgetPlacement[]
  settings: Record<string, any> | null
  /** true = this role has no layout of its own; what you see is the company default */
  inherited: boolean
  updatedAt?: string
}

export interface RoleLayoutSummary {
  roleId: string
  roleName: string
  widgetCount: number
  updatedAt: string
}

export interface WidgetCategoryMeta {
  key: WidgetCategory
  label: string
  icon: string
  description: string
  widgetCount: number
}

// ---- widget payloads ---------------------------------------------------------

export interface StatCardData {
  value: number | null
  format: ValueFormat
  tone?: Tone
  secondary?: { label: string; value: number | null; format?: ValueFormat; tone?: Tone }[]
  emptyText?: string
}
export interface StatusListData {
  total: number
  items: { key: string; label: string; count: number; link?: string; tone?: Tone }[]
}
export interface ChartData {
  categories: string[]
  series: { name: string; data: (number | null)[] }[]
  format: ValueFormat
  horizontal?: boolean
  stacked?: boolean
}
export interface DoughnutData {
  labels: string[]
  values: number[]
  format: ValueFormat
}
export interface GaugeData {
  value: number | null
  format: 'percent'
  label?: string
}
export interface ListData {
  items: { id: string; title: string; subtitle?: string; badge?: string; badgeTone?: Tone; date?: string | null; link?: string }[]
}
export interface TableData {
  columns: { key: string; label: string; align?: 'left' | 'right'; format?: ValueFormat | 'datetime' }[]
  rows: Record<string, any>[]
  rowLinkKey?: string
}
export interface TimelineData {
  items: { id: string; title: string; description?: string; type?: string; date: string; link?: string }[]
}

// ---- user dashboard ----------------------------------------------------------

const unwrap = <T>(r: any): T => r.data?.data ?? r.data
/** For responses whose own payload has a `data` field (widget data) — never unwrap those */
const raw = <T>(r: any): T => r.data

export async function fetchDashboard(): Promise<DashboardResponse> {
  return unwrap(await api.get('/dashboard'))
}

export async function fetchAvailableWidgets(): Promise<WidgetSummary[]> {
  return unwrap(await api.get('/dashboard/available-widgets'))
}

export async function fetchWidgetData(widgetKey: string): Promise<WidgetDataResponse> {
  return raw(await api.get(`/dashboard/data/widgets/${widgetKey}`))
}

export async function addWidget(widgetKey: string, size?: WidgetSize): Promise<{ placement: LayoutEntry; data: any }> {
  return raw(await api.post('/dashboard/widgets', { widgetKey, size }))
}

export async function hideWidget(widgetKey: string): Promise<void> {
  await api.delete(`/dashboard/widgets/${widgetKey}`)
}

export async function resizeWidget(widgetKey: string, size: WidgetSize): Promise<void> {
  await api.patch(`/dashboard/widgets/${widgetKey}/resize`, { size })
}

export async function reorderWidgets(widgetKeys: string[]): Promise<void> {
  await api.patch('/dashboard/reorder', { widgetKeys })
}

export async function updateDashboardSettings(settings: Partial<DashboardSettings>): Promise<void> {
  await api.put('/dashboard/preferences', { settings })
}

export async function resetDashboard(): Promise<DashboardResponse> {
  return unwrap(await api.post('/dashboard/reset'))
}

// ---- catalogue ---------------------------------------------------------------

export async function fetchWidgetCategories(): Promise<WidgetCategoryMeta[]> {
  return unwrap(await api.get('/dashboard/data/categories'))
}

// ---- default layouts (Settings → Dashboard) ----------------------------------

const roleParams = (roleId?: string | null) => (roleId ? { params: { roleId } } : {})

export async function fetchDashboardConfig(roleId?: string | null): Promise<DashboardConfig> {
  return unwrap(await api.get('/dashboard/config', roleParams(roleId)))
}

export async function fetchRoleLayouts(): Promise<RoleLayoutSummary[]> {
  return unwrap(await api.get('/dashboard/config/roles'))
}

export async function fetchConfigAvailableWidgets(): Promise<WidgetSummary[]> {
  return unwrap(await api.get('/dashboard/config/available-widgets'))
}

export async function saveDashboardConfig(widgets: WidgetPlacement[], roleId?: string | null): Promise<DashboardConfig> {
  return unwrap(await api.put('/dashboard/config', { widgets }, roleParams(roleId)))
}

export async function resetDashboardConfig(roleId?: string | null): Promise<DashboardConfig> {
  return unwrap(await api.post('/dashboard/config/reset', {}, roleParams(roleId)))
}

export async function deleteRoleLayout(roleId: string): Promise<void> {
  await api.delete(`/dashboard/config/role/${roleId}`)
}
