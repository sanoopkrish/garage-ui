<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FieldLayout from '@/components/Layout/FieldLayout.vue'
import { MapPin, Navigation, Route, RefreshCw, Warehouse, ChevronRight, AlertTriangle } from 'lucide-vue-next'
import { getMyRoute, navigateUrl, type DailyRoute } from '@/api/jobs.api'
import { VisitStatus, WorkLocation } from '@/types/generated/enums/job'
import { ToastService } from '@/services/toast.service'

/** Sprint 26 — the engineer's stops for today, in order, with one-tap navigation. */
const router = useRouter()
const loading = ref(true)
const route = ref<DailyRoute | null>(null)

const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const onSiteStops = computed(() => (route.value?.stops ?? []).filter((s) => s.workLocation === WorkLocation.ON_SITE))
const workshopStops = computed(() => (route.value?.stops ?? []).filter((s) => s.workLocation !== WorkLocation.ON_SITE))

const statusLabel: Record<VisitStatus, string> = {
  [VisitStatus.PLANNED]: 'Planned',
  [VisitStatus.IN_PROGRESS]: 'On site',
  [VisitStatus.DONE]: 'Done',
  [VisitStatus.MISSED]: 'Missed',
}

async function load() {
  loading.value = true
  try {
    route.value = await getMyRoute()
  } catch (e: any) {
    ToastService.error(e?.response?.data?.message ?? 'Could not load your route')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <FieldLayout title="Today's route" back-to="/field">
    <div class="flex items-center justify-between mb-3">
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ today }}</p>
      <button @click="load" class="p-2 rounded-lg text-slate-400 hover:text-slate-600" aria-label="Refresh"><RefreshCw class="w-4 h-4" /></button>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card !p-4 animate-pulse"><div class="h-4 bg-slate-200 dark:bg-white/10 rounded w-1/2" /></div>
    </div>

    <template v-else-if="route">
      <!-- Full route link -->
      <a
        v-if="route.mapsUrl"
        :href="route.mapsUrl"
        target="_blank"
        rel="noopener"
        class="card !p-4 mb-4 flex items-center gap-3 bg-brand-500 text-white active:scale-[0.99] transition-transform"
      >
        <Route class="w-6 h-6 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="font-semibold">Open full route in Maps</p>
          <p class="text-xs text-white/80">
            {{ onSiteStops.length }} stop{{ onSiteStops.length === 1 ? '' : 's' }}<template v-if="route.totalKm"> · about {{ route.totalKm }} km as the crow flies</template>
          </p>
          <p v-if="route.mapsUrlTruncated" class="text-xs text-white/80 mt-0.5">Maps takes 10 places at most — the link covers the first stops.</p>
        </div>
        <ChevronRight class="w-5 h-5 flex-shrink-0" />
      </a>

      <!-- Start point -->
      <div v-if="onSiteStops.length" class="flex items-center gap-3 px-1 mb-2 text-sm text-slate-500 dark:text-slate-400">
        <Warehouse class="w-4 h-4" /> Start: {{ route.start.label }}<template v-if="route.start.address"> — {{ route.start.address }}</template>
      </div>

      <!-- On-site stops -->
      <div v-if="onSiteStops.length" class="space-y-3 mb-5">
        <div v-for="stop in onSiteStops" :key="stop.id" class="card !p-4">
          <div class="flex items-start gap-3">
            <div class="w-7 h-7 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{{ stop.sequence }}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <button class="font-semibold text-slate-800 dark:text-white text-left" @click="router.push(`/field/jobs/${stop.jobId}`)">{{ stop.jobNumber }}</button>
                <span
                  :class="['px-2 py-0.5 rounded-full text-[11px] font-medium',
                    stop.status === VisitStatus.DONE ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : stop.status === VisitStatus.IN_PROGRESS ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                    : stop.status === VisitStatus.MISSED ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300']"
                >{{ statusLabel[stop.status] }}</span>
              </div>
              <p class="text-sm text-slate-600 dark:text-slate-300 truncate">{{ stop.customerName }} · {{ stop.vehicleRegistration }}</p>
              <p class="text-sm text-slate-500 dark:text-slate-400 flex items-start gap-1 mt-1"><MapPin class="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{{ stop.address }}</span></p>
              <p v-if="stop.legKm != null" class="text-xs text-slate-400 mt-0.5">{{ stop.legKm }} km from the previous stop</p>
              <p v-else-if="!stop.lat" class="text-xs text-amber-600 flex items-center gap-1 mt-0.5"><AlertTriangle class="w-3 h-3" /> Postcode not located — placed last</p>
              <a
                :href="navigateUrl({ street: stop.address ?? undefined }) ?? '#'"
                target="_blank"
                rel="noopener"
                class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium"
              ><Navigation class="w-4 h-4" /> Navigate</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Workshop jobs today -->
      <div v-if="workshopStops.length" class="mb-4">
        <p class="text-xs uppercase tracking-wide text-slate-400 mb-2 px-1">In the workshop today</p>
        <div class="space-y-2">
          <button v-for="stop in workshopStops" :key="stop.id" @click="router.push(`/field/jobs/${stop.jobId}`)" class="card !p-3 w-full text-left flex items-center gap-3">
            <Warehouse class="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span class="font-medium text-slate-800 dark:text-white">{{ stop.jobNumber }}</span>
            <span class="text-sm text-slate-500 truncate">{{ stop.jobDescription }}</span>
            <ChevronRight class="w-4 h-4 ml-auto text-slate-300 flex-shrink-0" />
          </button>
        </div>
      </div>

      <div v-if="!route.stops.length" class="card text-center py-12">
        <Route class="w-10 h-10 mx-auto text-slate-300 mb-3" />
        <p class="text-slate-500 dark:text-slate-400">No stops planned for today</p>
        <p class="text-xs text-slate-400 mt-1">Jobs appear here once the office plans a visit for you on this date.</p>
      </div>
    </template>
  </FieldLayout>
</template>
