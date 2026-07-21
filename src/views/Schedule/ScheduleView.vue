<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import FieldMapPanel from '@/components/Schedule/FieldMapPanel.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { ChevronLeft, ChevronRight, UserPlus } from 'lucide-vue-next'
import { getSchedule, assignTechnician } from '@/api/jobs.api'
import type { Job } from '@/api/jobs.api'
import { getUsers } from '@/api/users.api'
import type { User } from '@/api/users.api'
import { usePermissions } from '@/composables/usePermissions'
import { jobStatusLabels, jobStatusBadgeVariant } from '@/utils/jobStatus'
import { ToastService } from '@/services/toast.service'

const jobs = ref<Job[]>([])
const loading = ref(true)
const { hasPermission: canAssign } = usePermissions('menus.workshop.jobs.assignTechnician')

// Week starts Monday, shows Mon–Sat
const weekStart = ref(startOfWeek(new Date()))

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - ((day + 6) % 7))
  date.setHours(0, 0, 0, 0)
  return date
}

const days = computed(() =>
  Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart.value)
    d.setDate(d.getDate() + i)
    return d
  }),
)

const iso = (d: Date) => d.toISOString().slice(0, 10)

const weekLabel = computed(() => {
  const start = days.value[0]
  const end = days.value[5]
  return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
})

function prevWeek() {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() - 7)
  weekStart.value = d
}
function nextWeek() {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() + 7)
  weekStart.value = d
}
function thisWeek() {
  weekStart.value = startOfWeek(new Date())
}

async function load() {
  loading.value = true
  try {
    jobs.value = await getSchedule(iso(days.value[0]), iso(days.value[5]))
  } catch {
    ToastService.error('Failed to load schedule')
  } finally {
    loading.value = false
  }
}

/** The date a job appears under: assignment scheduledDate → bookedAt → dueDate */
function jobDate(job: Job, technicianId?: string): string | null {
  const assignment = (job.technicians ?? []).find((t) => !technicianId || t.technicianId === technicianId)
  if (assignment?.scheduledDate) return assignment.scheduledDate
  if (job.bookedAt) return job.bookedAt.slice(0, 10)
  if (job.dueDate) return job.dueDate
  return null
}

interface Lane {
  key: string
  name: string
  cells: Record<string, Job[]>
}

const lanes = computed<Lane[]>(() => {
  const byTech = new Map<string, Lane>()
  const unassigned: Lane = { key: 'unassigned', name: 'Unassigned', cells: {} }

  for (const job of jobs.value) {
    const techs = job.technicians ?? []
    if (techs.length === 0) {
      const date = jobDate(job)
      if (date) (unassigned.cells[date] ??= []).push(job)
      continue
    }
    for (const tech of techs) {
      if (!byTech.has(tech.technicianId)) {
        byTech.set(tech.technicianId, { key: tech.technicianId, name: tech.name, cells: {} })
      }
      const date = jobDate(job, tech.technicianId)
      if (date) (byTech.get(tech.technicianId)!.cells[date] ??= []).push(job)
    }
  }

  const result = [...byTech.values()].sort((a, b) => a.name.localeCompare(b.name))
  if (Object.keys(unassigned.cells).length > 0) result.push(unassigned)
  return result
})

const isToday = (d: Date) => iso(d) === iso(new Date())

// ── Quick-assign from the Unassigned lane ─────────────────────────────────────
const assigningJob = ref<Job | null>(null)
const technicians = ref<User[]>([])
const assignForm = reactive({ technicianId: '', scheduledDate: '' })
const assignSubmitting = ref(false)

const technicianOptions = computed(() =>
  technicians.value.map((t) => ({
    value: t.id,
    label: `${t.firstName} ${t.lastName}`.trim() + ((t.skills?.length ?? 0) > 0 ? ` — ${t.skills!.map((r) => r.name).join(', ')}` : ''),
  })),
)

async function openAssign(job: Job, date: string) {
  assigningJob.value = job
  assignForm.technicianId = ''
  assignForm.scheduledDate = date
  if (technicians.value.length === 0) {
    try {
      const response = await getUsers({ role: 'Technician,Field Engineer', pageSize: 100 })
      technicians.value = response.items
    } catch {
      ToastService.error('Failed to load technicians')
    }
  }
}

async function submitAssign() {
  if (!assigningJob.value || !assignForm.technicianId) {
    ToastService.warning('Pick a technician')
    return
  }
  assignSubmitting.value = true
  try {
    await assignTechnician(assigningJob.value.id, assignForm.technicianId, assignForm.scheduledDate || undefined)
    ToastService.success('Technician assigned')
    assigningJob.value = null
    await load()
  } catch (err: any) {
    const message = err?.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to assign'))
  } finally {
    assignSubmitting.value = false
  }
}

onMounted(load)
watch(weekStart, load)
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Schedule" subtitle="Weekly view of booked and scheduled jobs by technician.">
      <div class="flex items-center gap-2">
        <button @click="prevWeek" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"><ChevronLeft class="w-4 h-4" /></button>
        <button @click="thisWeek" class="text-sm font-medium text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">{{ weekLabel }}</button>
        <button @click="nextWeek" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"><ChevronRight class="w-4 h-4" /></button>
      </div>
    </UiPageHeader>

    <div v-if="loading" class="card h-64 animate-pulse bg-slate-100 dark:bg-white/5" />

    <div v-else-if="lanes.length === 0" class="card py-16 text-center">
      <p class="text-sm text-slate-400">Nothing scheduled this week — assign technicians or set booking/due dates on jobs.</p>
    </div>

    <div v-else class="card overflow-x-auto p-0">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b border-slate-100 dark:border-dark-border">
            <th class="p-3 text-left text-xs font-semibold text-slate-400 uppercase w-40">Technician</th>
            <th
              v-for="d in days"
              :key="iso(d)"
              :class="['p-3 text-left text-xs font-semibold uppercase', isToday(d) ? 'text-brand-600' : 'text-slate-400']"
            >
              {{ d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
          <tr v-for="lane in lanes" :key="lane.key" class="align-top">
            <td class="p-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{{ lane.name }}</td>
            <td v-for="d in days" :key="iso(d)" :class="['p-2 min-w-[150px]', isToday(d) ? 'bg-brand-50/40 dark:bg-brand-900/5' : '']">
              <router-link
                v-for="job in (lane.cells[iso(d)] ?? [])"
                :key="job.id"
                :to="`/jobs/${job.id}`"
                class="block mb-1.5 p-2 rounded-lg border border-slate-100 dark:border-dark-border hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors"
              >
                <p class="text-xs font-semibold text-brand-600">{{ job.jobNumber }}</p>
                <p class="text-xs text-slate-600 dark:text-slate-300 truncate">{{ job.description }}</p>
                <div class="flex items-center justify-between mt-1">
                  <span class="text-[10px] font-mono text-slate-400">{{ job.vehicleRegistration }}</span>
                  <UiBadge :variant="(jobStatusBadgeVariant[job.status] as any)" dot>{{ jobStatusLabels[job.status] }}</UiBadge>
                </div>
                <button
                  v-if="lane.key === 'unassigned' && canAssign"
                  @click.prevent.stop="openAssign(job, iso(d))"
                  class="mt-1.5 w-full flex items-center justify-center gap-1 text-[11px] font-medium text-brand-600 border border-dashed border-brand-200 dark:border-brand-800 rounded py-0.5 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                >
                  <UserPlus class="w-3 h-3" /> Assign
                </button>
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Live van positions (RAM Tracking, Module 8) -->
    <div class="mt-6">
      <FieldMapPanel />
    </div>

    <!-- Quick-assign modal -->
    <UiModal :open="!!assigningJob" :title="`Assign Technician — ${assigningJob?.jobNumber ?? ''}`" @close="assigningJob = null">
      <div class="space-y-4">
        <UiSelect v-model="assignForm.technicianId" label="Technician" :options="technicianOptions" required />
        <UiInput v-model="assignForm.scheduledDate" label="Scheduled Date" type="date" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="assigningJob = null">Cancel</UiButton>
        <UiButton :loading="assignSubmitting" @click="submitAssign">Assign</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
