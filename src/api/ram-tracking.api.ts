import api from '@/api/client'

/** RAM Tracking integration (Module 8) — everything proxied through the backend */

export interface RamStatus {
  configured: boolean
  mockMode: boolean
  connectionOk: boolean
  lastPullAt: string | null
  unmappedRegistrations: string[]
  fuelPricePerLitre: number | null
  defaultVehicleMpg: number | null
}

export interface RamConfig {
  hasCredentials: boolean
  clientIdMasked: string | null
  usernameMasked: string | null
  fuelPricePerLitre: number | null
  defaultVehicleMpg: number | null
  vehicleMap: Record<string, string>
  mockMode: boolean
}

export interface RamVehicle {
  id: number
  registration: string
  driverName: string | null
  makeModel: string | null
  odometer: number | null
  lat: number | null
  lng: number | null
  lastEventAt: string | null
  lastEvent: string | null
  mappedUserId: string | null
}

export interface LivePosition {
  registration: string
  makeModel: string | null
  lat: number
  lng: number
  lastEventAt: string | null
  lastEvent: string | null
  technicianId: string | null
  technicianName: string | null
}

export interface MileageRow {
  id: string
  vehicleRegistration: string
  technicianId: string | null
  technicianName: string | null
  periodStart: string
  periodEnd: string
  miles: number
  co2Kg: number | null
  idleMinutes: number | null
  source: string
}

export interface MileageSummary {
  totalMiles: number
  totalCo2Kg: number
  estFuelLitres: number
  estFuelCost: number
  mpgBasis: number
  fuelPricePerLitre: number
}

const unwrap = (r: any) => r.data?.data ?? r.data

export async function getRamStatus(): Promise<RamStatus> {
  return unwrap(await api.get('/integrations/ram-tracking/status'))
}

export async function getRamConfig(): Promise<RamConfig> {
  return unwrap(await api.get('/integrations/ram-tracking/config'))
}

export async function updateRamConfig(dto: {
  clientId?: string
  clientSecret?: string
  username?: string
  password?: string
  fuelPricePerLitre?: number
  defaultVehicleMpg?: number
  vehicleMap?: Record<string, string>
}): Promise<RamConfig> {
  return unwrap(await api.post('/integrations/ram-tracking/config', dto))
}

export async function getRamVehicles(): Promise<RamVehicle[]> {
  const data = unwrap(await api.get('/integrations/ram-tracking/vehicles'))
  return data.items ?? []
}

export async function getLivePositions(): Promise<LivePosition[]> {
  const data = unwrap(await api.get('/integrations/ram-tracking/live'))
  return data.items ?? []
}

export async function pullMileage(from?: string, to?: string): Promise<{
  vehicles: number
  inserted: number
  updated: number
  unmapped: string[]
}> {
  return unwrap(await api.post('/integrations/ram-tracking/pull', { from, to }))
}

export async function getMileage(params?: {
  technicianId?: string
  from?: string
  to?: string
}): Promise<{ items: MileageRow[]; summary: MileageSummary }> {
  return unwrap(await api.get('/integrations/ram-tracking/mileage', { params }))
}

export async function addManualMileage(dto: {
  technicianId: string
  vehicleRegistration: string
  periodStart: string
  periodEnd: string
  miles: number
}): Promise<MileageRow> {
  return unwrap(await api.post('/integrations/ram-tracking/mileage', dto))
}

export async function createLiveshare(vehicleRegistration: string, hoursValid?: number): Promise<{
  url: string
  expiresAt: string
}> {
  return unwrap(await api.post('/integrations/ram-tracking/liveshare', { vehicleRegistration, hoursValid }))
}
