// Auto-generated from backend enums
// Source: src/shared/enums/hr.enum.ts
// Generated at: 2026-10-05T12:06:00.405Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum AttendanceSource {
  FIELD_APP = 'field_app',
  DESKTOP = 'desktop',
  KIOSK = 'kiosk',
  JOB_TIMER = 'job_timer',
  AUTO = 'auto',
  MANAGER = 'manager',
}

export const AttendanceSourceLabels: Record<AttendanceSource, string> = {
  [AttendanceSource.FIELD_APP]: 'field_app',
  [AttendanceSource.DESKTOP]: 'desktop',
  [AttendanceSource.KIOSK]: 'kiosk',
  [AttendanceSource.JOB_TIMER]: 'job_timer',
  [AttendanceSource.AUTO]: 'auto',
  [AttendanceSource.MANAGER]: 'manager',
};

export const AttendanceSourceValues = Object.values(AttendanceSource);

export enum AttendanceFlag {
  LATE = 'late',
  OFF_SITE = 'off_site',
  AUTO_CLOSED = 'auto_closed',
  MISSING_CLOCK_OUT = 'missing_clock_out',
  MANAGER_ADJUSTED = 'manager_adjusted',
  NO_ATTENDANCE = 'no_attendance',
}

export const AttendanceFlagLabels: Record<AttendanceFlag, string> = {
  [AttendanceFlag.LATE]: 'late',
  [AttendanceFlag.OFF_SITE]: 'off_site',
  [AttendanceFlag.AUTO_CLOSED]: 'auto_closed',
  [AttendanceFlag.MISSING_CLOCK_OUT]: 'missing_clock_out',
  [AttendanceFlag.MANAGER_ADJUSTED]: 'manager_adjusted',
  [AttendanceFlag.NO_ATTENDANCE]: 'no_attendance',
};

export const AttendanceFlagValues = Object.values(AttendanceFlag);

export enum TimesheetStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  LOCKED = 'locked',
}

export const TimesheetStatusLabels: Record<TimesheetStatus, string> = {
  [TimesheetStatus.DRAFT]: 'draft',
  [TimesheetStatus.SUBMITTED]: 'submitted',
  [TimesheetStatus.APPROVED]: 'approved',
  [TimesheetStatus.REJECTED]: 'rejected',
  [TimesheetStatus.LOCKED]: 'locked',
};

export const TimesheetStatusValues = Object.values(TimesheetStatus);

export enum OvertimeMode {
  WEEKLY_OVER_CONTRACTED = 'weekly_over_contracted',
  DAILY_OVER_HOURS = 'daily_over_hours',
}

export const OvertimeModeLabels: Record<OvertimeMode, string> = {
  [OvertimeMode.WEEKLY_OVER_CONTRACTED]: 'weekly_over_contracted',
  [OvertimeMode.DAILY_OVER_HOURS]: 'daily_over_hours',
};

export const OvertimeModeValues = Object.values(OvertimeMode);

