<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { Plus, Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useVehiclesStore } from '@/stores/vehicles.store'
import { getCustomers } from '@/api/customers.api'
import { lookupVehicleByRegistration } from '@/api/vehicles.api'
import { useCrudPermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { FuelType } from '@/types/generated/enums/vehicle'
import type { Vehicle, CreateVehicleDto } from '@/api/vehicles.api'
import { showConfirmDialog } from '@/utils/alert'

const vehiclesStore = useVehiclesStore()
const { canCreate, canUpdate, canDelete } = useCrudPermissions('crm', 'vehicles')

const fuelLabels: Record<FuelType, string> = {
  [FuelType.PETROL]: 'Petrol',
  [FuelType.DIESEL]: 'Diesel',
  [FuelType.HYBRID]: 'Hybrid',
  [FuelType.PLUGIN_HYBRID]: 'Plug-in Hybrid',
  [FuelType.ELECTRIC]: 'Electric',
  [FuelType.OTHER]: 'Other',
}

const fuelBadge: Record<FuelType, string> = {
  [FuelType.PETROL]: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  [FuelType.DIESEL]: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  [FuelType.HYBRID]: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
  [FuelType.PLUGIN_HYBRID]: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  [FuelType.ELECTRIC]: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
  [FuelType.OTHER]: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
}

const fuelOptions = Object.values(FuelType).map((f) => ({ value: f, label: fuelLabels[f] }))

// ── Search ────────────────────────────────────────────────────────────────────
const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearch(val: string) {
  searchQuery.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    vehiclesStore.fetchVehicles({ search: val || undefined, page: 1 })
  }, 350)
}

function goToPage(page: number) {
  if (page < 1 || page > vehiclesStore.totalPages) return
  vehiclesStore.fetchVehicles({ search: searchQuery.value || undefined, page })
}

// ── Customer options (for the add/edit modal) ─────────────────────────────────
const customerOptions = ref<{ value: string; label: string }[]>([])

async function loadCustomerOptions() {
  try {
    const response = await getCustomers({ pageSize: 100 })
    customerOptions.value = response.items.map((c) => ({
      value: c.id,
      label: c.businessName ? `${c.businessName} (${c.name})` : c.name,
    }))
  } catch {
    ToastService.error('Failed to load customers')
  }
}

// ── Create / edit modal ───────────────────────────────────────────────────────
const showModal = ref(false)
const submitting = ref(false)
const editingId = ref<string | null>(null)
const lookingUp = ref(false)

const form = reactive({
  customerId: '',
  registration: '',
  vin: '',
  make: '',
  model: '',
  year: '',
  colour: '',
  fuelType: '' as '' | FuelType,
  motExpiryDate: '',
  currentMileage: '',
})

const formErrors = reactive({ customerId: '', registration: '' })

function resetForm() {
  form.customerId = ''
  form.registration = ''
  form.vin = ''
  form.make = ''
  form.model = ''
  form.year = ''
  form.colour = ''
  form.fuelType = ''
  form.motExpiryDate = ''
  form.currentMileage = ''
  formErrors.customerId = ''
  formErrors.registration = ''
}

function openCreateModal() {
  resetForm()
  editingId.value = null
  showModal.value = true
  if (customerOptions.value.length === 0) loadCustomerOptions()
}

function openEditModal(vehicle: Vehicle) {
  resetForm()
  editingId.value = vehicle.id
  form.customerId = vehicle.customerId
  form.registration = vehicle.registration
  form.vin = vehicle.vin ?? ''
  form.make = vehicle.make ?? ''
  form.model = vehicle.model ?? ''
  form.year = vehicle.year != null ? String(vehicle.year) : ''
  form.colour = vehicle.colour ?? ''
  form.fuelType = vehicle.fuelType ?? ''
  form.motExpiryDate = vehicle.motExpiryDate ?? ''
  showModal.value = true
  if (customerOptions.value.length === 0) loadCustomerOptions()
}

/** DVSA MOT History lookup — prefills make/model/year/fuel/colour/MOT expiry */
async function lookupRegistration() {
  if (!form.registration.trim()) {
    ToastService.warning('Enter a registration first')
    return
  }
  lookingUp.value = true
  try {
    const result = await lookupVehicleByRegistration(form.registration.trim())
    if (result.make) form.make = form.make || result.make
    if (result.model) form.model = form.model || result.model
    if (result.year) form.year = form.year || String(result.year)
    if (result.colour) form.colour = form.colour || result.colour
    if (result.motExpiryDate) form.motExpiryDate = form.motExpiryDate || result.motExpiryDate
    if (result.lastMotMileage) form.currentMileage = form.currentMileage || String(result.lastMotMileage)
    if (result.fuelType) {
      const fuel = result.fuelType.toLowerCase()
      if (fuel.includes('petrol')) form.fuelType = form.fuelType || FuelType.PETROL
      else if (fuel.includes('diesel')) form.fuelType = form.fuelType || FuelType.DIESEL
      else if (fuel.includes('hybrid')) form.fuelType = form.fuelType || FuelType.HYBRID
      else if (fuel.includes('electric')) form.fuelType = form.fuelType || FuelType.ELECTRIC
    }
    ToastService.success(`Found ${result.make ?? ''} ${result.model ?? ''} — details filled in`)
  } catch (err: any) {
    const message = err?.response?.data?.message ?? 'Lookup failed — enter details manually'
    ToastService.info(Array.isArray(message) ? message.join('; ') : message)
  } finally {
    lookingUp.value = false
  }
}

function buildDto(): CreateVehicleDto {
  return {
    customerId: form.customerId,
    registration: form.registration.trim(),
    vin: form.vin.trim() || undefined,
    make: form.make.trim() || undefined,
    model: form.model.trim() || undefined,
    year: form.year !== '' ? Number(form.year) : undefined,
    colour: form.colour.trim() || undefined,
    fuelType: form.fuelType || undefined,
    motExpiryDate: form.motExpiryDate || undefined,
    currentMileage: form.currentMileage !== '' ? Number(form.currentMileage) : undefined,
  }
}

async function submitForm() {
  formErrors.customerId = form.customerId ? '' : 'Customer is required'
  formErrors.registration = form.registration.trim() ? '' : 'Registration is required'
  if (formErrors.customerId || formErrors.registration) return

  submitting.value = true
  try {
    if (editingId.value) {
      await vehiclesStore.updateVehicle(editingId.value, buildDto())
      ToastService.success('Vehicle updated')
    } else {
      await vehiclesStore.createVehicle(buildDto())
      ToastService.success('Vehicle added')
    }
    showModal.value = false
  } catch (err: any) {
    const message = err?.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? vehiclesStore.error ?? 'Something went wrong'))
  } finally {
    submitting.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function handleDelete(vehicle: Vehicle) {
  const result = await showConfirmDialog(`Delete vehicle "${vehicle.registration}"?`, false, 'Delete')
  if (!result.isConfirmed) return
  try {
    await vehiclesStore.deleteVehicle(vehicle.id)
    ToastService.success('Vehicle deleted')
  } catch {
    ToastService.error(vehiclesStore.error ?? 'Failed to delete vehicle')
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function vehicleLabel(v: Vehicle): string {
  return [v.year, v.make, v.model].filter(Boolean).join(' ') || '—'
}

function formatMileage(mileage?: number | null): string {
  return mileage != null ? `${mileage.toLocaleString('en-GB')} mi` : '—'
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

onMounted(() => {
  vehiclesStore.fetchVehicles({ page: 1 })
})
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Vehicles" subtitle="All registered vehicles in the system.">
      <UiButton v-if="canCreate" @click="openCreateModal"><Plus class="w-4 h-4" /> Add Vehicle</UiButton>
    </UiPageHeader>

    <div class="flex items-center gap-3 mb-5">
      <UiSearchInput
        :modelValue="searchQuery"
        placeholder="Search reg, make, model, VIN, owner..."
        @update:modelValue="onSearch"
      />
      <span class="text-sm text-slate-400 ml-auto">{{ vehiclesStore.total }} vehicles</span>
    </div>

    <UiTable :headers="['Reg', 'Owner', 'Vehicle', 'Mileage', 'Fuel', 'MOT Expiry', '']">
      <!-- Loading skeleton -->
      <template v-if="vehiclesStore.loading && vehiclesStore.vehicles.length === 0">
        <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in 7" :key="col" class="px-4 py-3.5">
            <div class="h-3.5 w-24 bg-slate-200 dark:bg-white/10 rounded" />
          </td>
        </tr>
      </template>

      <!-- Empty state -->
      <template v-else-if="!vehiclesStore.loading && vehiclesStore.vehicles.length === 0">
        <tr>
          <td colspan="7" class="px-4 py-10 text-center text-sm text-slate-400">No vehicles found.</td>
        </tr>
      </template>

      <tr
        v-else
        v-for="v in vehiclesStore.vehicles"
        :key="v.id"
        class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
      >
        <td class="px-4 py-3.5 font-mono font-semibold text-slate-700 dark:text-slate-200 tracking-wide">{{ v.registration }}</td>
        <td class="px-4 py-3.5 text-slate-700 dark:text-slate-200 font-medium">{{ v.customerName ?? '—' }}</td>
        <td class="px-4 py-3.5">
          <p class="font-medium text-slate-700 dark:text-slate-200">{{ vehicleLabel(v) }}</p>
          <p v-if="v.colour" class="text-xs text-slate-400">{{ v.colour }}</p>
        </td>
        <td class="px-4 py-3.5 text-slate-500 dark:text-slate-400">{{ formatMileage(v.latestMileage) }}</td>
        <td class="px-4 py-3.5">
          <span v-if="v.fuelType" :class="['text-xs px-2 py-0.5 rounded-full font-medium', fuelBadge[v.fuelType]]">{{ fuelLabels[v.fuelType] }}</span>
          <span v-else class="text-sm text-slate-400">—</span>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-400">{{ formatDate(v.motExpiryDate) }}</td>
        <td class="px-4 py-3.5">
          <div class="flex items-center gap-1">
            <router-link :to="`/vehicles/${v.id}`" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors" title="View">
              <Eye class="w-4 h-4" />
            </router-link>
            <button v-if="canUpdate" @click="openEditModal(v)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors" title="Edit">
              <Pencil class="w-4 h-4" />
            </button>
            <button v-if="canDelete" @click="handleDelete(v)" class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    </UiTable>

    <!-- Pagination -->
    <div v-if="vehiclesStore.totalPages > 1" class="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
      <span>Page {{ vehiclesStore.currentPage }} of {{ vehiclesStore.totalPages }}</span>
      <button
        :disabled="vehiclesStore.currentPage <= 1"
        @click="goToPage(vehiclesStore.currentPage - 1)"
        class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
      <button
        :disabled="vehiclesStore.currentPage >= vehiclesStore.totalPages"
        @click="goToPage(vehiclesStore.currentPage + 1)"
        class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>

    <!-- Create / Edit Modal -->
    <UiModal :open="showModal" :title="editingId ? 'Edit Vehicle' : 'Add Vehicle'" @close="showModal = false">
      <form @submit.prevent="submitForm" class="flex flex-col gap-4">
        <UiSelect
          v-model="form.customerId"
          label="Owner (Customer)"
          :options="customerOptions"
          required
          :error="formErrors.customerId"
        />
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <UiInput v-model="form.registration" label="Registration" placeholder="AB24 XYZ" required :error="formErrors.registration" />
          </div>
          <UiButton variant="secondary" :loading="lookingUp" @click="lookupRegistration" title="Auto-fill from DVLA (coming in Phase 3)">
            <Search class="w-4 h-4" /> Lookup
          </UiButton>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="form.make" label="Make" placeholder="e.g. BMW" />
          <UiInput v-model="form.model" label="Model" placeholder="e.g. 3 Series" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="form.year" label="Year" type="number" placeholder="2024" />
          <UiInput v-model="form.colour" label="Colour" placeholder="e.g. Black" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <UiSelect v-model="form.fuelType" label="Fuel Type" :options="fuelOptions" />
          <UiInput v-model="form.vin" label="VIN" placeholder="Optional" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="form.motExpiryDate" label="MOT Expiry" type="date" />
          <UiInput v-model="form.currentMileage" label="Current Mileage" type="number" placeholder="42000" />
        </div>
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="showModal = false">Cancel</UiButton>
        <UiButton :loading="submitting" @click="submitForm">{{ editingId ? 'Save Changes' : 'Add Vehicle' }}</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
