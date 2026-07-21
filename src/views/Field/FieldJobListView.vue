<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FieldLayout from '@/components/Layout/FieldLayout.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { Car, ChevronRight, Wrench } from 'lucide-vue-next'
import { getJobs, type Job } from '@/api/jobs.api'
import { JobStatus } from '@/types/generated/enums/job'
import { jobStatusLabels, jobStatusBadgeVariant } from '@/utils/jobStatus'

const router = useRouter()
const loading = ref(true)
const jobs = ref<Job[]>([])
const filter = ref<'active' | 'complete' | 'all'>('active')

const ACTIVE_STATUSES: JobStatus[] = [
  JobStatus.BOOKED, JobStatus.CHECKED_IN, JobStatus.DIAGNOSIS, JobStatus.QUOTED,
  JobStatus.AWAITING_AUTHORISATION, JobStatus.APPROVED, JobStatus.PARTS_ORDERED,
  JobStatus.IN_REPAIR, JobStatus.QUALITY_CHECK,
]

const filtered = computed(() => {
  if (filter.value === 'all') return jobs.value
  if (filter.value === 'complete') {
    return jobs.value.filter((j) => [JobStatus.COMPLETE, JobStatus.COLLECTED].includes(j.status))
  }
  return jobs.value.filter((j) => ACTIVE_STATUSES.includes(j.status))
})

async function load() {
  loading.value = true
  try {
    // Backend row scoping already limits this to the engineer's assigned jobs
    const { items } = await getJobs({ page: 1, pageSize: 100 })
    jobs.value = items
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

    <!-- Job cards -->
    <div v-else-if="filtered.length" class="space-y-3">
      <button
        v-for="job in filtered"
        :key="job.id"
        @click="router.push(`/field/jobs/${job.id}`)"
        class="card !p-4 w-full text-left active:scale-[0.99] transition-transform"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold text-slate-800 dark:text-white">{{ job.jobNumber }}</span>
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
      </button>
    </div>

    <!-- Empty state -->
    <div v-else class="card text-center py-12">
      <Wrench class="w-10 h-10 mx-auto text-slate-300 mb-3" />
      <p class="text-slate-500 dark:text-slate-400">No {{ filter === 'all' ? '' : filter }} jobs assigned to you</p>
    </div>
  </FieldLayout>
</template>
