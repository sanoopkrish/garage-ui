import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  getVehicles,
  getVehicle as getVehicleApi,
  getVehicleHistory as getVehicleHistoryApi,
  createVehicle as createVehicleApi,
  updateVehicle as updateVehicleApi,
  deleteVehicle as deleteVehicleApi,
  addVehicleMileage as addVehicleMileageApi,
} from '@/api/vehicles.api'
import type { Vehicle, CreateVehicleDto, UpdateVehicleDto, VehicleHistory } from '@/api/vehicles.api'
import type { FuelType } from '@/types/generated/enums/vehicle'

export const useVehiclesStore = defineStore('vehicles', () => {
  const vehicles = ref<Vehicle[]>([])
  const total = ref<number>(0)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

  async function fetchVehicles(params?: {
    search?: string
    customerId?: string
    fuelType?: FuelType
    page?: number
    pageSize?: number
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await getVehicles({
        ...params,
        page: params?.page ?? currentPage.value,
        pageSize: params?.pageSize ?? pageSize.value,
      })
      vehicles.value = response.items
      total.value = response.total
      if (params?.page !== undefined) {
        currentPage.value = params.page
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch vehicles'
    } finally {
      loading.value = false
    }
  }

  async function getVehicle(id: string): Promise<Vehicle> {
    error.value = null
    try {
      return await getVehicleApi(id)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch vehicle'
      throw err
    }
  }

  async function getVehicleHistory(id: string): Promise<VehicleHistory> {
    error.value = null
    try {
      return await getVehicleHistoryApi(id)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch vehicle history'
      throw err
    }
  }

  async function createVehicle(dto: CreateVehicleDto): Promise<Vehicle> {
    loading.value = true
    error.value = null
    try {
      const created = await createVehicleApi(dto)
      await fetchVehicles({ page: currentPage.value, pageSize: pageSize.value })
      return created
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to create vehicle'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateVehicle(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    loading.value = true
    error.value = null
    try {
      const updated = await updateVehicleApi(id, dto)
      const index = vehicles.value.findIndex((v) => v.id === id)
      if (index !== -1) {
        vehicles.value[index] = updated
      }
      return updated
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to update vehicle'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteVehicle(id: string) {
    loading.value = true
    error.value = null
    try {
      await deleteVehicleApi(id)
      vehicles.value = vehicles.value.filter((v) => v.id !== id)
      total.value = Math.max(0, total.value - 1)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to delete vehicle'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addMileage(id: string, mileage: number) {
    error.value = null
    try {
      await addVehicleMileageApi(id, mileage)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to record mileage'
      throw err
    }
  }

  return {
    vehicles,
    total,
    loading,
    error,
    currentPage,
    pageSize,
    totalPages,
    fetchVehicles,
    getVehicle,
    getVehicleHistory,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    addMileage,
  }
})
