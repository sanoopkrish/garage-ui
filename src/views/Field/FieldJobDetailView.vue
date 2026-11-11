<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import FieldLayout from '@/components/Layout/FieldLayout.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import {
  Car, MapPin, Phone, Play, Square, Plus, Camera, CheckCircle2, Loader2, Trash2,
  FileText, Navigation, MessageSquare, Send, CalendarDays, KeyRound,
} from 'lucide-vue-next'
import {
  getJob, updateJobStatus,
  getChecklist, addChecklistItem, updateChecklistItem, deleteChecklistItem,
  getRunningTimer, startTimer, stopTimer,
  getJobNotes, addJobNote, navigateUrl,
  type Job, type ChecklistItem, type JobNote, type StopTimerOptions,
} from '@/api/jobs.api'
import { getCustomer, type Customer } from '@/api/customers.api'
import { uploadTemporary, attachToEntity, listAttachments, getViewUrl, deleteAttachment, type Attachment } from '@/api/files.api'
import { JobStatus, NoteSource, VisitStatus, WorkLocation } from '@/types/generated/enums/job'
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

/** Sprint 26 — on-site jobs navigate to the site address; workshop jobs fall back to the customer's address */
const isOnSite = computed(() => job.value?.workLocation === WorkLocation.ON_SITE)
const mapsUrl = computed(() => {
  if (isOnSite.value && job.value?.siteAddress) return navigateUrl(job.value.siteAddress)
  return navigateUrl(customer.value?.billingAddress ?? null)
})

// ---- Sprint 26: visits (this engineer's planned days on the job) ----
const todayIso = new Date().toISOString().slice(0, 10)
const myVisits = computed(() =>
  (job.value?.visits ?? []).filter((v) => v.assignmentId === myAssignment.value?.assignmentId).sort((a, b) => a.visitDate.localeCompare(b.visitDate)),
)
const todayVisitIndex = computed(() => myVisits.value.findIndex((v) => v.visitDate === todayIso))
const dayLabel = computed(() => {
  if (myVisits.value.length < 2) return null
  const idx = todayVisitIndex.value >= 0 ? todayVisitIndex.value : myVisits.value.findIndex((v) => v.visitDate > todayIso)
  return idx >= 0 ? `Day ${idx + 1} of ${myVisits.value.length}` : `${myVisits.value.length} days planned`
})
const nextVisit = computed(() => myVisits.value.find((v) => v.visitDate > todayIso && v.status === VisitStatus.PLANNED) ?? null)

function formatDay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ---- Sprint 26: notes ----
const notes = ref<JobNote[]>([])
const noteDraft = ref('')
const postingNote = ref(false)

async function postNote() {
  const body = noteDraft.value.trim()
  if (!body || postingNote.value) return
  postingNote.value = true
  try {
    notes.value.push(await addJobNote(jobId, body))
    noteDraft.value = ''
    ToastService.success('Note added — the office has been told')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not add the note')
  } finally {
    postingNote.value = false
  }
}

function noteWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ---- Sprint 26: diagnostic reports (Autel PDF etc.) ----
const reports = ref<Attachment[]>([])
const reportInput = ref<HTMLInputElement | null>(null)
const uploadingReport = ref(false)

async function onReportPicked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingReport.value = true
  try {
    const s3Key = await uploadTemporary(file)
    const attachment = await attachToEntity(s3Key, 'job', jobId, 'diagnostic_report')
    reports.value.unshift(attachment)
    ToastService.success('Report attached — the office has been told')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Upload failed — check storage configuration')
  } finally {
    uploadingReport.value = false
    if (reportInput.value) reportInput.value.value = ''
  }
}

async function openReport(report: Attachment) {
  try {
    window.open(await getViewUrl(report.s3Key, report.contentType), '_blank')
  } catch {
    ToastService.error('Could not open the report')
  }
}

const deletingReportId = ref<string | null>(null)
async function removeReport(report: Attachment) {
  const result = await showConfirmDialog(`"${report.fileName}" will be permanently deleted from the job.`)
  if (!result.isConfirmed) return
  deletingReportId.value = report.id
  try {
    await deleteAttachment(report.id)
    reports.value = reports.value.filter((r) => r.id !== report.id)
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to delete the report')
  } finally {
    deletingReportId.value = null
  }
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

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

// Sprint 26 — stopping opens a sheet: done for today / coming back / just pausing
const stopSheetOpen = ref(false)
const stopNotes = ref('')
const returnDate = ref('')

async function toggleTimer() {
  if (!myAssignment.value || timerBusy.value) return
  if (timerStartedAt.value) {
    stopNotes.value = ''
    returnDate.value = ''
    stopSheetOpen.value = true
    return
  }
  timerBusy.value = true
  try {
    await startTimer(jobId, myAssignment.value.assignmentId)
    timerAssignmentId.value = myAssignment.value.assignmentId
    timerStartedAt.value = new Date()
    job.value = await getJob(jobId)
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Timer action failed')
  } finally {
    timerBusy.value = false
  }
}

async function finishStop(choice: 'done' | 'return' | 'pause') {
  if (!myAssignment.value || timerBusy.value) return
  const options: StopTimerOptions = { notes: stopNotes.value.trim() || undefined }
  if (choice === 'done') options.finishedForToday = true
  if (choice === 'return') {
    options.finishedForToday = true
    if (returnDate.value) options.returnDate = returnDate.value
    else options.returnTomorrow = true
  }
  timerBusy.value = true
  try {
    await stopTimer(jobId, timerAssignmentId.value ?? myAssignment.value.assignmentId, options)
    timerStartedAt.value = null
    timerAssignmentId.value = null
    stopSheetOpen.value = false
    ToastService.success(
      choice === 'return' ? 'Time logged — your next visit is planned' : choice === 'done' ? 'Time logged — finished for today' : 'Time logged',
    )
    job.value = await getJob(jobId)
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
    // Sprint 26
    listAttachments('job', jobId, 'diagnostic_report').then((list) => { reports.value = list }).catch(() => {})
    getJobNotes(jobId).then((list) => { notes.value = list }).catch(() => {})
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
            v-if="mapsUrl && !isOnSite"
            :href="mapsUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 font-medium"
          >
            <MapPin class="w-4 h-4" /> Directions
          </a>
        </div>

        <!-- Sprint 26 — site address for on-site work -->
        <div v-if="isOnSite && job.siteAddress" class="mt-3 p-3 rounded-lg bg-sky-50 dark:bg-sky-900/15 text-sm">
          <p class="text-xs uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-1 flex items-center gap-1"><MapPin class="w-3.5 h-3.5" /> On-site</p>
          <p class="text-slate-800 dark:text-slate-100">{{ [job.siteAddress.street, job.siteAddress.street2, job.siteAddress.city].filter(Boolean).join(', ') }}</p>
          <p class="font-mono font-semibold text-slate-800 dark:text-slate-100">{{ job.siteAddress.postcode }}</p>
          <p v-if="job.siteAddress.contactName || job.siteAddress.contactPhone" class="text-slate-600 dark:text-slate-300 mt-1">
            {{ job.siteAddress.contactName }}
            <a v-if="job.siteAddress.contactPhone" :href="`tel:${job.siteAddress.contactPhone}`" class="text-brand-600 dark:text-brand-400 font-medium ml-1">{{ job.siteAddress.contactPhone }}</a>
          </p>
          <p v-if="job.siteAddress.accessNotes" class="text-slate-600 dark:text-slate-300 mt-1 flex items-start gap-1"><KeyRound class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{{ job.siteAddress.accessNotes }}</p>
          <a
            v-if="mapsUrl"
            :href="mapsUrl"
            target="_blank"
            rel="noopener"
            class="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium"
          ><Navigation class="w-4 h-4" /> Navigate</a>
        </div>

        <!-- Sprint 26 — planned days -->
        <div v-if="myVisits.length" class="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <CalendarDays class="w-3.5 h-3.5" />
          <span v-if="dayLabel" class="font-medium text-slate-700 dark:text-slate-200">{{ dayLabel }}</span>
          <span v-if="nextVisit">· next visit {{ formatDay(nextVisit.visitDate) }}</span>
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

      <!-- Sprint 26 — diagnostic reports (Autel PDF, photos of a printout) -->
      <div class="card !p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-slate-800 dark:text-white">Reports</h2>
          <label
            :class="[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 dark:bg-white/10 text-white text-sm font-medium cursor-pointer transition-colors',
              uploadingReport ? 'opacity-60 pointer-events-none' : '',
            ]"
          >
            <Loader2 v-if="uploadingReport" class="w-4 h-4 animate-spin" />
            <FileText v-else class="w-4 h-4" />
            {{ uploadingReport ? 'Uploading…' : 'Attach report' }}
            <input ref="reportInput" type="file" accept="application/pdf,image/*" class="hidden" @change="onReportPicked" />
          </label>
        </div>
        <ul v-if="reports.length" class="divide-y divide-slate-100 dark:divide-dark-border">
          <li v-for="r in reports" :key="r.id" class="flex items-center gap-3 py-2">
            <FileText class="w-5 h-5 text-brand-500 flex-shrink-0" />
            <button class="flex-1 min-w-0 text-left" @click="openReport(r)">
              <p class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{{ r.fileName }}</p>
              <p class="text-xs text-slate-400">{{ formatSize(r.fileSize) }} · {{ new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }}</p>
            </button>
            <button
              type="button"
              :disabled="deletingReportId === r.id"
              @click="removeReport(r)"
              class="p-1.5 text-slate-300 hover:text-red-500"
              aria-label="Delete report"
            >
              <Loader2 v-if="deletingReportId === r.id" class="w-4 h-4 animate-spin" />
              <Trash2 v-else class="w-4 h-4" />
            </button>
          </li>
        </ul>
        <p v-else class="text-sm text-slate-400">No reports attached. Attach the diagnostic PDF here instead of emailing it to the office.</p>
      </div>

      <!-- Sprint 26 — job notes -->
      <div class="card !p-4 mb-4">
        <h2 class="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><MessageSquare class="w-4 h-4 text-brand-500" /> Notes</h2>
        <ul v-if="notes.length" class="space-y-2 mb-3">
          <li v-for="n in notes" :key="n.id" class="rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-white/5">
            <div class="flex items-center gap-2 mb-0.5 text-xs">
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ n.authorName }}</span>
              <span :class="['px-1.5 py-0.5 rounded-full text-[10px] font-medium', n.source === NoteSource.FIELD ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' : 'bg-slate-200/70 text-slate-600 dark:bg-white/10 dark:text-slate-300']">{{ n.source === NoteSource.FIELD ? 'Field' : 'Office' }}</span>
              <span class="ml-auto text-slate-400">{{ noteWhen(n.createdAt) }}</span>
            </div>
            <p class="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{{ n.body }}</p>
          </li>
        </ul>
        <p v-else class="text-sm text-slate-400 mb-3">No notes yet.</p>
        <div class="flex gap-2">
          <textarea
            v-model="noteDraft"
            rows="2"
            maxlength="2000"
            placeholder="Add a note for the office…"
            class="flex-1 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <UiButton :disabled="!noteDraft.trim() || postingNote" @click="postNote">
            <Loader2 v-if="postingNote" class="w-4 h-4 animate-spin" />
            <Send v-else class="w-4 h-4" />
          </UiButton>
        </div>
      </div>

      <!-- Internal notes -->
      <div v-if="job.internalNotes" class="card !p-4 mb-4">
        <h2 class="font-semibold text-slate-800 dark:text-white mb-2">Internal notes</h2>
        <p class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{{ job.internalNotes }}</p>
      </div>

      <!-- Sprint 26 — stop-timer sheet -->
      <UiModal :open="stopSheetOpen" title="Stop timer" @close="stopSheetOpen = false">
        <div class="space-y-3">
          <p class="text-sm text-slate-600 dark:text-slate-300">{{ elapsed }} on site today. Finished on this job for today?</p>
          <input
            v-model="stopNotes"
            type="text"
            maxlength="500"
            placeholder="What was done (optional)"
            class="w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button :disabled="timerBusy" @click="finishStop('done')" class="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-60">Yes — done for today</button>
          <div class="rounded-xl border border-slate-200 dark:border-dark-border p-3 space-y-2">
            <button :disabled="timerBusy" @click="finishStop('return')" class="w-full py-3 rounded-xl bg-slate-700 dark:bg-white/10 text-white font-semibold disabled:opacity-60">
              Yes — coming back {{ returnDate ? formatDay(returnDate) : 'tomorrow' }}
            </button>
            <label class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              Or pick the day:
              <input v-model="returnDate" type="date" :min="todayIso" class="text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1 text-slate-700 dark:text-slate-200" />
            </label>
          </div>
          <button :disabled="timerBusy" @click="finishStop('pause')" class="w-full py-3 rounded-xl text-slate-600 dark:text-slate-300 font-medium disabled:opacity-60">No — just pausing</button>
        </div>
      </UiModal>

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
