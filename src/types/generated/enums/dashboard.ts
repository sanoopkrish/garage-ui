// Auto-generated from backend enums
// Source: src/shared/enums/dashboard.enum.ts
// Generated at: 2026-10-07T14:34:31.131Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum WidgetCategory {
  TODAY = 'today',
  WORKSHOP = 'workshop',
  FIELD = 'field',
  FINANCE = 'finance',
  PURCHASING = 'purchasing',
  HR = 'hr',
  ASSETS = 'assets',
  ACTIVITY = 'activity',
}

export const WidgetCategoryLabels: Record<WidgetCategory, string> = {
  [WidgetCategory.TODAY]: 'today',
  [WidgetCategory.WORKSHOP]: 'workshop',
  [WidgetCategory.FIELD]: 'field',
  [WidgetCategory.FINANCE]: 'finance',
  [WidgetCategory.PURCHASING]: 'purchasing',
  [WidgetCategory.HR]: 'hr',
  [WidgetCategory.ASSETS]: 'assets',
  [WidgetCategory.ACTIVITY]: 'activity',
};

export const WidgetCategoryValues = Object.values(WidgetCategory);

export enum WidgetType {
  STAT_CARD = 'stat_card',
  STAT_CARD_TREND = 'stat_card_trend',
  CHART_BAR = 'chart_bar',
  CHART_LINE = 'chart_line',
  CHART_DOUGHNUT = 'chart_doughnut',
  GAUGE = 'gauge',
  LIST = 'list',
  STATUS_LIST = 'status_list',
  TABLE = 'table',
  TIMELINE = 'timeline',
}

export const WidgetTypeLabels: Record<WidgetType, string> = {
  [WidgetType.STAT_CARD]: 'stat_card',
  [WidgetType.STAT_CARD_TREND]: 'stat_card_trend',
  [WidgetType.CHART_BAR]: 'chart_bar',
  [WidgetType.CHART_LINE]: 'chart_line',
  [WidgetType.CHART_DOUGHNUT]: 'chart_doughnut',
  [WidgetType.GAUGE]: 'gauge',
  [WidgetType.LIST]: 'list',
  [WidgetType.STATUS_LIST]: 'status_list',
  [WidgetType.TABLE]: 'table',
  [WidgetType.TIMELINE]: 'timeline',
};

export const WidgetTypeValues = Object.values(WidgetType);

export enum WidgetSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  FULL = 'full',
}

export const WidgetSizeLabels: Record<WidgetSize, string> = {
  [WidgetSize.SMALL]: 'small',
  [WidgetSize.MEDIUM]: 'medium',
  [WidgetSize.LARGE]: 'large',
  [WidgetSize.FULL]: 'full',
};

export const WidgetSizeValues = Object.values(WidgetSize);

