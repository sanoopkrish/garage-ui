import { markRaw, type Component } from 'vue'
import { WidgetType } from '@/types/generated/enums/dashboard'
import StatCardWidget from './widgets/StatCardWidget.vue'
import StatusListWidget from './widgets/StatusListWidget.vue'
import BarChartWidget from './widgets/BarChartWidget.vue'
import LineChartWidget from './widgets/LineChartWidget.vue'
import DoughnutChartWidget from './widgets/DoughnutChartWidget.vue'
import GaugeWidget from './widgets/GaugeWidget.vue'
import ListWidget from './widgets/ListWidget.vue'
import TableWidget from './widgets/TableWidget.vue'
import TimelineWidget from './widgets/TimelineWidget.vue'

/** Widget type (from the registry) → component. Keys are never mapped here. */
const WIDGET_TYPE_MAP: Record<WidgetType, Component> = {
  [WidgetType.STAT_CARD]: markRaw(StatCardWidget),
  [WidgetType.STAT_CARD_TREND]: markRaw(StatCardWidget),
  [WidgetType.STATUS_LIST]: markRaw(StatusListWidget),
  [WidgetType.CHART_BAR]: markRaw(BarChartWidget),
  [WidgetType.CHART_LINE]: markRaw(LineChartWidget),
  [WidgetType.CHART_DOUGHNUT]: markRaw(DoughnutChartWidget),
  [WidgetType.GAUGE]: markRaw(GaugeWidget),
  [WidgetType.LIST]: markRaw(ListWidget),
  [WidgetType.TABLE]: markRaw(TableWidget),
  [WidgetType.TIMELINE]: markRaw(TimelineWidget),
}

export function resolveWidgetComponent(widgetType: WidgetType | string): Component | null {
  return WIDGET_TYPE_MAP[widgetType as WidgetType] ?? null
}
