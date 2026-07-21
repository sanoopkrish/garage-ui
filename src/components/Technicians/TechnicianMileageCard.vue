<script setup lang="ts">
import { onMounted, ref } from 'vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { Car, Fuel, Leaf } from 'lucide-vue-next'
import { getMileage, type MileageRow, type MileageSummary } from '@/api/ram-tracking.api'

const props = defineProps<{ technicianId: string }>()

const rows = ref<MileageRow[]>([])
const summary = ref<MileageSummary | null>(null)
const loading = ref(true)
const unavailable = ref(false)

function formatPeriod(row: MileageRow): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
  return `${new Date(row.periodStart).toLocaleDateString('en-GB', opts)} – ${new Date(row.periodEnd).toLocaleDateString('en-GB', opts)}`
}

onMounted(async () => {
  try {
    const data = await getMileage({ technicianId: props.technicianId })
    rows.value = data.items
    summary.value = data.summary
  } catch {
    unavailable.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="!unavailable" class="card">
    <div class="flex items-center gap-2 mb-4">
      <Car class="w-4 h-4 text-brand-500" />
      <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Van Mileage</h2>
    </div>

    <div v-if="loading" class="h-24 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <template v-else-if="rows.length">
      <!-- Summary tiles -->
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="text-center py-3 rounded-lg bg-slate-50 dark:bg-white/5">
          <p class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ summary?.totalMiles ?? 0 }}</p>
          <p class="text-xs text-slate-400">miles</p>
        </div>
        <div class="text-center py-3 rounded-lg bg-slate-50 dark:bg-white/5">
          <Fuel class="w-3.5 h-3.5 text-amber-500 mx-auto mb-0.5" />
          <p class="text-lg font-bold text-slate-800 dark:text-slate-100">£{{ summary?.estFuelCost?.toFixed(0) ?? 0 }}</p>
          <p class="text-xs text-slate-400">est. fuel ({{ summary?.mpgBasis }} mpg)</p>
        </div>
        <div class="text-center py-3 rounded-lg bg-slate-50 dark:bg-white/5">
          <Leaf class="w-3.5 h-3.5 text-green-500 mx-auto mb-0.5" />
          <p class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ summary?.totalCo2Kg?.toFixed(0) ?? 0 }}</p>
          <p class="text-xs text-slate-400">kg CO₂</p>
        </div>
      </div>

      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 dark:border-dark-border">
            <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Week</th>
            <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Van</th>
            <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Miles</th>
            <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase pl-3">Source</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
          <tr v-for="row in rows.slice(0, 8)" :key="row.id">
            <td class="py-2.5 text-slate-600 dark:text-slate-300">{{ formatPeriod(row) }}</td>
            <td class="py-2.5 font-mono text-xs text-slate-400">{{ row.vehicleRegistration }}</td>
            <td class="py-2.5 text-right text-slate-700 dark:text-slate-200">{{ row.miles }}</td>
            <td class="py-2.5 text-right pl-3">
              <UiBadge :variant="row.source === 'ram' ? 'info' : 'pending'">{{ row.source === 'ram' ? 'RAM' : 'Manual' }}</UiBadge>
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <p v-else class="text-sm text-slate-400 py-4">No mileage recorded yet — connect RAM Tracking or add manual entries under Settings → Integrations.</p>
  </div>
</template>
