// Auto-generated from backend enums
// Source: src/shared/enums/job.enum.ts
// Generated at: 2026-07-21T10:29:19.788Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum JobStatus {
  ENQUIRY = 'enquiry',
  BOOKED = 'booked',
  CHECKED_IN = 'checked_in',
  DIAGNOSIS = 'diagnosis',
  QUOTED = 'quoted',
  AWAITING_AUTHORISATION = 'awaiting_authorisation',
  APPROVED = 'approved',
  PARTS_ORDERED = 'parts_ordered',
  IN_REPAIR = 'in_repair',
  QUALITY_CHECK = 'quality_check',
  COMPLETE = 'complete',
  COLLECTED = 'collected',
  CANCELLED = 'cancelled',
}

export const JobStatusLabels: Record<JobStatus, string> = {
  [JobStatus.ENQUIRY]: 'enquiry',
  [JobStatus.BOOKED]: 'booked',
  [JobStatus.CHECKED_IN]: 'checked_in',
  [JobStatus.DIAGNOSIS]: 'diagnosis',
  [JobStatus.QUOTED]: 'quoted',
  [JobStatus.AWAITING_AUTHORISATION]: 'awaiting_authorisation',
  [JobStatus.APPROVED]: 'approved',
  [JobStatus.PARTS_ORDERED]: 'parts_ordered',
  [JobStatus.IN_REPAIR]: 'in_repair',
  [JobStatus.QUALITY_CHECK]: 'quality_check',
  [JobStatus.COMPLETE]: 'complete',
  [JobStatus.COLLECTED]: 'collected',
  [JobStatus.CANCELLED]: 'cancelled',
};

export const JobStatusValues = Object.values(JobStatus);

export enum FuelLevel {
  EMPTY = 'empty',
  QUARTER = 'quarter',
  HALF = 'half',
  THREE_QUARTERS = 'three_quarters',
  FULL = 'full',
}

export const FuelLevelLabels: Record<FuelLevel, string> = {
  [FuelLevel.EMPTY]: 'empty',
  [FuelLevel.QUARTER]: 'quarter',
  [FuelLevel.HALF]: 'half',
  [FuelLevel.THREE_QUARTERS]: 'three_quarters',
  [FuelLevel.FULL]: 'full',
};

export const FuelLevelValues = Object.values(FuelLevel);

export enum KeyStatus {
  IN_WORKSHOP = 'in_workshop',
  RETURNED = 'returned',
}

export const KeyStatusLabels: Record<KeyStatus, string> = {
  [KeyStatus.IN_WORKSHOP]: 'in_workshop',
  [KeyStatus.RETURNED]: 'returned',
};

export const KeyStatusValues = Object.values(KeyStatus);

export enum RoadTestStatus {
  NOT_REQUIRED = 'not_required',
  REQUIRED = 'required',
  COMPLETED = 'completed',
}

export const RoadTestStatusLabels: Record<RoadTestStatus, string> = {
  [RoadTestStatus.NOT_REQUIRED]: 'not_required',
  [RoadTestStatus.REQUIRED]: 'required',
  [RoadTestStatus.COMPLETED]: 'completed',
};

export const RoadTestStatusValues = Object.values(RoadTestStatus);

export enum TimeEntrySource {
  WORKSHOP = 'workshop',
  FIELD = 'field',
}

export const TimeEntrySourceLabels: Record<TimeEntrySource, string> = {
  [TimeEntrySource.WORKSHOP]: 'workshop',
  [TimeEntrySource.FIELD]: 'field',
};

export const TimeEntrySourceValues = Object.values(TimeEntrySource);

export enum ChecklistType {
  FIELD = 'field',
  QC = 'qc',
}

export const ChecklistTypeLabels: Record<ChecklistType, string> = {
  [ChecklistType.FIELD]: 'field',
  [ChecklistType.QC]: 'qc',
};

export const ChecklistTypeValues = Object.values(ChecklistType);

export enum MileageSource {
  RAM = 'ram',
  MANUAL = 'manual',
}

export const MileageSourceLabels: Record<MileageSource, string> = {
  [MileageSource.RAM]: 'ram',
  [MileageSource.MANUAL]: 'manual',
};

export const MileageSourceValues = Object.values(MileageSource);

export enum FaultCodeSource {
  REPORT = 'report',
  MANUAL = 'manual',
}

export const FaultCodeSourceLabels: Record<FaultCodeSource, string> = {
  [FaultCodeSource.REPORT]: 'report',
  [FaultCodeSource.MANUAL]: 'manual',
};

export const FaultCodeSourceValues = Object.values(FaultCodeSource);

export enum PartsOrderStatus {
  TO_ORDER = 'to_order',
  ORDERED = 'ordered',
  DELAYED = 'delayed',
  RECEIVED = 'received',
  WRONG_PART = 'wrong_part',
  RETURNED = 'returned',
}

export const PartsOrderStatusLabels: Record<PartsOrderStatus, string> = {
  [PartsOrderStatus.TO_ORDER]: 'to_order',
  [PartsOrderStatus.ORDERED]: 'ordered',
  [PartsOrderStatus.DELAYED]: 'delayed',
  [PartsOrderStatus.RECEIVED]: 'received',
  [PartsOrderStatus.WRONG_PART]: 'wrong_part',
  [PartsOrderStatus.RETURNED]: 'returned',
};

export const PartsOrderStatusValues = Object.values(PartsOrderStatus);

