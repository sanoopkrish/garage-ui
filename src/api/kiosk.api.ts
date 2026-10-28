// Kiosk clocking (Sprint 18) — ported from cms-ui `api/kiosk.api.ts`.
// The tablet is NOT logged in, so the public kiosk calls use their own axios instance:
// no auth store, no refresh-on-401. PIN management (logged-in) goes through the normal client.
import axios from 'axios'
import apiClient from '@/api/client'
import { useTenant } from '@/composables/useTenant'

const CONFIGURED_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api/v1'
const BASE_URL = import.meta.env.DEV ? '/api/v1' : CONFIGURED_URL

const kioskAxios = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json', Accept: 'application/json' } })

function tenantHeaders(): Record<string, string> {
  const { extractSubdomain } = useTenant()
  const subdomain = extractSubdomain() || import.meta.env.VITE_TENANT_SUBDOMAIN || 'demo'
  return { 'X-Tenant-Subdomain': subdomain, 'X-Original-Host': `${subdomain}.${window.location.hostname}` }
}

const unwrap = (r: any) => r.data?.data ?? r.data

// ---- device lock (master PIN) ----
// A manager unlocks each tablet once with the master PIN; the device token is kept on the device
// (localStorage, so a restart does not need a manager) and sent on every kiosk call.
const DEVICE_KEY = 'cruise.kioskDevice'
export const getKioskDeviceToken = (): string | null => localStorage.getItem(DEVICE_KEY)
export const lockThisKiosk = (): void => localStorage.removeItem(DEVICE_KEY)
/** True when the API says this device is no longer unlocked (master PIN changed / "lock all kiosks") */
export const isKioskLockedError = (err: any): boolean => err?.response?.data?.code === 'KIOSK_LOCKED'

function deviceHeaders(): Record<string, string> {
  const token = getKioskDeviceToken()
  return { ...tenantHeaders(), ...(token ? { 'X-Kiosk-Device': token } : {}) }
}

export interface KioskStatus { enabled: boolean; hasMasterPin: boolean; companyName: string }
export interface KioskPinLogin {
  token: string
  user: { id: string; firstName: string; lastName: string }
  action: 'clock-in' | 'clock-out'
  clockedInSince: string | null
}
export interface KioskOnSite { firstName: string; lastInitial: string; clockInTime: string }
export interface KioskClockOutResult { clockInAt: string; clockOutAt: string; workedMinutes: number; breakMinutes: number; stoppedTimers: string[] }
export interface KioskStaffPin { userId: string; name: string; email: string; hasPin: boolean }

// ---- public (tablet) ----
export async function getKioskStatus(): Promise<KioskStatus> {
  return unwrap(await kioskAxios.get('/kiosk/status', { headers: tenantHeaders() }))
}
/** Master PIN → unlocks this device (stores the device token) */
export async function unlockKiosk(masterPin: string): Promise<void> {
  const data = unwrap(await kioskAxios.post('/kiosk/auth/master-pin', { pin: masterPin }, { headers: tenantHeaders() }))
  localStorage.setItem(DEVICE_KEY, data.deviceToken)
}
export async function kioskPinLogin(pin: string): Promise<KioskPinLogin> {
  return unwrap(await kioskAxios.post('/kiosk/auth/pin', { pin }, { headers: deviceHeaders() }))
}
export async function getKioskWhosOnSite(): Promise<KioskOnSite[]> {
  return unwrap(await kioskAxios.get('/kiosk/whos-on-site', { headers: deviceHeaders() }))
}
export async function kioskClockIn(token: string): Promise<{ clockInAt: string; flags: string[] }> {
  return unwrap(await kioskAxios.post('/kiosk/clock-in', {}, { headers: { ...deviceHeaders(), Authorization: `Bearer ${token}` } }))
}
export async function kioskClockOut(token: string): Promise<KioskClockOutResult> {
  return unwrap(await kioskAxios.post('/kiosk/clock-out', {}, { headers: { ...deviceHeaders(), Authorization: `Bearer ${token}` } }))
}

// ---- PIN management (logged in) ----
export async function getMyKioskPin(): Promise<{ hasPin: boolean; kioskEnabled: boolean }> {
  return unwrap(await apiClient.get('/kiosk/pin'))
}
export async function setMyKioskPin(pin: string): Promise<void> {
  await apiClient.post('/kiosk/set-pin', { pin })
}
export async function getKioskStaff(): Promise<KioskStaffPin[]> {
  return unwrap(await apiClient.get('/kiosk/staff')).items ?? []
}
export async function setStaffKioskPin(userId: string, pin: string): Promise<void> {
  await apiClient.post(`/kiosk/set-pin/${userId}`, { pin })
}
export async function clearStaffKioskPin(userId: string): Promise<void> {
  await apiClient.delete(`/kiosk/pin/${userId}`)
}

// ---- master PIN management (logged in, settings) ----
export async function getKioskAdminStatus(): Promise<{ kioskEnabled: boolean; hasMasterPin: boolean }> {
  return unwrap(await apiClient.get('/kiosk/admin-status'))
}
export async function setKioskMasterPin(pin: string): Promise<void> {
  await apiClient.post('/kiosk/set-master-pin', { pin })
}
export async function lockAllKiosks(): Promise<void> {
  await apiClient.post('/kiosk/lock-devices')
}
