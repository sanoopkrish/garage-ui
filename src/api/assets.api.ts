import api from '@/api/client'
import { AssetCategory, AssetCondition, AssetLocationType, AssetStatus } from '@/types/generated/enums/asset'

/** Asset register (Sprint 21) — mirrors the backend AssetViewDto */

export interface AssetDocument { id: string; fileName: string; fileType: string; fileSize: number; s3Key: string; category: string; uploadedAt: string }

export interface Asset {
  id: string
  assetTag: string
  name: string
  category: AssetCategory
  make: string | null
  model: string | null
  serialNumber: string | null
  purchaseDate: string | null
  purchaseCost: number | null
  supplierId: string | null
  supplierName: string | null
  purchaseOrderId: string | null
  purchaseOrderNumber: string | null
  warrantyExpiresAt: string | null
  usefulLifeYears: number | null
  bookValue: number | null
  calibrationIntervalMonths: number | null
  lastCalibratedAt: string | null
  nextCalibrationDue: string | null
  calibrationOverdue: boolean
  condition: AssetCondition
  status: AssetStatus
  disposedAt: string | null
  disposalNote: string | null
  locationType: AssetLocationType
  locationUserId: string | null
  locationId: string | null
  locationLabel: string
  locationChangedAt: string | null
  isTracked: boolean
  notes: string | null
  documents: AssetDocument[]
  createdAt: string
}

export interface AssetInput {
  name: string
  category: AssetCategory
  make?: string | null
  model?: string | null
  serialNumber?: string | null
  purchaseDate?: string | null
  purchaseCost?: number | null
  supplierId?: string | null
  purchaseOrderId?: string | null
  warrantyExpiresAt?: string | null
  usefulLifeYears?: number | null
  calibrationIntervalMonths?: number | null
  lastCalibratedAt?: string | null
  condition?: AssetCondition
  locationType: AssetLocationType
  locationUserId?: string
  locationId?: string
  notes?: string | null
}

export interface AssetArea { id: string; name: string; sortOrder: number; isActive: boolean; assetCount?: number }
export interface AssetSummary {
  items: number; active: number; inRepair: number; lost: number; disposed: number
  purchaseCost: number; bookValue: number; calibrationOverdue: number; calibrationDueSoon: number; warrantyExpiring: number
}
export interface LocateResult { kind: 'device' | 'staff' | 'workshop'; label: string; detail: string | null; lat: number | null; lng: number | null; at: string | null }
export interface AssetHistoryRow { at: string; by: string; to: string }
export interface AssetFindRow { id: string; assetTag: string; name: string; category: AssetCategory; status: AssetStatus; locationLabel: string }
export interface ImportResult { total: number; valid: number; created: number; rows: { line: number; name: string; errors: string[] }[] }

const unwrap = (response: any) => response.data?.data ?? response.data

export async function getAssets(params?: {
  search?: string; category?: AssetCategory; status?: AssetStatus; condition?: AssetCondition; locationType?: AssetLocationType
  locationUserId?: string; locationId?: string; calibrationDue?: string; warrantyDue?: boolean; includeDisposed?: boolean
  sortBy?: string; sortDir?: 'ASC' | 'DESC'; page?: number; pageSize?: number
}): Promise<{ items: Asset[]; total: number }> {
  const data = unwrap(await api.get('/assets', { params }))
  return { items: data.items ?? [], total: data.total ?? 0 }
}
export async function getAssetSummary(): Promise<AssetSummary> { return unwrap(await api.get('/assets/summary')) }
export async function findAssets(q: string): Promise<AssetFindRow[]> { return unwrap(await api.get('/assets/find', { params: { q } })).items ?? [] }
export async function getAssetStaff(): Promise<{ id: string; name: string }[]> { return unwrap(await api.get('/assets/staff')) }
export async function getAssetAreas(includeInactive = false): Promise<AssetArea[]> { return unwrap(await api.get('/assets/locations', { params: { includeInactive } })) }
export async function createAssetArea(name: string): Promise<AssetArea> { return unwrap(await api.post('/assets/locations', { name })) }
export async function updateAssetArea(id: string, input: { name?: string; isActive?: boolean; sortOrder?: number }): Promise<AssetArea> { return unwrap(await api.patch(`/assets/locations/${id}`, input)) }
export async function deleteAssetArea(id: string): Promise<void> { await api.delete(`/assets/locations/${id}`) }

export async function getAsset(id: string): Promise<Asset> { return unwrap(await api.get(`/assets/${id}`)) }
export async function locateAsset(id: string): Promise<LocateResult> { return unwrap(await api.get(`/assets/${id}/locate`)) }
export async function getAssetHistory(id: string): Promise<AssetHistoryRow[]> { return unwrap(await api.get(`/assets/${id}/history`)).items ?? [] }
export async function createAsset(input: AssetInput): Promise<Asset> { return unwrap(await api.post('/assets', input)) }
export async function updateAsset(id: string, input: Partial<AssetInput>): Promise<Asset> { return unwrap(await api.patch(`/assets/${id}`, input)) }
export async function deleteAsset(id: string): Promise<void> { await api.delete(`/assets/${id}`) }
export async function moveAsset(id: string, input: { locationType: AssetLocationType; locationUserId?: string; locationId?: string }): Promise<Asset> { return unwrap(await api.post(`/assets/${id}/move`, input)) }
export async function markAssetCalibrated(id: string, input: { date?: string; s3Key?: string }): Promise<Asset> { return unwrap(await api.post(`/assets/${id}/calibrated`, input)) }
export async function attachAssetDocument(id: string, input: { s3Key: string; category: 'asset_photo' | 'asset_document'; caption?: string }): Promise<Asset> { return unwrap(await api.post(`/assets/${id}/documents`, input)) }
export async function setAssetStatus(id: string, status: AssetStatus): Promise<Asset> { return unwrap(await api.post(`/assets/${id}/status`, { status })) }
export async function setAssetCondition(id: string, condition: AssetCondition): Promise<Asset> { return unwrap(await api.post(`/assets/${id}/condition`, { condition })) }
export async function assetAction(id: string, action: 'lost' | 'found'): Promise<Asset> { return unwrap(await api.post(`/assets/${id}/${action}`)) }
export async function disposeAsset(id: string, note: string, date?: string): Promise<Asset> { return unwrap(await api.post(`/assets/${id}/dispose`, { note, date })) }
export async function importAssets(csv: string, dryRun: boolean): Promise<ImportResult> { return unwrap(await api.post('/assets/import', { csv, dryRun })) }
export async function runAssetChecks(): Promise<{ calibrationReminders: number; warrantyReminders: number }> { return unwrap(await api.post('/assets/run-checks')) }

export async function downloadAssetLabel(asset: { id: string; assetTag: string }): Promise<void> {
  const response = await api.get(`/assets/${asset.id}/label`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `${asset.assetTag}-label.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
