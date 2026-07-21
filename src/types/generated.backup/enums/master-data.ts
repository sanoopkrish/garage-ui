// Auto-generated from backend enums
// Source: src/shared/enums/master-data.enum.ts
// Generated at: 2026-07-20T11:43:10.990Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum Timeframe {
  BUSINESS_HOURS = 'Business Hours',
  ALL_HOURS = 'All (24 X 7)',
  EXTENDED = 'Extended',
}

export const TimeframeLabels: Record<Timeframe, string> = {
  [Timeframe.BUSINESS_HOURS]: 'Business Hours',
  [Timeframe.ALL_HOURS]: 'All (24 X 7)',
  [Timeframe.EXTENDED]: 'Extended',
};

export const TimeframeValues = Object.values(Timeframe);

