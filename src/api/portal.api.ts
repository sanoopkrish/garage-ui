import api from '@/api/client'
import type { PortalContactRole, PortalContactStatus } from '@/types/generated/enums/portal'

/**
 * Sprint 29 — office side of the customer portal: who may sign in for a customer,
 * their sessions, and the "share with customer" switch on job files.
 * (The portal app itself talks to /portal/* through src/portal/portal.client.ts.)
 */

export interface PortalContact {
  id: string
  customerId: string
  name: string
  email: string | null
  phone: string | null
  role: PortalContactRole
  isPrimary: boolean
  status: PortalContactStatus
  hasPassword: boolean
  invitedAt: string | null
  lastLoginAt: string | null
  activeSessions: number
  createdAt: string
}

export interface PortalContactsResponse {
  portalUrl: string
  portalEnabled: boolean
  items: PortalContact[]
}

export interface CreatePortalContactDto {
  name: string
  email?: string | null
  phone?: string | null
  role?: PortalContactRole
  isPrimary?: boolean
  invite?: boolean
}

export interface UpdatePortalContactDto {
  name?: string
  email?: string | null
  phone?: string | null
  role?: PortalContactRole
  isPrimary?: boolean
  status?: PortalContactStatus
}

export interface PortalSession {
  id: string
  createdAt: string
  lastSeenAt: string | null
  expiresAt: string
  userAgent: string | null
  ip: string | null
}

const unwrap = <T>(r: { data: any }): T => r.data?.data ?? r.data

export async function getPortalContacts(customerId: string): Promise<PortalContactsResponse> {
  return unwrap(await api.get(`/customers/${customerId}/portal-contacts`))
}

export async function createPortalContact(customerId: string, dto: CreatePortalContactDto): Promise<PortalContact> {
  return unwrap(await api.post(`/customers/${customerId}/portal-contacts`, dto))
}

export async function updatePortalContact(customerId: string, contactId: string, dto: UpdatePortalContactDto): Promise<PortalContact> {
  return unwrap(await api.patch(`/customers/${customerId}/portal-contacts/${contactId}`, dto))
}

export async function deletePortalContact(customerId: string, contactId: string): Promise<void> {
  await api.delete(`/customers/${customerId}/portal-contacts/${contactId}`)
}

export async function sendPortalLink(customerId: string, contactId: string): Promise<{ sent: boolean; channel: 'email' | 'sms'; expiresMinutes: number }> {
  return unwrap(await api.post(`/customers/${customerId}/portal-contacts/${contactId}/send-link`, {}))
}

export async function invitePortalContact(customerId: string, contactId: string): Promise<{ sent: boolean; expiresHours: number }> {
  return unwrap(await api.post(`/customers/${customerId}/portal-contacts/${contactId}/invite`, {}))
}

export async function getPortalSessions(customerId: string, contactId: string): Promise<PortalSession[]> {
  const data = unwrap<{ items: PortalSession[] }>(await api.get(`/customers/${customerId}/portal-contacts/${contactId}/sessions`))
  return data.items ?? []
}

export async function signOutPortalContactEverywhere(customerId: string, contactId: string): Promise<{ revoked: number }> {
  return unwrap(await api.post(`/customers/${customerId}/portal-contacts/${contactId}/sign-out-everywhere`, {}))
}
