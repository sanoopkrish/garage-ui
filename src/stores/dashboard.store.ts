import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchDashboard, fetchAvailableWidgets, fetchWidgetData, addWidget as addWidgetApi, hideWidget as hideWidgetApi,
  resizeWidget as resizeWidgetApi, reorderWidgets as reorderWidgetsApi, updateDashboardSettings, resetDashboard as resetDashboardApi,
  type LayoutEntry, type WidgetSummary, type DashboardSettings,
} from '@/api/dashboard.api'
import type { WidgetSize } from '@/types/generated/enums/dashboard'
import { ToastService } from '@/services/toast.service'

function messageOf(err: any, fallback: string): string {
  const message = err?.response?.data?.message
  return Array.isArray(message) ? message.join('; ') : (message ?? fallback)
}

/**
 * The signed-in user's dashboard (Sprint 24). One batch load, then in-place
 * updates: add/hide/resize/reorder change `layout` immediately and roll back
 * with a toast if the API refuses. Auto refresh re-reads visible widgets one
 * at a time on the interval the user picked (0 = off).
 */
export const useDashboardStore = defineStore('dashboard', () => {
  const layout = ref<LayoutEntry[]>([])
  const widgetData = ref<Record<string, any>>({})
  const availableWidgets = ref<WidgetSummary[]>([])
  const isCustomized = ref(false)
  const source = ref<'role' | 'company' | null>(null)
  const settings = ref<DashboardSettings>({ refreshSeconds: 300 })
  const fetchedAt = ref<string | null>(null)

  const isLoading = ref(false)
  const isEditing = ref(false)
  const error = ref<string | null>(null)
  const widgetLoading = ref<Record<string, boolean>>({})
  const widgetErrors = ref<Record<string, string>>({})

  let timer: ReturnType<typeof setInterval> | null = null

  const visibleWidgets = computed(() => layout.value.filter((w) => w.isVisible).sort((a, b) => a.order - b.order))

  async function loadDashboard() {
    isLoading.value = true
    error.value = null
    try {
      applyResponse(await fetchDashboard())
    } catch (err) {
      error.value = messageOf(err, 'Failed to load the dashboard')
    } finally {
      isLoading.value = false
    }
  }

  function applyResponse(res: Awaited<ReturnType<typeof fetchDashboard>>) {
    layout.value = res.layout
    widgetData.value = res.widgetData
    isCustomized.value = res.isCustomized
    source.value = res.source
    settings.value = res.settings
    fetchedAt.value = res.fetchedAt
    widgetErrors.value = Object.fromEntries(res.errors.map((k) => [k, 'Could not load this widget']))
    startAutoRefresh()
  }

  async function loadAvailableWidgets() {
    try {
      availableWidgets.value = await fetchAvailableWidgets()
    } catch (err) {
      ToastService.error(messageOf(err, 'Failed to load the widget catalogue'))
    }
  }

  async function refreshWidget(widgetKey: string, silent = false) {
    widgetLoading.value[widgetKey] = true
    try {
      const res = await fetchWidgetData(widgetKey)
      widgetData.value[widgetKey] = res.data
      delete widgetErrors.value[widgetKey]
      fetchedAt.value = res.fetchedAt
    } catch (err) {
      widgetErrors.value[widgetKey] = messageOf(err, 'Could not load this widget')
      if (!silent) ToastService.error(widgetErrors.value[widgetKey])
    } finally {
      widgetLoading.value[widgetKey] = false
    }
  }

  async function refreshAll(silent = true) {
    await Promise.all(visibleWidgets.value.map((w) => refreshWidget(w.widgetKey, silent)))
  }

  async function addWidget(widgetKey: string, size?: WidgetSize) {
    try {
      const { placement, data } = await addWidgetApi(widgetKey, size)
      const existing = layout.value.findIndex((w) => w.widgetKey === widgetKey)
      if (existing !== -1) layout.value.splice(existing, 1)
      layout.value.push(placement)
      widgetData.value[widgetKey] = data
      isCustomized.value = true
      availableWidgets.value = availableWidgets.value.filter((w) => w.key !== widgetKey)
    } catch (err) {
      ToastService.error(messageOf(err, 'Failed to add the widget'))
    }
  }

  async function hideWidget(widgetKey: string) {
    const entry = layout.value.find((w) => w.widgetKey === widgetKey)
    if (!entry || entry.isLocked) return
    entry.isVisible = false
    isCustomized.value = true
    try {
      await hideWidgetApi(widgetKey)
      const def = availableWidgets.value.find((w) => w.key === widgetKey)
      if (!def) {
        availableWidgets.value.push({
          key: entry.widgetKey, displayName: entry.displayName, description: entry.description, category: entry.category,
          widgetType: entry.widgetType, defaultSize: entry.size, requiredPermission: '', requiredModule: '', isDefaultVisible: false, link: entry.link,
        })
      }
    } catch (err) {
      entry.isVisible = true
      ToastService.error(messageOf(err, 'Failed to hide the widget'))
    }
  }

  async function resizeWidget(widgetKey: string, size: WidgetSize) {
    const entry = layout.value.find((w) => w.widgetKey === widgetKey)
    if (!entry || entry.isLocked || entry.size === size) return
    const previous = entry.size
    entry.size = size
    isCustomized.value = true
    try {
      await resizeWidgetApi(widgetKey, size)
    } catch (err) {
      entry.size = previous
      ToastService.error(messageOf(err, 'Failed to resize the widget'))
    }
  }

  async function reorderWidgets(widgetKeys: string[]) {
    const previous = layout.value.map((w) => ({ key: w.widgetKey, order: w.order }))
    const hidden = layout.value.filter((w) => !w.isVisible).sort((a, b) => a.order - b.order)
    widgetKeys.forEach((key, i) => {
      const entry = layout.value.find((w) => w.widgetKey === key)
      if (entry) entry.order = i
    })
    hidden.forEach((w, i) => (w.order = widgetKeys.length + i))
    isCustomized.value = true
    try {
      await reorderWidgetsApi(widgetKeys)
    } catch (err) {
      previous.forEach((p) => {
        const entry = layout.value.find((w) => w.widgetKey === p.key)
        if (entry) entry.order = p.order
      })
      ToastService.error(messageOf(err, 'Failed to save the order'))
    }
  }

  async function setRefreshSeconds(seconds: number) {
    const previous = settings.value.refreshSeconds
    settings.value = { ...settings.value, refreshSeconds: seconds }
    startAutoRefresh()
    try {
      await updateDashboardSettings({ refreshSeconds: seconds })
    } catch (err) {
      settings.value = { ...settings.value, refreshSeconds: previous }
      startAutoRefresh()
      ToastService.error(messageOf(err, 'Failed to save the refresh interval'))
    }
  }

  async function resetToDefaults() {
    isLoading.value = true
    try {
      applyResponse(await resetDashboardApi())
      availableWidgets.value = []
      if (isEditing.value) await loadAvailableWidgets()
    } catch (err) {
      ToastService.error(messageOf(err, 'Failed to reset the dashboard'))
    } finally {
      isLoading.value = false
    }
  }

  async function toggleEditMode() {
    isEditing.value = !isEditing.value
    if (isEditing.value) await loadAvailableWidgets()
  }

  function startAutoRefresh() {
    stopAutoRefresh()
    const seconds = settings.value.refreshSeconds
    if (seconds > 0) {
      timer = setInterval(() => {
        if (!isEditing.value && document.visibilityState === 'visible') refreshAll(true)
      }, seconds * 1000)
    }
  }

  function stopAutoRefresh() {
    if (timer) clearInterval(timer)
    timer = null
  }

  /** Called when the dashboard view unmounts */
  function dispose() {
    stopAutoRefresh()
    isEditing.value = false
  }

  return {
    layout, widgetData, availableWidgets, isCustomized, source, settings, fetchedAt,
    isLoading, isEditing, error, widgetLoading, widgetErrors, visibleWidgets,
    loadDashboard, loadAvailableWidgets, refreshWidget, refreshAll, addWidget, hideWidget, resizeWidget, reorderWidgets,
    setRefreshSeconds, resetToDefaults, toggleEditMode, startAutoRefresh, stopAutoRefresh, dispose,
  }
})
