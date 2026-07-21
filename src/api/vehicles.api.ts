import api from '@/api/client'
import { FuelType } from '@/types/generated/enums/vehicle'

export interface Vehicle {
  id: string
  registration: string
  vin?: string
  make?: string
  model?: string
  year?: number
  colour?: string
  fuelType?: FuelType
  motExpiryDate?: string
  customerId: string
  customerName?: string
  latestMileage?: number | null
  createdAt: string
}

export interface CreateVehicleDto {
  customerId: string
  registration: string
  vin?: string
  make?: string
  model?: string
  year?: number
  colour?: string
  fuelType?: FuelType
  motExpiryDate?: string
  currentMileage?: number
}

export type UpdateVehicleDto = Partial<CreateVehicleDto>

export interface MileageLogEntry {
  id: string
  mileage: number
  recordedAt: string
  jobId: string | null
}

export interface VehicleHistory {
  vehicleId: string
  registration: string
  mileageLogs: MileageLogEntry[]
  jobs: unknown[]
  note?: string
}

export interface PaginatedVehicles {
  items: Vehicle[]
  total: number
}

export async function getVehicles(params?: {
  search?: string
  customerId?: string
  fuelType?: FuelType
  page?: number
  pageSize?: number
}): Promise<PaginatedVehicles> {
  const response = await api.get('/vehicles', { params })
  const data = response.data?.data ?? response.data
  return { items: data.items ?? [], total: data.total ?? 0 }
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const response = await api.get(`/vehicles/${id}`)
  return response.data?.data ?? response.data
}

export async function getVehicleHistory(id: string): Promise<VehicleHistory> {
  const response = await api.get(`/vehicles/${id}/history`)
  return response.data?.data ?? response.data
}

export async function createVehicle(dto: CreateVehicleDto): Promise<Vehicle> {
  const response = await api.post('/vehicles', dto)
  return response.data?.data ?? response.data
}

export async function updateVehicle(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
  const response = await api.patch(`/vehicles/${id}`, dto)
  return response.data?.data ?? response.data
}

export async function deleteVehicle(id: string): Promise<void> {
  await api.delete(`/vehicles/${id}`)
}

export async function addVehicleMileage(id: string, mileage: number): Promise<MileageLogEntry> {
  const response = await api.post(`/vehicles/${id}/mileage`, { mileage })
  return response.data?.data ?? response.data
}

export interface VehicleLookupResult {
  registration: string
  make: string | null
  model: string | null
  year: number | null
  fuelType: string | null
  colour: string | null
  engineSize: string | null
  motExpiryDate: string | null
  lastMotMileage: number | null
  motTests: {
    completedDate: string
    testResult: string
    expiryDate: string | null
    odometerValue: number | null
    odometerUnit: string | null
    defects: { text: string; type: string; dangerous: boolean }[]
  }[]
}

/** DVSA MOT History lookup — prefills the vehicle form and shows MOT history */
export async function lookupVehicleByRegistration(registration: string): Promise<VehicleLookupResult> {
  const response = await api.post(`/vehicles/lookup/${encodeURIComponent(registration)}`)
  return response.data?.data ?? response.data
}
