<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { UserCog, Plus, X, Clock } from 'lucide-vue-next'
import { assignTechnician, unassignTechnician, addTimeEntry } from '@/api/jobs.api'
import type { Job, JobTechnician } from '@/api/jobs.api'
import { getUsers } from '@/api/users.api'
import type { User } from '@/api/users.api'
import { usePermissions, useCrudPermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

const props = defineProps<{ job: Job }>()
const emit = defineEmits<{ (e: 'updated', job: Job): void }>()

const { hasPermission: canAssign } = usePermissions('menus.workshop.jobs.assignTechnician')
const { canUpdate } = useCrudPermissions('workshop', 'jobs')

function apiError(err: any, fallback: string) {
  const message = err?.response?.data?.message
  ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? fallback))
}

// ── Assign modal (skill-filtered picker) ──────────────────────────────────────
const showAssign = ref(false)
const technicians = ref<User[]>([])
const loadingTechs = ref(false)
const skillFilter = ref('')
const assignForm = reactive({ technicianId: '', scheduledDate: '' })
const assigning = ref(false)

const skillOptions = computed(() => {
  const skills = new Set<string>()
  for (const t of technicians.value) for (const r of t.skills ?? []) skills.add(r.name)
  return [{ value: '', label: 'All skills' }, ...[...skills].sort().map((s) => ({ value: s, label: s }))]
})

const assignedIds = computed(() => new Set((props.job.technicians ?? []).map((t) => t.technicianId)))

const technicianOptions = computed(() =>
  technicians.value
    .filter((t) => !assignedIds.value.has(t.id))
    .filter((t) => !skillFilter.value || (t.skills ?? []).some((r) => r.name === skillFilter.value))
    .map((t) => ({
      value: t.id,
      label: `${t.firstName} ${t.lastName}`.trim() + ((t.skills?.length ?? 0) > 0 ? ` — ${t.skills!.map((r) => r.name).join(', ')}` : ''),
    })),
)

async function openAssign() {
  assignForm.technicianId = ''
  assignForm.scheduledDate = ''
  skillFilter.value = ''
  showAssign.value = true
  if (technicians.value.length === 0) {
    loadingTechs.value = true
    try {
      const response = await getUsers({ role: 'Technician,Field Engineer', pageSize: 100 })
      technicians.value = response.items
    } catch {
      ToastService.error('Failed to load technicians')
    } finally {
      loadingTechs.value = false
    }
  }
}

async function submitAssign() {
  if (!assignForm.technicianId) {
    ToastService.warning('Pick a technician')
    return
  }
  assigning.value = true
  try {
    const updated = await assignTechnician(props.job.id, assignForm.technicianId, assignForm.scheduledDate || undefined)
    ToastService.success('Technician assigned')
    showAssign.value = false
    emit('updated', updated)
  } catch (err: any) {
    apiError(err, 'Failed to assign technician')
  } finally {
    assigning.value = false
  }
}

async function handleUnassign(tech: JobTechnician) {
  const result = await showConfirmDialog(`Remove ${tech.name} from this job?`, false, 'Remove')
  if (!result.isConfirmed) return
  try {
    await unassignTechnician(props.job.id, tech.assignmentId)
    ToastService.success('Technician removed')
    emit('updated', { ...props.job, technicians: (props.job.technicians ?? []).filter((t) => t.assignmentId !== tech.assignmentId) })
  } catch (err: any) {
    apiError(err, 'Failed to remove technician')
  }
}

// ── Time logging ──────────────────────────────────────────────────────────────
const loggingFor = ref<JobTechnician | null>(null)
const timeForm = reactive({ hours: '', workDate: '', notes: '' })
const loggingSubmitting = ref(false)

function openLog(tech: JobTechnician) {
  loggingFor.value = tech
  timeForm.hours = ''
  timeForm.workDate = new Date().toISOString().slice(0, 10)
  timeForm.notes = ''
}

async function submitLog() {
  if (!loggingFor.value || timeForm.hours === '') return
  loggingSubmitting.value = true
  try {
    const updated = await addTimeEntry(
      props.job.id,
      loggingFor.value.assignmentId,
      Number(timeForm.hours),
      timeForm.workDate || undefined,
      timeForm.notes.trim() || undefined,
    )
    ToastService.success('Time logged')
    loggingFor.value = null
    emit('updated', updated)
  } catch (err: any) {
    apiError(err, 'Failed to log time')
  } finally {
    loggingSubmitting.value = false
  }
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) } catch { return d }
}
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <UserCog class="w-4 h-4 text-brand-500" />
        <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Technicians</h2>
      </div>
      <UiButton v-if="canAssign" variant="secondary" @click="openAssign"><Plus class="w-3.5 h-3.5" /> Assign</UiButton>
    </div>

    <div
      v-if="(job.quotedLabourHours ?? 0) > 0 || (job.loggedHours ?? 0) > 0"
      class="mb-3 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3"
    >
      <span>Labour quoted: <span class="font-semibold text-slate-700 dark:text-slate-200">{{ job.quotedLabourHours ?? 0 }}h</span></span>
      <span>Logged: <span class="font-semibold text-slate-700 dark:text-slate-200">{{ job.loggedHours ?? 0 }}h</span></span>
      <span v-if="(job.quotedLabourHours ?? 0) > 0">
        Variance:
        <span :class="['font-semibold', (job.loggedHours ?? 0) > (job.quotedLabourHours ?? 0) ? 'text-red-500' : 'text-green-600']">
          {{ ((job.loggedHours ?? 0) - (job.quotedLabourHours ?? 0)) > 0 ? '+' : '' }}{{ Math.round(((job.loggedHours ?? 0) - (job.quotedLabourHours ?? 0)) * 100) / 100 }}h
        </span>
      </span>
    </div>

    <p v-if="!job.technicians?.length" class="text-sm text-slate-400">No technicians assigned yet.</p>

    <div v-else class="space-y-3">
      <div v-for="tech in job.technicians" :key="tech.assignmentId" class="border border-slate-100 dark:border-dark-border rounded-lg p-3">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {{ tech.name.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{{ tech.name }}</p>
            <p class="text-xs text-slate-400 truncate">{{ tech.skills.join(', ') || '—' }}</p>
          </div>
          <button v-if="canAssign" @click="handleUnassign(tech)" class="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500" title="Remove">
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
        <div class="flex items-center justify-between mt-2 text-xs text-slate-400">
          <span>
            <template v-if="tech.scheduledDate">Scheduled {{ formatDate(tech.scheduledDate) }} · </template>
            {{ tech.totalHours }}h logged
          </span>
          <button v-if="canUpdate" @click="openLog(tech)" class="flex items-center gap-1 text-brand-600 hover:underline">
            <Clock class="w-3 h-3" /> Log time
          </button>
        </div>
      </div>
    </div>

    <!-- Assign modal -->
    <UiModal :open="showAssign" title="Assign Technician" @close="showAssign = false">
      <div class="space-y-4">
        <UiSelect v-model="skillFilter" label="Filter by skill" :options="skillOptions" />
        <UiSelect v-model="assignForm.technicianId" label="Technician" :options="technicianOptions" required />
        <p v-if="!loadingTechs && technicianOptions.length === 0" class="text-xs text-slate-400">
          No available technicians{{ skillFilter ? ` with the ${skillFilter} skill` : '' }}.
        </p>
        <UiInput v-model="assignForm.scheduledDate" label="Scheduled Date (optional)" type="date" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showAssign = false">Cancel</UiButton>
        <UiButton :loading="assigning" @click="submitAssign">Assign</UiButton>
      </template>
    </UiModal>

    <!-- Log time modal -->
    <UiModal :open="!!loggingFor" :title="`Log Time — ${loggingFor?.name ?? ''}`" @close="loggingFor = null">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="timeForm.hours" label="Hours" type="number" placeholder="2.5" required />
          <UiInput v-model="timeForm.workDate" label="Date" type="date" />
        </div>
        <UiInput v-model="timeForm.notes" label="Notes (optional)" placeholder="What was done" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="loggingFor = null">Cancel</UiButton>
        <UiButton :loading="loggingSubmitting" @click="submitLog">Log Time</UiButton>
      </template>
    </UiModal>
  </div>
</template>
