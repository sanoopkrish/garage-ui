<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import { ArrowLeft, Pencil, Wrench, Clock, CheckCircle2 } from 'lucide-vue-next'
import { getUser } from '@/api/users.api'
import type { User } from '@/api/users.api'
import { getJobs, getTechnicianStats } from '@/api/jobs.api'
import TechnicianMileageCard from '@/components/Technicians/TechnicianMileageCard.vue'
import { updateUser } from '@/api/users.api'
import { ToastService } from '@/services/toast.service'
import type { Job, TechnicianStats } from '@/api/jobs.api'
import { jobStatusLabels, jobStatusBadgeVariant } from '@/utils/jobStatus'
import { useCrudPermissions } from '@/composables/usePermissions'

const route = useRoute()
const router = useRouter()
const { canUpdate } = useCrudPermissions('team', 'technicians')

const technician = ref<User | null>(null)
const jobs = ref<Job[]>([])
const stats = ref<TechnicianStats | null>(null)
const loading = ref(true)

const techId = route.params.id as string

const fullName = computed(() =>
  technician.value ? `${technician.value.firstName ?? ''} ${technician.value.lastName ?? ''}`.trim() || technician.value.email : '',
)

/** Hours this technician logged on a given job (their assignment only) */
function hoursOnJob(job: Job): number {
  return (job.technicians ?? []).find((t) => t.technicianId === techId)?.totalHours ?? 0
}

function scheduledOn(job: Job): string | null {
  return (job.technicians ?? []).find((t) => t.technicianId === techId)?.scheduledDate ?? null
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d }
}

async function saveContractedHours(hours: number) {
  if (!technician.value || !hours || hours < 1) return
  try {
    await updateUser(technician.value.id, { contractedWeeklyHours: hours } as any)
    ;(technician.value as any).contractedWeeklyHours = hours
    ToastService.success('Contracted hours saved')
  } catch {
    ToastService.error('Failed to save contracted hours')
  }
}

onMounted(async () => {
  try {
    const [user, jobsResponse, allStats] = await Promise.all([
      getUser(techId),
      getJobs({ technicianId: techId, pageSize: 100 }),
      getTechnicianStats(),
    ])
    technician.value = user
    jobs.value = jobsResponse.items
    stats.value = allStats.find((s) => s.technicianId === techId)
      ?? { technicianId: techId, jobCount: 0, completedCount: 0, totalHours: 0 }
  } catch {
    ToastService.error('Failed to load technician')
    router.push('/technicians')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DefaultLayout>
    <div class="flex items-center justify-between mb-6">
      <button @click="router.back()" class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft class="w-4 h-4" /> Back to Technicians
      </button>
      <UiButton v-if="canUpdate && technician" variant="secondary" @click="router.push(`/admin/users/${technician.id}/edit`)">
        <Pencil class="w-4 h-4" /> Edit User
      </UiButton>
    </div>

    <div v-if="loading" class="grid grid-cols-1 xl:grid-cols-3 gap-5 animate-pulse">
      <div class="card h-48 bg-slate-100 dark:bg-white/5" />
      <div class="xl:col-span-2 card h-48 bg-slate-100 dark:bg-white/5" />
    </div>

    <div v-else-if="technician" class="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <!-- Left: profile + stats -->
      <div class="space-y-5">
        <div class="card">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-14 h-14 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
              {{ fullName.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <h1 class="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{{ fullName }}</h1>
              <div class="flex flex-wrap gap-1 mt-1">
                <span v-for="r in (technician.systemRoles ?? [])" :key="r.id" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">{{ r.name }}</span>
              </div>
            </div>
          </div>
          <div class="space-y-1.5 text-sm">
            <p class="text-slate-600 dark:text-slate-300">{{ technician.email }}</p>
            <p class="text-slate-400">{{ technician.phoneNumber || '—' }}</p>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100 dark:border-dark-border">
            <p class="text-xs font-semibold text-slate-400 uppercase mb-1.5">Skills</p>
            <div class="flex flex-wrap gap-1">
              <span v-for="s in (technician.skills ?? [])" :key="s.id" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">{{ s.name }}</span>
              <span v-if="!technician.skills?.length" class="text-sm text-slate-400">—</span>
            </div>
          </div>
        </div>

        <!-- Stat cards -->
        <div class="grid grid-cols-3 gap-3">
          <div class="card text-center py-4">
            <Wrench class="w-4 h-4 text-brand-500 mx-auto mb-1" />
            <p class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ stats?.jobCount ?? 0 }}</p>
            <p class="text-xs text-slate-400">Jobs</p>
          </div>
          <div class="card text-center py-4">
            <CheckCircle2 class="w-4 h-4 text-green-500 mx-auto mb-1" />
            <p class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ stats?.completedCount ?? 0 }}</p>
            <p class="text-xs text-slate-400">Completed</p>
          </div>
          <div class="card text-center py-4">
            <Clock class="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ stats?.totalHours ?? 0 }}h</p>
            <p class="text-xs text-slate-400">Logged</p>
          </div>
        </div>

        <!-- Contracted hours (utilisation KPI denominator, Module 12) -->
        <div class="card flex items-center justify-between !py-4">
          <div>
            <p class="text-sm font-medium text-slate-700 dark:text-slate-200">Contracted hours / week</p>
            <p class="text-xs text-slate-400">Used for the utilisation KPI</p>
          </div>
          <input
            v-if="canUpdate"
            type="number" min="1" max="80"
            :value="(technician as any)?.contractedWeeklyHours ?? 40"
            class="w-20 text-sm text-center rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-slate-700 dark:text-slate-200"
            @change="saveContractedHours(Number(($event.target as HTMLInputElement).value))"
          />
          <span v-else class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ (technician as any)?.contractedWeeklyHours ?? 40 }}h</span>
        </div>

        <!-- Van mileage (RAM Tracking, Module 8) -->
        <TechnicianMileageCard :technicianId="(route.params.id as string)" />
      </div>

      <!-- Right: job history -->
      <div class="xl:col-span-2 card">
        <div class="flex items-center gap-2 mb-4">
          <Wrench class="w-4 h-4 text-brand-500" />
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Job History ({{ jobs.length }})</h2>
        </div>
        <div v-if="jobs.length === 0" class="py-14 text-center">
          <Wrench class="w-8 h-8 text-slate-200 dark:text-slate-600 mx-auto mb-3" />
          <p class="text-sm text-slate-400">No jobs assigned yet.</p>
        </div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 dark:border-dark-border">
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Job</th>
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Description</th>
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Vehicle</th>
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Scheduled</th>
              <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Hours</th>
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase pl-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
            <tr v-for="j in jobs" :key="j.id" class="hover:bg-slate-50 dark:hover:bg-white/5">
              <td class="py-3">
                <router-link :to="`/jobs/${j.id}`" class="font-semibold text-brand-600 hover:underline">{{ j.jobNumber }}</router-link>
              </td>
              <td class="py-3 text-slate-700 dark:text-slate-200 max-w-[200px] truncate">{{ j.description }}</td>
              <td class="py-3 font-mono text-xs text-slate-400">{{ j.vehicleRegistration }}</td>
              <td class="py-3 text-slate-400">{{ formatDate(scheduledOn(j)) }}</td>
              <td class="py-3 text-right text-slate-600 dark:text-slate-300">{{ hoursOnJob(j) }}h</td>
              <td class="py-3 pl-3">
                <UiBadge :variant="(jobStatusBadgeVariant[j.status] as any)" dot>{{ jobStatusLabels[j.status] }}</UiBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </DefaultLayout>
</template>
