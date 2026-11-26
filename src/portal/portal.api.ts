import { portalClient } from './portal.client'
import type { JobStatus } from '@/types/generated/enums/job'

/** Sprint 29 — what the customer portal reads and writes. All routes live under /portal. */

export interface PortalFeatures {
  jobStatus: boolean
  documents: boolean
  messages: boolean
  quotes: boolean
  invoices: boolean
  booking: boolean
}

export interface PortalSession {
  accessToken: string
  expiresIn: number
  contact: { id: string; name: string; email: string | null; phone: string | null; role: string }
  customer: { id: string; name: string; type: 'b2b' | 'b2c' }
}

export interface PortalMe {
  contact: PortalSession['contact']
  customer: PortalSession['customer']
  features: PortalFeatures
  welcomeText: string
  workshop: { name: string; phone: string | null; email: string | null }
}

export interface PortalVehicle {
  id: string
  registration: string
  make: string | null
  model: string | null
  colour: string | null
  year: number | null
  motExpiryDate: string | null
}

export interface PortalJobSummary {
  id: string
  jobNumber: string
  description: string
  status: JobStatus
  statusPhrase: string
  nextStep: string
  closed: boolean
  vehicle: { id: string; registration: string; make: string | null; model: string | null } | null
  workLocation: string
  onSite: boolean
  nextVisitDate: string | null
  bookedAt: string | null
  dueDate: string | null
  completedAt: string | null
  updatedAt: string
  messagesCount?: number
  lastMessageAt?: string | null
}

export interface PortalFile {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  category: string
  caption: string | null
  createdAt: string
}

export interface PortalJob extends PortalJobSummary {
  customerNotes: string | null
  siteAddress: { street: string; city: string; postcode: string } | null
  timeline: { at: string; status: JobStatus; phrase: string }[]
  steps: { status: JobStatus; label: string; state: 'done' | 'current' | 'next' | 'skipped' }[]
  visits: { date: string; status: string; technicianFirstName: string | null }[]
  photos: PortalFile[]
  documents: PortalFile[]
  messagesCount: number
  canMessage: boolean
}

export interface PortalMessage {
  id: string
  body: string
  createdAt: string
  fromCustomer: boolean
  mine: boolean
  authorName: string
  answeredAt: string | null
}

const unwrap = <T>(r: { data: any }): T => r.data?.data ?? r.data

// ---- auth
export const portalAuth = {
  requestLink: async (identifier: string) => unwrap<{ message: string }>(await portalClient.post('/portal/auth/request-link', { identifier })),
  exchange: async (token: string) => unwrap<PortalSession>(await portalClient.post('/portal/auth/exchange', { token })),
  setPassword: async (token: string, password: string) => unwrap<PortalSession>(await portalClient.post('/portal/auth/set-password', { token, password })),
  login: async (email: string, password: string) => unwrap<PortalSession>(await portalClient.post('/portal/auth/login', { email, password })),
  refresh: async () => unwrap<PortalSession>(await portalClient.post('/portal/auth/refresh', {})),
  logout: async () => unwrap<{ message: string }>(await portalClient.post('/portal/auth/logout', {})),
}

// ---- data
export const portalApi = {
  me: async () => unwrap<PortalMe>(await portalClient.get('/portal/me')),
  vehicles: async () => unwrap<PortalVehicle[]>(await portalClient.get('/portal/vehicles')),
  jobs: async (status: 'open' | 'closed' | 'all' = 'open'): Promise<PortalJobSummary[]> => {
    const d = unwrap<{ items: PortalJobSummary[] }>(await portalClient.get('/portal/jobs', { params: { status } }))
    return d.items ?? []
  },
  job: async (id: string) => unwrap<PortalJob>(await portalClient.get(`/portal/jobs/${id}`)),
  messages: async (jobId: string) => unwrap<{ canMessage: boolean; items: PortalMessage[] }>(await portalClient.get(`/portal/jobs/${jobId}/messages`)),
  postMessage: async (jobId: string, body: string) => unwrap<PortalMessage>(await portalClient.post(`/portal/jobs/${jobId}/messages`, { body })),
  attachmentUrl: async (id: string) => unwrap<{ url: string; fileName: string; fileType: string; expiresIn: number }>(await portalClient.get(`/portal/attachments/${id}/url`)),
}
