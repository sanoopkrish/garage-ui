<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { Satellite, RefreshCw, Download } from 'lucide-vue-next'
import {
  getRamStatus, getRamConfig, updateRamConfig, getRamVehicles, pullMileage,
  type RamStatus, type RamConfig, type RamVehicle,
} from '@/api/ram-tracking.api'
import { getUsers, type User } from '@/api/users.api'
import { ToastService } from '@/services/toast.service'
import { usePermissions } from '@/composables/usePermissions'

const { hasPermission: canManage } = usePermissions('menus.administration.settings.integrations.update')

const status = ref<RamStatus | null>(null)
const config = ref<RamConfig | null>(null)
const vehicles = ref<RamVehicle[]>([])
const technicians = ref<User[]>([])
const loading = ref(true)
const saving = ref(false)
const pulling = ref(false)

const credForm = ref({ clientId: '', clientSecret: '', username: '', password: '' })
const fuelForm = ref<{ fuelPricePerLitre: string; defaultVehicleMpg: string }>({
  fuelPricePerLitre: '',
  defaultVehicleMpg: '',
})
/** registration → userId, edited via the mapping table */
const mapping = ref<Record<string, string>>({})

const techOptions = computed(() => [
  { value: '', label: '— not mapped —' },
  ...technicians.value.map((t) => ({
    value: t.id,
    label: `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || t.email,
  })),
])

/** Pre-suggest a technician whose name matches RAM's driver name */
function suggestFor(vehicle: RamVehicle): string {
  if (!vehicle.driverName) return ''
  const wanted = vehicle.driverName.trim().toLowerCase()
  const match = technicians.value.find(
    (t) => `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim().toLowerCase() === wanted,
  )
  return match?.id ?? ''
}

async function load() {
  loading.value = true
  try {
    const [s, c, users] = await Promise.all([
      getRamStatus(),
      getRamConfig(),
      getUsers({ role: 'Technician,Field Engineer', pageSize: 100 }),
    ])
    status.value = s
    config.value = c
    technicians.value = users.items
    fuelForm.value = {
      fuelPricePerLitre: c.fuelPricePerLitre != null ? String(c.fuelPricePerLitre) : '',
      defaultVehicleMpg: c.defaultVehicleMpg != null ? String(c.defaultVehicleMpg) : '',
    }
    mapping.value = { ...c.vehicleMap }

    if (s.configured || s.mockMode) {
      vehicles.value = await getRamVehicles()
      // pre-suggest for unmapped vehicles by driver-name match
      for (const v of vehicles.value) {
        if (!mapping.value[v.registration]) {
          const suggestion = suggestFor(v)
          if (suggestion) mapping.value[v.registration] = suggestion
        }
      }
    }
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to load RAM Tracking settings')
  } finally {
    loading.value = false
  }
}

async function saveCredentials() {
  saving.value = true
  try {
    config.value = await updateRamConfig({
      ...(credForm.value.clientId ? { clientId: credForm.value.clientId } : {}),
      ...(credForm.value.clientSecret ? { clientSecret: credForm.value.clientSecret } : {}),
      ...(credForm.value.username ? { username: credForm.value.username } : {}),
      ...(credForm.value.password ? { password: credForm.value.password } : {}),
    })
    credForm.value = { clientId: '', clientSecret: '', username: '', password: '' }
    status.value = await getRamStatus()
    ToastService.success(status.value.connectionOk ? 'Saved — connection OK' : 'Saved — connection failed, check the credentials')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to save credentials')
  } finally {
    saving.value = false
  }
}

async function saveFuelAndMapping() {
  saving.value = true
  try {
    const cleanMap = Object.fromEntries(Object.entries(mapping.value).filter(([, v]) => v))
    config.value = await updateRamConfig({
      ...(fuelForm.value.fuelPricePerLitre !== '' ? { fuelPricePerLitre: Number(fuelForm.value.fuelPricePerLitre) } : {}),
      ...(fuelForm.value.defaultVehicleMpg !== '' ? { defaultVehicleMpg: Number(fuelForm.value.defaultVehicleMpg) } : {}),
      vehicleMap: cleanMap,
    })
    ToastService.success('RAM Tracking settings saved')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to save settings')
  } finally {
    saving.value = false
  }
}

async function runPull() {
  pulling.value = true
  try {
    const result = await pullMileage()
    ToastService.success(`Pulled last week: ${result.inserted} new, ${result.updated} updated${result.unmapped.length ? ` — unmapped: ${result.unmapped.join(', ')}` : ''}`)
    status.value = await getRamStatus()
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Pull failed')
  } finally {
    pulling.value = false
  }
}

function formatDate(d: string | null): string {
  return d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- Status -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <Satellite class="w-5 h-5 text-brand-500" /> RAM Tracking
        </h3>
        <div class="flex items-center gap-2">
          <UiBadge v-if="status?.mockMode" variant="pending" dot>Mock data</UiBadge>
          <UiBadge v-else-if="status?.configured && status?.connectionOk" variant="done" dot>Connected</UiBadge>
          <UiBadge v-else-if="status?.configured" variant="cancelled" dot>Connection failed</UiBadge>
          <UiBadge v-else variant="open" dot>Not configured</UiBadge>
        </div>
      </div>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        Fleet mileage, live van locations and customer tracking links from the workshop's RAM Tracking account.
        Mileage is pulled automatically every Monday morning.
        <template v-if="status?.mockMode"> Currently running on <strong>demo data</strong> — paste the real API credentials below when the client provides them.</template>
      </p>
      <div class="flex flex-wrap gap-6 mt-3 text-sm text-slate-600 dark:text-slate-300">
        <span>Last pull: <strong>{{ formatDate(status?.lastPullAt ?? null) }}</strong></span>
        <span v-if="status?.unmappedRegistrations?.length" class="text-amber-600">
          Unmapped vans: {{ status.unmappedRegistrations.join(', ') }}
        </span>
      </div>
    </div>

    <!-- Credentials (write-only) -->
    <div class="card">
      <h4 class="font-medium text-slate-800 dark:text-white mb-1">API credentials</h4>
      <p class="text-xs text-slate-400 mb-4">
        From the client's RAM portal (profile → API). Stored server-side and never displayed again
        <template v-if="config?.hasCredentials"> — currently set: {{ config.clientIdMasked }} / {{ config.usernameMasked }}</template>.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiInput v-model="credForm.clientId" label="Client ID" placeholder="ram-client-id" />
        <UiInput v-model="credForm.clientSecret" label="Client secret" type="password" placeholder="••••••" />
        <UiInput v-model="credForm.username" label="API username" placeholder="api-user" />
        <UiInput v-model="credForm.password" label="API password" type="password" placeholder="••••••" />
      </div>
      <div v-if="canManage" class="mt-4">
        <UiButton :disabled="saving || !(credForm.clientId || credForm.clientSecret || credForm.username || credForm.password)" @click="saveCredentials">
          Save & test connection
        </UiButton>
      </div>
    </div>

    <!-- Fuel settings + vehicle mapping -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-medium text-slate-800 dark:text-white">Fuel & vehicle mapping</h4>
        <UiButton v-if="canManage" variant="secondary" :disabled="pulling" @click="runPull">
          <Download class="w-4 h-4" /> {{ pulling ? 'Pulling…' : 'Pull last week now' }}
        </UiButton>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mb-6">
        <UiInput v-model="fuelForm.fuelPricePerLitre" label="Fuel price (£/litre)" type="number" placeholder="1.45" />
        <UiInput v-model="fuelForm.defaultVehicleMpg" label="Average van MPG" type="number" placeholder="38" />
      </div>

      <div v-if="loading" class="text-sm text-slate-400 animate-pulse">Loading fleet…</div>
      <template v-else-if="vehicles.length">
        <p class="text-xs text-slate-400 mb-2">Map each RAM van to the engineer who drives it — mileage and the live map attribute through this.</p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-dark-border">
                <th class="py-2 pr-4">Registration</th>
                <th class="py-2 pr-4">Vehicle</th>
                <th class="py-2 pr-4">RAM driver</th>
                <th class="py-2">Cruise engineer</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in vehicles" :key="v.registration" class="border-b border-slate-50 dark:border-dark-border/50">
                <td class="py-2.5 pr-4 font-semibold text-slate-700 dark:text-slate-200">{{ v.registration }}</td>
                <td class="py-2.5 pr-4 text-slate-500">{{ v.makeModel ?? '—' }}</td>
                <td class="py-2.5 pr-4 text-slate-500">{{ v.driverName ?? '—' }}</td>
                <td class="py-2.5 max-w-56">
                  <UiSelect v-model="mapping[v.registration]" :options="techOptions" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <p v-else class="text-sm text-slate-400">No vehicles available — save valid credentials first.</p>

      <div v-if="canManage" class="mt-4">
        <UiButton :disabled="saving" @click="saveFuelAndMapping">{{ saving ? 'Saving…' : 'Save settings' }}</UiButton>
      </div>
    </div>
  </div>
</template>
