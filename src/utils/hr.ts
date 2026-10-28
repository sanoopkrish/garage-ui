import { AttendanceFlag, AttendanceSource, TimesheetStatus } from '@/types/generated/enums/hr'

export const timesheetStatusLabels: Record<TimesheetStatus, string> = {
  [TimesheetStatus.DRAFT]: 'Draft',
  [TimesheetStatus.SUBMITTED]: 'Submitted',
  [TimesheetStatus.APPROVED]: 'Approved',
  [TimesheetStatus.REJECTED]: 'Rejected',
  [TimesheetStatus.LOCKED]: 'Approved',
}

export const timesheetStatusVariant: Record<TimesheetStatus, string> = {
  [TimesheetStatus.DRAFT]: 'pending',
  [TimesheetStatus.SUBMITTED]: 'progress',
  [TimesheetStatus.APPROVED]: 'done',
  [TimesheetStatus.REJECTED]: 'cancelled',
  [TimesheetStatus.LOCKED]: 'done',
}

export const attendanceFlagLabels: Record<string, string> = {
  [AttendanceFlag.LATE]: 'Late',
  [AttendanceFlag.OFF_SITE]: 'Off site',
  [AttendanceFlag.AUTO_CLOSED]: 'Auto-closed',
  [AttendanceFlag.MISSING_CLOCK_OUT]: 'Missing clock-out',
  [AttendanceFlag.MANAGER_ADJUSTED]: 'Adjusted',
  [AttendanceFlag.NO_ATTENDANCE]: 'No attendance',
}

/** Tailwind classes per flag chip */
export const attendanceFlagClass: Record<string, string> = {
  [AttendanceFlag.LATE]: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  [AttendanceFlag.OFF_SITE]: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
  [AttendanceFlag.AUTO_CLOSED]: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  [AttendanceFlag.MISSING_CLOCK_OUT]: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  [AttendanceFlag.MANAGER_ADJUSTED]: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  [AttendanceFlag.NO_ATTENDANCE]: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
}

export const attendanceSourceLabels: Record<AttendanceSource, string> = {
  [AttendanceSource.FIELD_APP]: 'Phone',
  [AttendanceSource.DESKTOP]: 'Desktop',
  [AttendanceSource.KIOSK]: 'Kiosk',
  [AttendanceSource.JOB_TIMER]: 'Job timer',
  [AttendanceSource.AUTO]: 'Automatic',
  [AttendanceSource.MANAGER]: 'Manager',
}

/** 2.5 → "2h 30m"; minutes variant below */
export function hoursLabel(hours: number): string {
  return minutesLabel(Math.round(Number(hours) * 60))
}
export function minutesLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}
export const h2 = (v: number) => Number(v ?? 0).toFixed(2)

export function timeOf(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
}
/** YYYY-MM-DD → "Mon 21 Sept" (parsed as a local date so it never shifts a day) */
export function dayLabel(date: string, withWeekday = true): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { ...(withWeekday ? { weekday: 'short' } : {}), day: '2-digit', month: 'short' })
}
export function weekLabel(periodStart: string, periodEnd: string): string {
  return `${dayLabel(periodStart, false)} – ${dayLabel(periodEnd, false)}`
}
export function addDaysIso(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return next.toISOString().slice(0, 10)
}
export function isoToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
