import api from '@/api/client'
import { JobStatus, FuelLevel, KeyStatus, RoadTestStatus, WorkLocation, VisitStatus, NoteSource } from '@/types/generated/enums/job'

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
  /** Sprint 27 — manual (a person), auto (a status rule) or system (check-in / quote flow) */
  source: 'manual' | 'auto' | 'system'
  rule: string | null
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

/** Sprint 26 — where an on-site job happens */
export interface SiteAddress {
  street: string
  street2?: string
  city: string
  postcode: string
  country?: string
  contactName?: string
  contactPhone?: string
  accessNotes?: string
}

/** Sprint 26 — one technician-day on the job */
export interface JobVisit {
  id: string
  assignmentId: string
  technicianId: string
  technicianName: string
  visitDate: string
  sequence: number | null
  status: VisitStatus
  hours: number
  needsReview: boolean
}

export interface Job {
  id: string
  jobNumber: string
  description: string
  status: JobStatus
  // Sprint 26
  workLocation: WorkLocation
  siteAddress?: SiteAddress | null
  siteLat?: number | null
  siteLng?: number | null
  quoteRequired: boolean
  visits?: JobVisit[]
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
  /** Sprint 27 — hand-over sign-off */
  handedOverAt?: string | null
  handedOverTo?: string | null
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
  // Sprint 26
  workLocation?: WorkLocation
  siteAddress?: SiteAddress | null
  quoteRequired?: boolean
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
  /** Sprint 26 */
  workLocation?: WorkLocation
  visitDate?: string
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

/** Sprint 27 — record who collected the vehicle; collects the job when the sign-off rule is on */
export async function handOverJob(id: string, handedOverTo: string, note?: string): Promise<Job> {
  const response = await api.post(`/jobs/${id}/hand-over`, { handedOverTo, note })
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

export async function assignTechnician(jobId: string, technicianId: string, scheduledDate?: string, days = 1): Promise<Job> {
  const response = await api.post(`/jobs/${jobId}/assignments`, { technicianId, scheduledDate, days })
  return response.data?.data ?? response.data
}

// ── Sprint 26: visits (technician-days) ──────────────────────────────────────

/** A visit as the day/planner endpoints return it (job context included) */
export interface VisitSummary extends JobVisit {
  jobId: string
  jobNumber: string
  jobDescription: string
  workLocation: WorkLocation
  postcode?: string | null
  customerName?: string
  vehicleRegistration?: string
}

export async function getJobVisits(jobId: string): Promise<VisitSummary[]> {
  const response = await api.get(`/jobs/${jobId}/visits`)
  const data = response.data?.data ?? response.data
  return data.items ?? []
}

export async function createVisit(jobId: string, assignmentId: string, visitDate: string): Promise<VisitSummary> {
  const response = await api.post(`/jobs/${jobId}/visits`, { assignmentId, visitDate })
  return response.data?.data ?? response.data
}

export async function updateVisit(jobId: string, visitId: string, dto: { visitDate?: string; sequence?: number; status?: VisitStatus }): Promise<VisitSummary> {
  const response = await api.patch(`/jobs/${jobId}/visits/${visitId}`, dto)
  return response.data?.data ?? response.data
}

export async function deleteVisit(jobId: string, visitId: string): Promise<void> {
  await api.delete(`/jobs/${jobId}/visits/${visitId}`)
}

export async function reorderVisits(visitIds: string[]): Promise<VisitSummary[]> {
  const response = await api.post('/visits/reorder', { visitIds })
  const data = response.data?.data ?? response.data
  return data.items ?? []
}

/** Technicians get their own day; the office may pass a technicianId */
export async function getVisitsForDay(date: string, technicianId?: string): Promise<VisitSummary[]> {
  const response = await api.get('/visits/day', { params: { date, technicianId } })
  const data = response.data?.data ?? response.data
  return data.items ?? []
}

// ---- Sprint 27: Assignments planner ----

export interface PlannerTechnician {
  id: string
  name: string
  role: string
  skills: string[]
}

export interface PlannerVisit extends VisitSummary {
  estimatedHours: number
  jobStatus: JobStatus
  dayIndex: number
  dayCount: number
}

export interface PlannerUnscheduledJob {
  jobId: string
  jobNumber: string
  description: string
  status: JobStatus
  workLocation: WorkLocation
  postcode?: string | null
  customerName?: string
  vehicleRegistration?: string
  dueDate?: string | null
  estimatedHours: number
  assignedTechnicianIds: string[]
}

export interface PlannerCapacity {
  technicianId: string
  date: string
  shiftHours: number
  bookedHours: number
  workingDay: boolean
  overbooked: boolean
}

export interface PlannerData {
  from: string
  to: string
  workingDays: number[]
  shiftHours: number
  technicians: PlannerTechnician[]
  visits: PlannerVisit[]
  unscheduled: PlannerUnscheduledJob[]
  capacity: PlannerCapacity[]
}

export async function getPlanner(from: string, to: string): Promise<PlannerData> {
  const response = await api.get('/visits/planner', { params: { from, to } })
  return response.data?.data ?? response.data
}

export async function planVisit(dto: { jobId: string; technicianId: string; visitDate: string; sequence?: number; force?: boolean }): Promise<VisitSummary> {
  const response = await api.post('/visits/plan', dto)
  return response.data?.data ?? response.data
}

export async function moveVisit(visitId: string, dto: { technicianId?: string; visitDate: string; sequence?: number; force?: boolean }): Promise<VisitSummary> {
  const response = await api.post(`/visits/${visitId}/move`, dto)
  return response.data?.data ?? response.data
}

export async function getUpcomingVisits(from?: string): Promise<VisitSummary[]> {
  const response = await api.get('/visits/upcoming', { params: { from } })
  const data = response.data?.data ?? response.data
  return data.items ?? []
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

// ── Sprint 26: job notes (append-only feed) ──────────────────────────────────

export interface JobNote {
  id: string
  jobId: string
  authorId: string
  authorName: string
  body: string
  source: NoteSource
  createdAt: string
}

export async function getJobNotes(jobId: string): Promise<JobNote[]> {
  const response = await api.get(`/jobs/${jobId}/notes`)
  const data = response.data?.data ?? response.data
  return data.items ?? []
}

export async function addJobNote(jobId: string, body: string): Promise<JobNote> {
  const response = await api.post(`/jobs/${jobId}/notes`, { body })
  return response.data?.data ?? response.data
}

// ── Sprint 26: daily route ───────────────────────────────────────────────────

export interface RouteStop extends VisitSummary {
  address?: string | null
  lat?: number | null
  lng?: number | null
  legKm?: number | null
}

export interface DailyRoute {
  date: string
  technicianId: string
  start: { label: string; address: string | null; lat: number | null; lng: number | null }
  stops: RouteStop[]
  mapsUrl: string | null
  mapsUrlTruncated: boolean
  totalKm: number
}

export async function getMyRoute(date?: string): Promise<DailyRoute> {
  const response = await api.get('/routes/my-day', { params: { date } })
  return response.data?.data ?? response.data
}

export async function getTechnicianRoute(technicianId: string, date?: string): Promise<DailyRoute> {
  const response = await api.get('/routes/day', { params: { technicianId, date } })
  return response.data?.data ?? response.data
}

/** Google / Apple Maps directions link for one address — opens the native app on a phone */
export function navigateUrl(address: { street?: string; city?: string; postcode?: string } | null | undefined): string | null {
  if (!address) return null
  const q = [address.street, address.city, address.postcode].filter(Boolean).join(', ')
  return q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : null
}

/** Sprint 26 — the stop sheet answers ride along with the notes */
export interface StopTimerOptions {
  notes?: string
  finishedForToday?: boolean
  returnTomorrow?: boolean
  returnDate?: string
  /** Sprint 27 — the work on this job is finished (completes the job when the rule is on) */
  jobFinished?: boolean
}

export async function stopTimer(jobId: string, assignmentId: string, options?: string | StopTimerOptions): Promise<void> {
  const body = typeof options === 'string' ? { notes: options } : (options ?? {})
  await api.post(`/jobs/${jobId}/assignments/${assignmentId}/timer/stop`, body)
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
  aiUsed: boolean
  summary?: string
  customerExplanation?: string
  faultCodeDetails?: { code: string; description: string; status?: string }[]
  vehicle?: { make?: string; model?: string; vin?: string }
}

export async function analyseDiagnosticReport(s3Key: string): Promise<InboxAnalysis> {
  const response = await api.post('/diagnostics/inbox', { s3Key })
  return response.data?.data ?? response.data
}

export async function confirmDiagnosticReport(
  s3Key: string,
  jobId: string,
  faultCodes?: string[],
  ai?: { summary?: string; faultCodeDescriptions?: Record<string, string> },
): Promise<{ attachmentId: string; faultCodesCreated: number }> {
  const response = await api.post('/diagnostics/inbox/confirm', {
    s3Key,
    jobId,
    faultCodes,
    summary: ai?.summary,
    faultCodeDescriptions: ai?.faultCodeDescriptions,
  })
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

/** Module 11 — book a rework job linked to a completed/collected job */
export async function createRework(jobId: string, complaintDescription: string): Promise<any> {
  const response = await api.post(`/jobs/${jobId}/rework`, { complaintDescription })
  return response.data?.data ?? response.data
}
