<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FieldLayout from '@/components/Layout/FieldLayout.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { Car, ChevronRight, Wrench, MapPin, Navigation, Route, CalendarDays } from 'lucide-vue-next'
import { getJobs, getVisitsForDay, getUpcomingVisits, navigateUrl, type Job, type VisitSummary } from '@/api/jobs.api'
import { JobStatus, VisitStatus, WorkLocation } from '@/types/generated/enums/job'
import { jobStatusLabels, jobStatusBadgeVariant } from '@/utils/jobStatus'

const router = useRouter()
const loading = ref(true)
const jobs = ref<Job[]>([])
const todayVisits = ref<VisitSummary[]>([])
const upcomingVisits = ref<VisitSummary[]>([])
const filter = ref<'active' | 'complete' | 'all'>('active')

const ACTIVE_STATUSES: JobStatus[] = [
  JobStatus.BOOKED, JobStatus.CHECKED_IN, JobStatus.DIAGNOSIS, JobStatus.QUOTED,
  JobStatus.AWAITING_AUTHORISATION, JobStatus.APPROVED, JobStatus.PARTS_ORDERED,
  JobStatus.IN_REPAIR, JobStatus.QUALITY_CHECK,
]

const todayIso = new Date().toISOString().slice(0, 10)

/** Sprint 26 — Today = jobs with a visit planned today; Upcoming = visits after today; Open = the rest */
const todayJobIds = computed(() => new Set(todayVisits.value.map((v) => v.jobId)))
const upcomingByJob = computed(() => {
  const map = new Map<string, VisitSummary>()
  for (const v of upcomingVisits.value) if (!map.has(v.jobId)) map.set(v.jobId, v)
  return map
})

const filtered = computed(() => {
  if (filter.value === 'all') return jobs.value
  if (filter.value === 'complete') {
    return jobs.value.filter((j) => [JobStatus.COMPLETE, JobStatus.COLLECTED].includes(j.status))
  }
  return jobs.value.filter((j) => ACTIVE_STATUSES.includes(j.status))
})

const todayJobs = computed(() => filter.value === 'active' ? filtered.value.filter((j) => todayJobIds.value.has(j.id)) : [])
const upcomingJobs = computed(() => filter.value === 'active' ? filtered.value.filter((j) => !todayJobIds.value.has(j.id) && upcomingByJob.value.has(j.id)) : [])
const otherJobs = computed(() => filter.value === 'active' ? filtered.value.filter((j) => !todayJobIds.value.has(j.id) && !upcomingByJob.value.has(j.id)) : filtered.value)

const hasOnSiteToday = computed(() => todayVisits.value.some((v) => v.workLocation === WorkLocation.ON_SITE))

function visitToday(job: Job): VisitSummary | undefined {
  return todayVisits.value.find((v) => v.jobId === job.id)
}

function formatDay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

async function load() {
  loading.value = true
  try {
    // Backend row scoping already limits this to the engineer's assigned jobs
    const [{ items }, today, upcoming] = await Promise.all([
      getJobs({ page: 1, pageSize: 100 }),
      getVisitsForDay(todayIso).catch(() => [] as VisitSummary[]),
      getUpcomingVisits(todayIso).catch(() => [] as VisitSummary[]),
    ])
    jobs.value = items
    todayVisits.value = today
    upcomingVisits.value = upcoming
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <FieldLayout title="My Jobs">
    <!-- Filter chips -->
    <div class="flex gap-2 mb-4">
      <button
        v-for="f in [
          { key: 'active', label: 'Active' },
          { key: 'complete', label: 'Completed' },
          { key: 'all', label: 'All' },
        ]"
        :key="f.key"
        @click="filter = f.key as typeof filter"
        :class="[
          'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
          filter === f.key
            ? 'bg-brand-500 text-white'
            : 'bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-border',
        ]"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card !p-4 animate-pulse">
        <div class="h-4 bg-slate-200 dark:bg-white/10 rounded w-1/3 mb-3"></div>
        <div class="h-3 bg-slate-200 dark:bg-white/10 rounded w-2/3"></div>
      </div>
    </div>

    <template v-else-if="filtered.length">
      <!-- Sprint 26 — Today's route shortcut -->
      <button
        v-if="filter === 'active' && hasOnSiteToday"
        @click="router.push('/field/route')"
        class="card !p-4 mb-4 w-full flex items-center gap-3 bg-brand-500 text-white active:scale-[0.99] transition-transform"
      >
        <Route class="w-6 h-6 flex-shrink-0" />
        <div class="flex-1 text-left">
          <p class="font-semibold">Today's route</p>
          <p class="text-xs text-white/80">{{ todayVisits.filter((v) => v.workLocation === WorkLocation.ON_SITE).length }} on-site stop(s), in order, with directions</p>
        </div>
        <ChevronRight class="w-5 h-5" />
      </button>

      <template v-for="section in [
        { key: 'today', label: 'Today', items: todayJobs },
        { key: 'upcoming', label: 'Upcoming', items: upcomingJobs },
        { key: 'other', label: filter === 'active' ? 'Open' : '', items: otherJobs },
      ]" :key="section.key">
        <div v-if="section.items.length" class="mb-5">
          <p v-if="section.label" class="text-xs uppercase tracking-wide text-slate-400 mb-2 px-1 flex items-center gap-1.5">
            <CalendarDays v-if="section.key !== 'other'" class="w-3.5 h-3.5" /> {{ section.label }}
          </p>
          <div class="space-y-3">
            <button
              v-for="job in section.items"
              :key="job.id"
              @click="router.push(`/field/jobs/${job.id}`)"
              class="card !p-4 w-full text-left active:scale-[0.99] transition-transform"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  {{ job.jobNumber }}
                  <span
                    v-if="job.workLocation === WorkLocation.ON_SITE"
                    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                  ><MapPin class="w-3 h-3" /> On-site</span>
                </span>
                <UiBadge :variant="(jobStatusBadgeVariant[job.status] as any)">{{ jobStatusLabels[job.status] }}</UiBadge>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-1">
                <Car class="w-4 h-4 flex-shrink-0 text-slate-400" />
                <span class="font-medium">{{ job.vehicleRegistration }}</span>
                <span class="text-slate-400 truncate">{{ job.vehicleLabel }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Wrench class="w-4 h-4 flex-shrink-0 text-slate-400" />
                <span class="truncate">{{ job.description }}</span>
                <ChevronRight class="w-4 h-4 ml-auto flex-shrink-0 text-slate-300" />
              </div>
              <!-- Sprint 26 — site line: postcode, status today / next date, Navigate -->
              <div v-if="job.workLocation === WorkLocation.ON_SITE || section.key !== 'other'" class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-dark-border text-xs text-slate-500 dark:text-slate-400">
                <span v-if="job.siteAddress?.postcode" class="font-mono font-semibold">{{ job.siteAddress.postcode }}</span>
                <span v-if="section.key === 'today' && visitToday(job)?.status === VisitStatus.DONE" class="text-emerald-600 font-medium">done today</span>
                <span v-else-if="section.key === 'today' && visitToday(job)?.status === VisitStatus.IN_PROGRESS" class="text-sky-600 font-medium">on site</span>
                <span v-else-if="section.key === 'upcoming' && upcomingByJob.get(job.id)">{{ formatDay(upcomingByJob.get(job.id)!.visitDate) }}</span>
                <a
                  v-if="job.workLocation === WorkLocation.ON_SITE && navigateUrl(job.siteAddress)"
                  :href="navigateUrl(job.siteAddress) ?? '#'"
                  target="_blank"
                  rel="noopener"
                  @click.stop
                  class="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500 text-white font-medium"
                ><Navigation class="w-3.5 h-3.5" /> Navigate</a>
              </div>
            </button>
          </div>
        </div>
      </template>
    </template>

    <!-- Empty state -->
    <div v-else class="card text-center py-12">
      <Wrench class="w-10 h-10 mx-auto text-slate-300 mb-3" />
      <p class="text-slate-500 dark:text-slate-400">No {{ filter === 'all' ? '' : filter }} jobs assigned to you</p>
    </div>
  </FieldLayout>
</template>
