import api from '@/api/client'
import { AttendanceSource } from '@/types/generated/enums/hr'

/** Clocking in / out (Sprint 18) — mirrors AttendanceResponseDto */
export interface AttendanceLocation { lat: number; lng: number; accuracy?: number }

export interface AttendanceRecord {
  id: string
  userId: string
  userName?: string
  clockInAt: string
  clockOutAt: string | null
  sourceIn: AttendanceSource
  sourceOut: AttendanceSource | null
  locationIn: AttendanceLocation | null
  locationOut: AttendanceLocation | null
  inGeofenceIn: boolean | null
  inGeofenceOut: boolean | null
  breakMinutes: number
  workedMinutes: number | null
  flags: string[]
  adjustedReason: string | null
  adjustedAt: string | null
  notes: string | null
}

export interface AttendanceStatus {
  clockedIn: boolean
  open: AttendanceRecord | null
  todayWorkedMinutes: number
  runningTimers: { jobId: string; jobNumber: string }[]
}

export interface ClockPayload { source: AttendanceSource; location?: AttendanceLocation; notes?: string }

const unwrap = (r: any) => r.data?.data ?? r.data

export async function getAttendanceStatus(): Promise<AttendanceStatus> {
  return unwrap(await api.get('/hr/attendance/status'))
}

export async function clockIn(payload: ClockPayload): Promise<AttendanceRecord> {
  return unwrap(await api.post('/hr/attendance/clock-in', payload))
}

export async function clockOut(payload: ClockPayload): Promise<AttendanceRecord & { stoppedTimers: string[] }> {
  return unwrap(await api.post('/hr/attendance/clock-out', payload))
}

export async function getAttendance(params?: { userId?: string; from?: string; to?: string; flag?: string }): Promise<AttendanceRecord[]> {
  return unwrap(await api.get('/hr/attendance', { params })).items ?? []
}

export async function getWhosIn(): Promise<AttendanceRecord[]> {
  return unwrap(await api.get('/hr/attendance/whos-in')).items ?? []
}

export async function adjustAttendance(
  id: string,
  payload: { clockInAt?: string; clockOutAt?: string; breakMinutes?: number; reason: string },
): Promise<AttendanceRecord> {
  return unwrap(await api.patch(`/hr/attendance/${id}`, payload))
}

export async function runAttendanceChecks(): Promise<{ autoClosed: number }> {
  return unwrap(await api.post('/hr/attendance/run-checks'))
}
