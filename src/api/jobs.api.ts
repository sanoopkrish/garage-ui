import api from '@/api/client'
import { JobStatus, FuelLevel, KeyStatus, RoadTestStatus } from '@/types/generated/enums/job'

export interface JobCheckin {
  id: string
  fuelLevel: FuelLevel
  mileage: number
  bodyworkNotes?: string
  sundryNotes?: string
  keyTagNumber?: string
  lockBoxLocation?: string
  keyStatus: KeyStatus
  roadTest: RoadTestStatus
  checkedInAt: string
}

export interface JobStatusHistoryEntry {
  id: string
  fromStatus: JobStatus | null
  toStatus: JobStatus
  note: string | null
  changedAt: string
  changedBy: string | null
}

export interface JobTechnician {
  assignmentId: string
  technicianId: string
  name: string
  skills: string[]
  scheduledDate: string | null
  totalHours: number
  timeEntries?: { id: string; hours: number; workDate: string; notes: string | null }[]
}

export interface Job {
  id: string
  jobNumber: string
  description: string
  status: JobStatus
  customerId: string
  customerName?: string
  vehicleId: string
  vehicleRegistration?: string
  vehicleLabel?: string
  customerNotes?: string
  internalNotes?: string
  onBehalfOf?: string
  bookedAt?: string
  dueDate?: string
  completedAt?: string
  collectedAt?: string
  isRework: boolean
  originalJobId?: string
  complaintDate?: string
  complaintDescription?: string
  reworkResolution?: string
  checkin?: JobCheckin | null
  statusHistory?: JobStatusHistoryEntry[]
  allowedTransitions?: JobStatus[]
  technicians?: JobTechnician[]
  quotedLabourHours?: number
  loggedHours?: number
  createdAt: string
}

export interface CreateJobDto {
  customerId: string
  vehicleId: string
  description: string
  status?: JobStatus
  bookedAt?: string
  dueDate?: string
  customerNotes?: string
  internalNotes?: string
  onBehalfOf?: string
  isRework?: boolean
  originalJobId?: string
  complaintDate?: string
  complaintDescription?: string
}

export interface UpdateJobDto extends Partial<Omit<CreateJobDto, 'status'>> {
  reworkResolution?: string
}

export interface CreateJobCheckinDto {
  fuelLevel: FuelLevel
  mileage: number
  bodyworkNotes?: string
  sundryNotes?: string
  keyTagNumber?: string
  lockBoxLocation?: string
  roadTest?: RoadTestStatus
}

export interface UpdateJobCheckinDto extends Partial<CreateJobCheckinDto> {
  keyStatus?: KeyStatus
}

export interface PaginatedJobs {
  items: Job[]
  total: number
}

export async function getJobs(params?: {
  search?: string
  status?: JobStatus
  customerId?: string
  vehicleId?: string
  technicianId?: string
  isRework?: boolean
  page?: number
  pageSize?: number
}): Promise<PaginatedJobs> {
  const response = await api.get('/jobs', { params })
  const data = response.data?.data ?? response.data
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function getJob(id: string): Promise<Job> {
  const response = await api.get(`/jobs/${id}`)
  return response.data?.data ?? response.data
}

export async function createJob(dto: CreateJobDto): Promise<Job> {
  const response = await api.post('/jobs', dto)
  return response.data?.data ?? response.data
}

export async function updateJob(id: string, dto: UpdateJobDto): Promise<Job> {
  const response = await api.patch(`/jobs/${id}`, dto)
  return response.data?.data ?? response.data
}

export async function updateJobStatus(id: string, status: JobStatus, note?: string): Promise<Job> {
  const response = await api.patch(`/jobs/${id}/status`, { status, note })
  return response.data?.data ?? response.data
}

export async function createJobCheckin(id: string, dto: CreateJobCheckinDto): Promise<Job> {
  const response = await api.post(`/jobs/${id}/checkin`, dto)
  return response.data?.data ?? response.data
}

export async function updateJobCheckin(id: string, dto: UpdateJobCheckinDto): Promise<Job> {
  const response = await api.patch(`/jobs/${id}/checkin`, dto)
  return response.data?.data ?? response.data
}

export async function deleteJob(id: string): Promise<void> {
  await api.delete(`/jobs/${id}`)
}

// ===== Module 7: assignments & schedule =====

export async function assignTechnician(jobId: string, technicianId: string, scheduledDate?: string): Promise<Job> {
  const response = await api.post(`/jobs/${jobId}/assignments`, { technicianId, scheduledDate })
  return response.data?.data ?? response.data
}

export async function unassignTechnician(jobId: string, assignmentId: string): Promise<void> {
  await api.delete(`/jobs/${jobId}/assignments/${assignmentId}`)
}

export async function addTimeEntry(jobId: string, assignmentId: string, hours: number, workDate?: string, notes?: string): Promise<Job> {
  const response = await api.post(`/jobs/${jobId}/assignments/${assignmentId}/time-entries`, { hours, workDate, notes })
  return response.data?.data ?? response.data
}

export interface TechnicianStats {
  technicianId: string
  jobCount: number
  completedCount: number
  totalHours: number
}

export async function getTechnicianStats(): Promise<TechnicianStats[]> {
  const response = await api.get('/jobs/technician-stats')
  const data = response.data?.data ?? response.data
  return data.items ?? []
}

export async function getSchedule(from: string, to: string): Promise<Job[]> {
  const response = await api.get('/jobs/schedule', { params: { from, to } })
  const data = response.data?.data ?? response.data
  return data.items ?? []
}

// ---- Module 8: field checklist + on-site timer ----

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
  note: string | null
  type: string
  sortOrder: number
  doneBy: string | null
  doneAt: string | null
}

export async function getChecklist(jobId: string): Promise<ChecklistItem[]> {
  const response = await api.get(`/jobs/${jobId}/checklist`)
  const data = response.data?.data ?? response.data
  return data.items ?? []
}

export async function addChecklistItem(jobId: string, label: string, type?: string): Promise<ChecklistItem> {
  const response = await api.post(`/jobs/${jobId}/checklist`, { label, type })
  return response.data?.data ?? response.data
}

export async function updateChecklistItem(
  jobId: string,
  itemId: string,
  patch: { done?: boolean; note?: string; label?: string },
): Promise<ChecklistItem> {
  const response = await api.patch(`/jobs/${jobId}/checklist/${itemId}`, patch)
  return response.data?.data ?? response.data
}

export async function deleteChecklistItem(jobId: string, itemId: string): Promise<void> {
  await api.delete(`/jobs/${jobId}/checklist/${itemId}`)
}

export interface RunningTimer {
  assignmentId: string | null
  startedAt: string | null
  entryId: string | null
}

export async function getRunningTimer(jobId: string): Promise<RunningTimer> {
  const response = await api.get(`/jobs/${jobId}/timer`)
  return response.data?.data ?? response.data
}

export async function startTimer(jobId: string, assignmentId: string): Promise<void> {
  await api.post(`/jobs/${jobId}/assignments/${assignmentId}/timer/start`)
}

export async function stopTimer(jobId: string, assignmentId: string, notes?: string): Promise<void> {
  await api.post(`/jobs/${jobId}/assignments/${assignmentId}/timer/stop`, { notes })
}

// ---- Module 4: fault codes + diagnostics + ADAS certificate ----

export interface FaultCode {
  id: string
  code: string
  description: string | null
  source: string
  authorised: boolean
  createdAt: string
}

export async function getFaultCodes(jobId: string): Promise<FaultCode[]> {
  const response = await api.get(`/jobs/${jobId}/fault-codes`)
  const data = response.data?.data ?? response.data
  return data.items ?? []
}

export async function addFaultCode(jobId: string, code: string, description?: string): Promise<FaultCode> {
  const response = await api.post(`/jobs/${jobId}/fault-codes`, { code, description })
  return response.data?.data ?? response.data
}

export async function updateFaultCode(
  jobId: string,
  fcId: string,
  patch: { code?: string; description?: string; authorised?: boolean },
): Promise<FaultCode> {
  const response = await api.patch(`/jobs/${jobId}/fault-codes/${fcId}`, patch)
  return response.data?.data ?? response.data
}

export async function deleteFaultCode(jobId: string, fcId: string): Promise<void> {
  await api.delete(`/jobs/${jobId}/fault-codes/${fcId}`)
}

export interface InboxSuggestion {
  jobId: string
  jobNumber: string
  registration: string
  description: string
  customerName: string | null
  status: JobStatus
  confidence: number
}

export interface InboxAnalysis {
  registrations: string[]
  faultCodes: string[]
  reportDate: string | null
  suggestions: InboxSuggestion[]
}

export async function analyseDiagnosticReport(s3Key: string): Promise<InboxAnalysis> {
  const response = await api.post('/diagnostics/inbox', { s3Key })
  return response.data?.data ?? response.data
}

export async function confirmDiagnosticReport(
  s3Key: string,
  jobId: string,
  faultCodes?: string[],
): Promise<{ attachmentId: string; faultCodesCreated: number }> {
  const response = await api.post('/diagnostics/inbox/confirm', { s3Key, jobId, faultCodes })
  return response.data?.data ?? response.data
}

export function adasCertificateUrl(jobId: string): string {
  return `/jobs/${jobId}/adas-certificate/pdf`
}

export async function downloadAdasCertificate(jobId: string): Promise<Blob> {
  const response = await api.get(`/jobs/${jobId}/adas-certificate/pdf`, { responseType: 'blob' })
  return response.data
}

export async function attachAdasCertificate(jobId: string): Promise<{ attachmentId: string; fileName: string }> {
  const response = await api.post(`/jobs/${jobId}/adas-certificate/attach`)
  return response.data?.data ?? response.data
}
