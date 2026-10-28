import { AssetCategory, AssetCondition, AssetStatus } from '@/types/generated/enums/asset'

/** Labels + badge variants for the asset register (Sprint 21) */

export const assetCategoryLabels: Record<string, string> = {
  [AssetCategory.DIAGNOSTIC_TOOL]: 'Diagnostic tool',
  [AssetCategory.ADAS_EQUIPMENT]: 'ADAS equipment',
  [AssetCategory.LAPTOP_TABLET]: 'Laptop / tablet',
  [AssetCategory.HAND_TOOL_KIT]: 'Hand tool kit',
  [AssetCategory.VEHICLE_ACCESSORY]: 'Vehicle accessory',
  [AssetCategory.LIFTING_EQUIPMENT]: 'Lifting equipment',
  [AssetCategory.OTHER]: 'Other',
}

export const assetStatusLabels: Record<string, string> = {
  [AssetStatus.ACTIVE]: 'In use',
  [AssetStatus.IN_REPAIR]: 'In repair',
  [AssetStatus.LOST]: 'Lost',
  [AssetStatus.DISPOSED]: 'Disposed',
}
export const assetStatusVariant: Record<string, string> = {
  [AssetStatus.ACTIVE]: 'done',
  [AssetStatus.IN_REPAIR]: 'progress',
  [AssetStatus.LOST]: 'cancelled',
  [AssetStatus.DISPOSED]: 'pending',
}

export const assetConditionLabels: Record<string, string> = {
  [AssetCondition.GOOD]: 'Good',
  [AssetCondition.FAIR]: 'Fair',
  [AssetCondition.DAMAGED]: 'Damaged',
  [AssetCondition.OUT_OF_SERVICE]: 'Out of service',
}
export const assetConditionVariant: Record<string, string> = {
  [AssetCondition.GOOD]: 'done',
  [AssetCondition.FAIR]: 'open',
  [AssetCondition.DAMAGED]: 'progress',
  [AssetCondition.OUT_OF_SERVICE]: 'cancelled',
}

export const gbp = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : `£${Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const todayIso = () => new Date().toISOString().slice(0, 10)

export function apiMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message
  return Array.isArray(message) ? message.join('; ') : (message ?? fallback)
}
