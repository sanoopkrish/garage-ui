// Auto-generated from backend enums
// Source: src/shared/enums/asset.enum.ts
// Generated at: 2026-10-07T14:34:31.132Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum AssetCategory {
  DIAGNOSTIC_TOOL = 'diagnostic_tool',
  ADAS_EQUIPMENT = 'adas_equipment',
  LAPTOP_TABLET = 'laptop_tablet',
  HAND_TOOL_KIT = 'hand_tool_kit',
  VEHICLE_ACCESSORY = 'vehicle_accessory',
  LIFTING_EQUIPMENT = 'lifting_equipment',
  OTHER = 'other',
}

export const AssetCategoryLabels: Record<AssetCategory, string> = {
  [AssetCategory.DIAGNOSTIC_TOOL]: 'diagnostic_tool',
  [AssetCategory.ADAS_EQUIPMENT]: 'adas_equipment',
  [AssetCategory.LAPTOP_TABLET]: 'laptop_tablet',
  [AssetCategory.HAND_TOOL_KIT]: 'hand_tool_kit',
  [AssetCategory.VEHICLE_ACCESSORY]: 'vehicle_accessory',
  [AssetCategory.LIFTING_EQUIPMENT]: 'lifting_equipment',
  [AssetCategory.OTHER]: 'other',
};

export const AssetCategoryValues = Object.values(AssetCategory);

export enum AssetCondition {
  GOOD = 'good',
  FAIR = 'fair',
  DAMAGED = 'damaged',
  OUT_OF_SERVICE = 'out_of_service',
}

export const AssetConditionLabels: Record<AssetCondition, string> = {
  [AssetCondition.GOOD]: 'good',
  [AssetCondition.FAIR]: 'fair',
  [AssetCondition.DAMAGED]: 'damaged',
  [AssetCondition.OUT_OF_SERVICE]: 'out_of_service',
};

export const AssetConditionValues = Object.values(AssetCondition);

export enum AssetStatus {
  ACTIVE = 'active',
  IN_REPAIR = 'in_repair',
  LOST = 'lost',
  DISPOSED = 'disposed',
}

export const AssetStatusLabels: Record<AssetStatus, string> = {
  [AssetStatus.ACTIVE]: 'active',
  [AssetStatus.IN_REPAIR]: 'in_repair',
  [AssetStatus.LOST]: 'lost',
  [AssetStatus.DISPOSED]: 'disposed',
};

export const AssetStatusValues = Object.values(AssetStatus);

export enum AssetLocationType {
  STAFF = 'staff',
  WORKSHOP_LOCATION = 'workshop_location',
}

export const AssetLocationTypeLabels: Record<AssetLocationType, string> = {
  [AssetLocationType.STAFF]: 'staff',
  [AssetLocationType.WORKSHOP_LOCATION]: 'workshop_location',
};

export const AssetLocationTypeValues = Object.values(AssetLocationType);

