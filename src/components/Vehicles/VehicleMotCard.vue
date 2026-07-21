<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { ShieldCheck, AlertTriangle } from 'lucide-vue-next'
import { lookupVehicleByRegistration, type VehicleLookupResult } from '@/api/vehicles.api'

const props = defineProps<{ registration: string }>()

const result = ref<VehicleLookupResult | null>(null)
const loading = ref(true)
const unavailable = ref(false)

const expiry = computed(() => (result.value?.motExpiryDate ? new Date(result.value.motExpiryDate) : null))
const daysLeft = computed(() => (expiry.value ? Math.ceil((expiry.value.getTime() - Date.now()) / 86_400_000) : null))

function formatDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

onMounted(async () => {
  try {
    result.value = await lookupVehicleByRegistration(props.registration)
  } catch {
    unavailable.value = true // not configured / not found — card hides quietly
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="!unavailable" class="card">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <ShieldCheck class="w-4 h-4 text-brand-500" /> MOT (DVSA)
      </h2>
      <template v-if="!loading && daysLeft != null">
        <UiBadge v-if="daysLeft < 0" variant="cancelled" dot>Expired {{ formatDate(result?.motExpiryDate ?? null) }}</UiBadge>
        <UiBadge v-else-if="daysLeft <= 30" variant="pending" dot>Due in {{ daysLeft }} days</UiBadge>
        <UiBadge v-else variant="done" dot>Valid until {{ formatDate(result?.motExpiryDate ?? null) }}</UiBadge>
      </template>
    </div>

    <div v-if="loading" class="h-20 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <template v-else-if="result">
      <ul v-if="result.motTests.length" class="space-y-3">
        <li v-for="test in result.motTests.slice(0, 3)" :key="test.completedDate" class="text-sm">
          <div class="flex items-center gap-2">
            <UiBadge :variant="test.testResult === 'PASSED' ? 'done' : 'cancelled'">{{ test.testResult === 'PASSED' ? 'Pass' : 'Fail' }}</UiBadge>
            <span class="text-slate-600 dark:text-slate-300">{{ formatDate(test.completedDate) }}</span>
            <span v-if="test.odometerValue" class="text-slate-400 text-xs ml-auto">{{ test.odometerValue.toLocaleString() }} {{ (test.odometerUnit ?? 'mi').toLowerCase() }}</span>
          </div>
          <ul v-if="test.defects.length" class="mt-1 ml-1 space-y-0.5">
            <li v-for="(defect, i) in test.defects.slice(0, 4)" :key="i" class="flex items-start gap-1.5 text-xs text-slate-500">
              <AlertTriangle :class="['w-3 h-3 mt-0.5 flex-shrink-0', defect.dangerous ? 'text-red-500' : 'text-amber-500']" />
              <span><span class="uppercase text-[10px] font-semibold" :class="defect.dangerous ? 'text-red-500' : 'text-amber-500'">{{ defect.type }}</span> {{ defect.text }}</span>
            </li>
          </ul>
        </li>
      </ul>
      <p v-else class="text-sm text-slate-400">No MOT history yet (vehicle may be under 3 years old).</p>
    </template>
  </div>
</template>
