<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import { ArrowLeft, Wrench, Gauge, Plus } from 'lucide-vue-next'
import VehicleMotCard from '@/components/Vehicles/VehicleMotCard.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { useVehiclesStore } from '@/stores/vehicles.store'
import { useCrudPermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { FuelType } from '@/types/generated/enums/vehicle'
import type { JobStatus } from '@/types/generated/enums/job'
import { jobStatusLabels, jobStatusBadgeVariant } from '@/utils/jobStatus'
import type { Vehicle, VehicleHistory } from '@/api/vehicles.api'

interface HistoryJob {
  id: string
  jobNumber: string
  description: string
  status: JobStatus
  customerName: string | null
  createdAt: string
  completedAt: string | null
}

const route = useRoute()
const router = useRouter()
const vehiclesStore = useVehiclesStore()
const { canUpdate } = useCrudPermissions('crm', 'vehicles')

const vehicle = ref<Vehicle | null>(null)
const history = ref<VehicleHistory | null>(null)
const loading = ref(true)

const newMileage = ref('')
const savingMileage = ref(false)

const fuelLabels: Record<FuelType, string> = {
  [FuelType.PETROL]: 'Petrol',
  [FuelType.DIESEL]: 'Diesel',
  [FuelType.HYBRID]: 'Hybrid',
  [FuelType.PLUGIN_HYBRID]: 'Plug-in Hybrid',
  [FuelType.ELECTRIC]: 'Electric',
  [FuelType.OTHER]: 'Other',
}

const title = computed(() => {
  if (!vehicle.value) return ''
  return [vehicle.value.year, vehicle.value.make, vehicle.value.model].filter(Boolean).join(' ') || vehicle.value.registration
})

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatMileage(mileage?: number | null): string {
  return mileage != null ? `${mileage.toLocaleString('en-GB')} mi` : '—'
}

async function load() {
  const id = route.params.id as string
  try {
    vehicle.value = await vehiclesStore.getVehicle(id)
    history.value = await vehiclesStore.getVehicleHistory(id)
  } catch {
    ToastService.error('Failed to load vehicle')
    router.push('/vehicles')
  } finally {
    loading.value = false
  }
}

async function submitMileage() {
  if (!vehicle.value || newMileage.value === '') return
  savingMileage.value = true
  try {
    await vehiclesStore.addMileage(vehicle.value.id, Number(newMileage.value))
    ToastService.success('Mileage recorded')
    newMileage.value = ''
    await load()
  } catch {
    ToastService.error(vehiclesStore.error ?? 'Failed to record mileage')
  } finally {
    savingMileage.value = false
  }
}

onMounted(load)
</script>

<template>
  <DefaultLayout>
    <div class="flex items-center justify-between mb-6">
      <button @click="router.back()" class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft class="w-4 h-4" /> Back to Vehicles
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 xl:grid-cols-3 gap-5 animate-pulse">
      <div class="card h-48 bg-slate-100 dark:bg-white/5" />
      <div class="xl:col-span-2 card h-48 bg-slate-100 dark:bg-white/5" />
    </div>

    <div v-else-if="vehicle" class="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div class="space-y-5">
        <!-- Vehicle info -->
        <div class="card">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center text-3xl">🚗</div>
            <div>
              <h1 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ title }}</h1>
              <p class="font-mono font-semibold text-brand-600 tracking-widest text-sm">{{ vehicle.registration }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div><p class="text-slate-400 text-xs">Colour</p><p class="font-medium text-slate-700 dark:text-slate-200">{{ vehicle.colour || '—' }}</p></div>
            <div><p class="text-slate-400 text-xs">Fuel</p><p class="font-medium text-slate-700 dark:text-slate-200">{{ vehicle.fuelType ? fuelLabels[vehicle.fuelType] : '—' }}</p></div>
            <div><p class="text-slate-400 text-xs">Mileage</p><p class="font-medium text-slate-700 dark:text-slate-200">{{ formatMileage(vehicle.latestMileage) }}</p></div>
            <div><p class="text-slate-400 text-xs">MOT Expiry</p><p class="font-medium text-amber-600">{{ formatDate(vehicle.motExpiryDate) }}</p></div>
            <div class="col-span-2"><p class="text-slate-400 text-xs">VIN</p><p class="font-mono text-xs text-slate-600 dark:text-slate-300">{{ vehicle.vin || '—' }}</p></div>
          </div>
        </div>

        <!-- MOT history (DVSA) -->
        <VehicleMotCard v-if="vehicle.registration" :registration="vehicle.registration" />

        <!-- Owner -->
        <div class="card">
          <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Owner</h2>
          <router-link :to="`/customers/${vehicle.customerId}`" class="text-brand-600 hover:underline font-medium text-sm">
            {{ vehicle.customerName ?? 'View customer' }}
          </router-link>
        </div>

        <!-- Mileage log -->
        <div class="card">
          <div class="flex items-center gap-2 mb-3">
            <Gauge class="w-4 h-4 text-brand-500" />
            <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Mileage Log</h2>
          </div>
          <form v-if="canUpdate" @submit.prevent="submitMileage" class="flex items-end gap-2 mb-4">
            <div class="flex-1">
              <UiInput v-model="newMileage" label="New reading" type="number" placeholder="42000" />
            </div>
            <UiButton :loading="savingMileage" @click="submitMileage"><Plus class="w-4 h-4" /> Add</UiButton>
          </form>
          <p v-if="!history || history.mileageLogs.length === 0" class="text-sm text-slate-400">No mileage recorded yet.</p>
          <div v-else class="space-y-2 max-h-56 overflow-y-auto">
            <div
              v-for="log in history.mileageLogs"
              :key="log.id"
              class="flex justify-between text-sm py-1.5 border-b border-slate-50 dark:border-dark-border last:border-0"
            >
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ formatMileage(log.mileage) }}</span>
              <span class="text-slate-400">{{ formatDate(log.recordedAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Service history -->
      <div class="xl:col-span-2 card">
        <div class="flex items-center gap-2 mb-4">
          <Wrench class="w-4 h-4 text-brand-500" />
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Service History ({{ (history?.jobs as HistoryJob[] | undefined)?.length ?? 0 }})</h2>
        </div>
        <div v-if="!(history?.jobs as HistoryJob[] | undefined)?.length" class="py-14 text-center">
          <Wrench class="w-8 h-8 text-slate-200 dark:text-slate-600 mx-auto mb-3" />
          <p class="text-sm text-slate-400">No jobs recorded for {{ vehicle.registration }} yet.</p>
        </div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 dark:border-dark-border">
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Job</th>
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Description</th>
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Customer</th>
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
              <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
            <tr v-for="j in (history!.jobs as HistoryJob[])" :key="j.id" class="hover:bg-slate-50 dark:hover:bg-white/5">
              <td class="py-3">
                <router-link :to="`/jobs/${j.id}`" class="font-semibold text-brand-600 hover:underline">{{ j.jobNumber }}</router-link>
              </td>
              <td class="py-3 text-slate-700 dark:text-slate-200 max-w-[220px] truncate">{{ j.description }}</td>
              <td class="py-3 text-slate-500 dark:text-slate-400">{{ j.customerName ?? '—' }}</td>
              <td class="py-3">
                <UiBadge :variant="(jobStatusBadgeVariant[j.status] as any)" dot>{{ jobStatusLabels[j.status] }}</UiBadge>
              </td>
              <td class="py-3 text-right text-slate-400">{{ formatDate(j.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </DefaultLayout>
</template>
