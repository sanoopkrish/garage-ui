import api from '@/api/client'
import { TimesheetStatus } from '@/types/generated/enums/hr'

/** Weekly timesheets (Sprint 18) — mirrors TimesheetResponseDto; workflow ported from PSA */
export interface TimesheetLine {
  id: string
  workDate: string
  scheduledHours: number
  attendedHours: number
  jobHours: number
  leaveHours: number
  sickHours: number
  overtimeHours: number
  firstInAt: string | null
  lastOutAt: string | null
  breakMinutes: number
  flags: string[]
  note: string | null
}

export interface Timesheet {
  id: string
  userId: string
  employeeName?: string
  employeeEmail?: string
  periodStart: string
  periodEnd: string
  status: TimesheetStatus
  contractedHours: number
  scheduledHours: number
  attendedHours: number
  jobHours: number
  leaveHours: number
  sickHours: number
  overtimeHours: number
  totalPaidHours: number
  submittedAt: string | null
  approvedAt: string | null
  approvedById: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  lockedAt: string | null
  reopenedReason: string | null
  employeeNotes: string | null
  managerNotes: string | null
  flags: string[]
  lines: TimesheetLine[]
}

export interface GenerateResult { periodStart: string; periodEnd: string; generated: number; refreshed: number; skipped: number }

const unwrap = (r: any) => r.data?.data ?? r.data

export async function getMyTimesheet(periodStart?: string): Promise<{ timesheet: Timesheet | null; currentPeriodStart: string }> {
  return unwrap(await api.get('/hr/timesheets/me', { params: { periodStart } }))
}

export async function getMyTimesheetHistory(): Promise<Timesheet[]> {
  return unwrap(await api.get('/hr/timesheets/me/history')).items ?? []
}

export async function getTimesheets(params?: { periodStart?: string; status?: TimesheetStatus; userId?: string }): Promise<Timesheet[]> {
  return unwrap(await api.get('/hr/timesheets', { params })).items ?? []
}

export async function getPendingTimesheets(): Promise<Timesheet[]> {
  return unwrap(await api.get('/hr/timesheets/pending')).items ?? []
}

export async function getTimesheet(id: string): Promise<Timesheet> {
  return unwrap(await api.get(`/hr/timesheets/${id}`))
}

export async function generateTimesheets(periodStart: string, notify = false): Promise<GenerateResult> {
  return unwrap(await api.post('/hr/timesheets/generate', { periodStart, notify }))
}

export async function submitTimesheet(id: string, notes?: string): Promise<Timesheet> {
  return unwrap(await api.post(`/hr/timesheets/${id}/submit`, { notes }))
}

export async function recallTimesheet(id: string): Promise<Timesheet> {
  return unwrap(await api.post(`/hr/timesheets/${id}/recall`))
}

export async function approveTimesheet(id: string, comments?: string): Promise<Timesheet> {
  return unwrap(await api.post(`/hr/timesheets/${id}/approve`, { comments }))
}

export async function rejectTimesheet(id: string, comments: string): Promise<Timesheet> {
  return unwrap(await api.post(`/hr/timesheets/${id}/reject`, { comments }))
}

export async function reopenTimesheet(id: string, comments: string): Promise<Timesheet> {
  return unwrap(await api.post(`/hr/timesheets/${id}/reopen`, { comments }))
}

export async function updateTimesheetLine(
  id: string, lineId: string, payload: { leaveHours?: number; sickHours?: number; note?: string },
): Promise<Timesheet> {
  return unwrap(await api.patch(`/hr/timesheets/${id}/lines/${lineId}`, payload))
}

export async function downloadTimesheetCsv(periodStart: string): Promise<void> {
  const response = await api.get('/hr/timesheets/export.csv', { params: { periodStart }, responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `timesheets-${periodStart}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
