<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import FieldLayout from '@/components/Layout/FieldLayout.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import {
  Car, MapPin, Phone, Play, Square, Plus, Camera, CheckCircle2, Loader2, Trash2,
} from 'lucide-vue-next'
import {
  getJob, updateJobStatus,
  getChecklist, addChecklistItem, updateChecklistItem, deleteChecklistItem,
  getRunningTimer, startTimer, stopTimer,
  type Job, type ChecklistItem,
} from '@/api/jobs.api'
import { getCustomer, type Customer } from '@/api/customers.api'
import { uploadTemporary, attachToEntity, listAttachments, getViewUrl, deleteAttachment, type Attachment } from '@/api/files.api'
import { JobStatus } from '@/types/generated/enums/job'
import { jobStatusLabels, jobStatusBadgeVariant } from '@/utils/jobStatus'
import { useAuthStore } from '@/stores/auth'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

const route = useRoute()
const authStore = useAuthStore()
const jobId = route.params.id as string

const loading = ref(true)
const job = ref<Job | null>(null)
const customer = ref<Customer | null>(null)
const checklist = ref<ChecklistItem[]>([])
const photos = ref<Attachment[]>([])
const photoUrls = ref<Record<string, string>>({})

/** The logged-in engineer's own assignment on this job */
const myAssignment = computed(() =>
  job.value?.technicians?.find((t) => t.technicianId === authStore.user?.id) ?? null,
)

/** Work-execution statuses a field engineer may set on site (office owns the rest) */
const FIELD_STATUSES = [JobStatus.IN_REPAIR, JobStatus.QUALITY_CHECK, JobStatus.COMPLETE] as const
const FIELD_STATUS_LABELS: Partial<Record<JobStatus, string>> = {
  [JobStatus.IN_REPAIR]: 'Start repair',
  [JobStatus.QUALITY_CHECK]: 'Send to quality check',
  [JobStatus.COMPLETE]: 'Mark job complete',
}

const fieldTransitions = computed(() =>
  (job.value?.allowedTransitions ?? []).filter((s) => (FIELD_STATUSES as readonly JobStatus[]).includes(s)),
)

function transitionLabel(status: JobStatus): string {
  // Failed QC goes back to repair — label it as the return trip, not a fresh start
  if (status === JobStatus.IN_REPAIR && job.value?.status === JobStatus.QUALITY_CHECK) {
    return 'Back to repair'
  }
  return FIELD_STATUS_LABELS[status] ?? jobStatusLabels[status]
}

const mapsUrl = computed(() => {
  const a = customer.value?.billingAddress
  if (!a) return null
  const parts = [a.street, a.city, a.postcode].filter(Boolean).join(', ')
  return parts ? `https://maps.google.com/?q=${encodeURIComponent(parts)}` : null
})

// ---- Timer ----
const timerAssignmentId = ref<string | null>(null)
const timerStartedAt = ref<Date | null>(null)
const timerBusy = ref(false)
const nowTick = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval> | null = null

const elapsed = computed(() => {
  if (!timerStartedAt.value) return null
  const seconds = Math.max(0, Math.floor((nowTick.value - timerStartedAt.value.getTime()) / 1000))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

async function toggleTimer() {
  if (!myAssignment.value || timerBusy.value) return
  timerBusy.value = true
  try {
    if (timerStartedAt.value) {
      await stopTimer(jobId, timerAssignmentId.value ?? myAssignment.value.assignmentId)
      timerStartedAt.value = null
      timerAssignmentId.value = null
      ToastService.success('Time logged against the job')
      job.value = await getJob(jobId)
    } else {
      await startTimer(jobId, myAssignment.value.assignmentId)
      timerAssignmentId.value = myAssignment.value.assignmentId
      timerStartedAt.value = new Date()
    }
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Timer action failed')
  } finally {
    timerBusy.value = false
  }
}

// ---- Checklist ----
const newItemLabel = ref('')
const noteDrafts = ref<Record<string, string>>({})
const expandedNote = ref<string | null>(null)

const checklistDone = computed(() => checklist.value.filter((i) => i.done).length)

async function toggleItem(item: ChecklistItem) {
  const updated = await updateChecklistItem(jobId, item.id, { done: !item.done })
  Object.assign(item, updated)
}

async function saveNote(item: ChecklistItem) {
  const note = noteDrafts.value[item.id] ?? ''
  const updated = await updateChecklistItem(jobId, item.id, { note })
  Object.assign(item, updated)
  expandedNote.value = null
  ToastService.success('Note saved')
}

async function addItem() {
  const label = newItemLabel.value.trim()
  if (!label) return
  const item = await addChecklistItem(jobId, label)
  checklist.value.push(item)
  newItemLabel.value = ''
}

async function removeItem(item: ChecklistItem) {
  const result = await showConfirmDialog(`"${item.label}" will be removed from the checklist.`)
  if (!result.isConfirmed) return
  await deleteChecklistItem(jobId, item.id)
  checklist.value = checklist.value.filter((i) => i.id !== item.id)
}

// ---- Photos ----
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function onPhotoPicked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const s3Key = await uploadTemporary(file)
    const attachment = await attachToEntity(s3Key, 'job', jobId, 'wip_photo')
    photos.value.unshift(attachment)
    photoUrls.value[attachment.id] = await getViewUrl(attachment.s3Key, attachment.contentType)
    ToastService.success('Photo uploaded')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Upload failed — check storage configuration')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const deletingPhotoId = ref<string | null>(null)

async function removePhoto(photo: Attachment) {
  const result = await showConfirmDialog('This photo will be permanently deleted from the job.')
  if (!result.isConfirmed) return
  deletingPhotoId.value = photo.id
  try {
    await deleteAttachment(photo.id)
    photos.value = photos.value.filter((p) => p.id !== photo.id)
    delete photoUrls.value[photo.id]
    ToastService.success('Photo deleted')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to delete photo')
  } finally {
    deletingPhotoId.value = null
  }
}

// ---- Status advance ----
const advancing = ref<JobStatus | null>(null)

async function advanceStatus(status: JobStatus) {
  if (status === JobStatus.COMPLETE) {
    const result = await showConfirmDialog(
      'Mark this job complete? The office will be notified and the customer will receive the collection email.',
    )
    if (!result.isConfirmed) return
  }
  advancing.value = status
  try {
    job.value = await updateJobStatus(jobId, status)
    ToastService.success(
      status === JobStatus.COMPLETE
        ? 'Job marked complete — office notified'
        : `Status updated to ${jobStatusLabels[status]}`,
    )
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not update the status')
  } finally {
    advancing.value = null
  }
}

// ---- Load ----
onMounted(async () => {
  try {
    job.value = await getJob(jobId)
    const [items, running] = await Promise.all([
      getChecklist(jobId),
      getRunningTimer(jobId),
    ])
    checklist.value = items
    if (running.startedAt) {
      timerStartedAt.value = new Date(running.startedAt)
      timerAssignmentId.value = running.assignmentId
    }

    // Contact/address links — technicians may not hold CRM read permission; degrade quietly
    getCustomer(job.value.customerId).then((c) => { customer.value = c }).catch(() => {})

    listAttachments('job', jobId, 'wip_photo').then(async (list) => {
      photos.value = list
      for (const p of list) {
        getViewUrl(p.s3Key, p.contentType).then((u) => { photoUrls.value[p.id] = u }).catch(() => {})
      }
    }).catch(() => {})
  } finally {
    loading.value = false
  }
  tickInterval = setInterval(() => { nowTick.value = Date.now() }, 1000)
})

onBeforeUnmount(() => {
  if (tickInterval) clearInterval(tickInterval)
})
</script>

<template>
  <FieldLayout :title="job?.jobNumber ?? 'Job'" back-to="/field">
    <div v-if="loading" class="card !p-4 animate-pulse">
      <div class="h-4 bg-slate-200 dark:bg-white/10 rounded w-1/3 mb-3"></div>
      <div class="h-3 bg-slate-200 dark:bg-white/10 rounded w-2/3"></div>
    </div>

    <template v-else-if="job">
      <!-- Summary -->
      <div class="card !p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
            <Car class="w-5 h-5 text-brand-500" />
            {{ job.vehicleRegistration }}
          </div>
          <UiBadge :variant="(jobStatusBadgeVariant[job.status] as any)">{{ jobStatusLabels[job.status] }}</UiBadge>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-1">{{ job.vehicleLabel }}</p>
        <p class="text-sm text-slate-700 dark:text-slate-200 mb-3">{{ job.description }}</p>

        <div class="flex flex-wrap gap-2">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ job.customerName }}</span>
          <a
            v-if="customer?.phone"
            :href="`tel:${customer.phone}`"
            class="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 font-medium"
          >
            <Phone class="w-4 h-4" /> {{ customer.phone }}
          </a>
          <a
            v-if="mapsUrl"
            :href="mapsUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 font-medium"
          >
            <MapPin class="w-4 h-4" /> Directions
          </a>
        </div>
      </div>

      <!-- Timer -->
      <div v-if="myAssignment" class="card !p-4 mb-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400 mb-0.5">On-site time</p>
            <p class="text-2xl font-bold tabular-nums text-slate-800 dark:text-white">
              {{ elapsed ?? '00:00:00' }}
            </p>
            <p class="text-xs text-slate-400 mt-0.5">{{ job.loggedHours ?? 0 }}h logged in total</p>
          </div>
          <button
            @click="toggleTimer"
            :disabled="timerBusy"
            :class="[
              'w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-colors',
              timerStartedAt ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600',
              timerBusy ? 'opacity-60' : '',
            ]"
            :aria-label="timerStartedAt ? 'Stop timer' : 'Start timer'"
          >
            <Loader2 v-if="timerBusy" class="w-6 h-6 animate-spin" />
            <Square v-else-if="timerStartedAt" class="w-6 h-6" />
            <Play v-else class="w-7 h-7 ml-0.5" />
          </button>
        </div>
      </div>

      <!-- Checklist -->
      <div class="card !p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-slate-800 dark:text-white">Checklist</h2>
          <span class="text-sm text-slate-400">{{ checklistDone }}/{{ checklist.length }}</span>
        </div>

        <ul class="space-y-1">
          <li v-for="item in checklist" :key="item.id" class="group">
            <div class="flex items-start gap-3 py-2">
              <button
                @click="toggleItem(item)"
                :class="[
                  'mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  item.done
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : 'border-slate-300 dark:border-slate-600 text-transparent',
                ]"
                :aria-label="item.done ? 'Mark not done' : 'Mark done'"
              >
                <CheckCircle2 class="w-4 h-4" />
              </button>
              <div class="flex-1 min-w-0" @click="expandedNote = expandedNote === item.id ? null : item.id; noteDrafts[item.id] = item.note ?? ''">
                <p :class="['text-sm', item.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200']">
                  {{ item.label }}
                </p>
                <p v-if="item.note && expandedNote !== item.id" class="text-xs text-slate-400 truncate">{{ item.note }}</p>
                <p v-if="item.done && item.doneBy" class="text-[11px] text-slate-400">{{ item.doneBy }}</p>
              </div>
              <button
                @click="removeItem(item)"
                class="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove item"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
            <!-- Note editor -->
            <div v-if="expandedNote === item.id" class="ml-9 mb-2 flex gap-2">
              <input
                v-model="noteDrafts[item.id]"
                type="text"
                maxlength="500"
                placeholder="Add a note…"
                class="flex-1 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                @keyup.enter="saveNote(item)"
              />
              <UiButton size="sm" @click="saveNote(item)">Save</UiButton>
            </div>
          </li>
        </ul>

        <div class="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-dark-border">
          <input
            v-model="newItemLabel"
            type="text"
            maxlength="300"
            placeholder="Add checklist item…"
            class="flex-1 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            @keyup.enter="addItem"
          />
          <UiButton size="sm" @click="addItem"><Plus class="w-4 h-4" /></UiButton>
        </div>
      </div>

      <!-- Photos -->
      <div class="card !p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-slate-800 dark:text-white">Photos</h2>
          <label
            :class="[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium cursor-pointer transition-colors',
              uploading ? 'opacity-60 pointer-events-none' : '',
            ]"
          >
            <Loader2 v-if="uploading" class="w-4 h-4 animate-spin" />
            <Camera v-else class="w-4 h-4" />
            {{ uploading ? 'Uploading…' : 'Add photo' }}
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              capture="environment"
              class="hidden"
              @change="onPhotoPicked"
            />
          </label>
        </div>
        <div v-if="photos.length" class="grid grid-cols-3 gap-2">
          <div v-for="p in photos" :key="p.id" class="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5">
            <a :href="photoUrls[p.id]" target="_blank" rel="noopener" class="block w-full h-full">
              <img v-if="photoUrls[p.id]" :src="photoUrls[p.id]" :alt="p.fileName" class="w-full h-full object-cover" />
            </a>
            <button
              type="button"
              :disabled="deletingPhotoId === p.id"
              @click.stop.prevent="removePhoto(p)"
              class="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 text-white hover:bg-red-600 transition-colors"
              aria-label="Delete photo"
            >
              <Loader2 v-if="deletingPhotoId === p.id" class="w-3.5 h-3.5 animate-spin" />
              <Trash2 v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p v-else class="text-sm text-slate-400">No work-in-progress photos yet</p>
      </div>

      <!-- Internal notes -->
      <div v-if="job.internalNotes" class="card !p-4 mb-4">
        <h2 class="font-semibold text-slate-800 dark:text-white mb-2">Internal notes</h2>
        <p class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{{ job.internalNotes }}</p>
      </div>

      <!-- Status advance (in repair → quality check → complete) -->
      <div v-if="fieldTransitions.length" class="fixed bottom-0 inset-x-0 z-20 p-4 bg-gradient-to-t from-slate-50 dark:from-dark-bg via-slate-50/90 dark:via-dark-bg/90 to-transparent">
        <div class="max-w-2xl mx-auto flex gap-2">
          <button
            v-for="status in fieldTransitions"
            :key="status"
            @click="advanceStatus(status)"
            :disabled="advancing !== null"
            :class="[
              'flex-1 py-3.5 rounded-xl font-semibold shadow-lg disabled:opacity-60 transition-colors flex items-center justify-center gap-2',
              status === JobStatus.COMPLETE
                ? 'bg-brand-500 hover:bg-brand-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-white dark:bg-dark-surface dark:hover:bg-white/10 dark:border dark:border-dark-border',
            ]"
          >
            <Loader2 v-if="advancing === status" class="w-5 h-5 animate-spin" />
            <CheckCircle2 v-else class="w-5 h-5" />
            {{ transitionLabel(status) }}
          </button>
        </div>
      </div>
    </template>
  </FieldLayout>
</template>
