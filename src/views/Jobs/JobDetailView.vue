<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { ArrowLeft, Car, User, ClipboardCheck, KeyRound, StickyNote, History, RotateCcw, Fuel, Sparkles, Loader2 } from 'lucide-vue-next'
import JobQuotesCard from '@/components/Jobs/JobQuotesCard.vue'
import JobInvoiceCard from '@/components/Jobs/JobInvoiceCard.vue'
import JobAssignmentsCard from '@/components/Jobs/JobAssignmentsCard.vue'
import JobChecklistCard from '@/components/Jobs/JobChecklistCard.vue'
import JobAttachmentsCard from '@/components/Jobs/JobAttachmentsCard.vue'
import AiRewriteButton from '@/components/Ui/AiRewriteButton.vue'
import { draftDamageNotes } from '@/api/ai.api'
import { AIFeatureType, useAiFeatures } from '@/composables/useAiFeatures'
import JobDiagnosticsCard from '@/components/Jobs/JobDiagnosticsCard.vue'
import JobPartsCard from '@/components/Jobs/JobPartsCard.vue'
import { createRework } from '@/api/jobs.api'
import { showTextareaDialog } from '@/utils/alert'
import { useJobsStore } from '@/stores/jobs.store'
import { useCrudPermissions, usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { JobStatus, FuelLevel, KeyStatus, RoadTestStatus } from '@/types/generated/enums/job'
import { jobStatusLabels, jobStatusBadgeVariant } from '@/utils/jobStatus'
import type { Job } from '@/api/jobs.api'

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()
const { canUpdate, canCreate } = useCrudPermissions('workshop', 'jobs')
const { hasPermission: canUpdateStatus } = usePermissions('menus.workshop.jobs.updateStatus')
// Parts card reads /parts-orders, which needs stock access (e.g. Accounts has jobs.read but no stock)
const { canRead: canReadParts } = useCrudPermissions('stock', 'inventory')

const job = ref<Job | null>(null)
const loading = ref(true)

const fuelLevelLabels: Record<FuelLevel, string> = {
  [FuelLevel.EMPTY]: 'Empty',
  [FuelLevel.QUARTER]: '1/4',
  [FuelLevel.HALF]: '1/2',
  [FuelLevel.THREE_QUARTERS]: '3/4',
  [FuelLevel.FULL]: 'Full',
}

const roadTestLabels: Record<RoadTestStatus, string> = {
  [RoadTestStatus.NOT_REQUIRED]: 'Not required',
  [RoadTestStatus.REQUIRED]: 'Required',
  [RoadTestStatus.COMPLETED]: 'Completed',
}

function formatDate(dateStr?: string | null, withTime = false): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    })
  } catch {
    return dateStr
  }
}

async function load() {
  try {
    job.value = await jobsStore.getJob(route.params.id as string)
  } catch {
    ToastService.error('Failed to load job')
    router.push('/jobs')
  } finally {
    loading.value = false
  }
}

// ── Status transition ─────────────────────────────────────────────────────────
const showStatusModal = ref(false)
const statusForm = reactive({ status: '' as '' | JobStatus, note: '' })
const statusSubmitting = ref(false)

const transitionOptions = computed(() =>
  (job.value?.allowedTransitions ?? []).map((s) => ({ value: s, label: jobStatusLabels[s] })),
)

function openStatusModal() {
  statusForm.status = job.value?.allowedTransitions?.[0] ?? ''
  statusForm.note = ''
  showStatusModal.value = true
}

async function submitStatus() {
  if (!job.value || !statusForm.status) return
  statusSubmitting.value = true
  try {
    job.value = await jobsStore.updateStatus(job.value.id, statusForm.status, statusForm.note.trim() || undefined)
    ToastService.success(`Job moved to ${jobStatusLabels[statusForm.status]}`)
    showStatusModal.value = false
  } catch (err: any) {
    const message = err?.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to update status'))
  } finally {
    statusSubmitting.value = false
  }
}

async function raiseRework() {
  const result = await showTextareaDialog('Create Rework Job', 'Customer complaint', 'What has the customer reported?', true, 'Create Rework')
  if (!result.isConfirmed || !result.value?.trim()) return
  try {
    const rework = await createRework(route.params.id as string, result.value.trim())
    ToastService.success(`Rework ${rework.jobNumber} created`)
    router.push(`/jobs/${rework.id}`)
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not create the rework job')
  }
}

// ── Notes ─────────────────────────────────────────────────────────────────────
const editingNotes = ref(false)
const notesForm = reactive({ customerNotes: '', internalNotes: '', onBehalfOf: '' })
const notesSubmitting = ref(false)

function startEditNotes() {
  notesForm.customerNotes = job.value?.customerNotes ?? ''
  notesForm.internalNotes = job.value?.internalNotes ?? ''
  notesForm.onBehalfOf = job.value?.onBehalfOf ?? ''
  editingNotes.value = true
}

async function saveNotes() {
  if (!job.value) return
  notesSubmitting.value = true
  try {
    job.value = await jobsStore.updateJob(job.value.id, {
      customerNotes: notesForm.customerNotes.trim() || undefined,
      internalNotes: notesForm.internalNotes.trim() || undefined,
      onBehalfOf: notesForm.onBehalfOf.trim() || undefined,
    })
    ToastService.success('Notes saved')
    editingNotes.value = false
  } catch {
    ToastService.error('Failed to save notes')
  } finally {
    notesSubmitting.value = false
  }
}

// ── Check-in ──────────────────────────────────────────────────────────────────
const showCheckinModal = ref(false)
const checkinSubmitting = ref(false)

const checkinForm = reactive({
  fuelLevel: FuelLevel.HALF as FuelLevel,
  mileage: '',
  bodyworkNotes: '',
  sundryNotes: '',
  keyTagNumber: '',
  lockBoxLocation: '',
  roadTest: RoadTestStatus.NOT_REQUIRED as RoadTestStatus,
})

const checkinErrors = reactive({ mileage: '' })

const canCheckin = computed(() =>
  !!job.value && !job.value.checkin && (job.value.allowedTransitions ?? []).includes(JobStatus.CHECKED_IN),
)

const fuelOptions = Object.values(FuelLevel).map((f) => ({ value: f, label: fuelLevelLabels[f] }))
const roadTestOptions = Object.values(RoadTestStatus).map((r) => ({ value: r, label: roadTestLabels[r] }))

// AI damage-notes draft from arrival/check-in photos (review before saving)
const { hasFeature } = useAiFeatures()
const draftingDamage = ref(false)

async function draftDamage() {
  if (!job.value) return
  draftingDamage.value = true
  try {
    const result = await draftDamageNotes(job.value.id)
    checkinForm.bodyworkNotes = checkinForm.bodyworkNotes.trim()
      ? `${checkinForm.bodyworkNotes}\n${result.draft}`
      : result.draft
    ToastService.success(`Drafted from ${result.photosUsed} photo${result.photosUsed === 1 ? '' : 's'} — review before saving`)
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not draft damage notes')
  } finally {
    draftingDamage.value = false
  }
}

function openCheckinModal() {
  checkinForm.fuelLevel = FuelLevel.HALF
  checkinForm.mileage = ''
  checkinForm.bodyworkNotes = ''
  checkinForm.sundryNotes = ''
  checkinForm.keyTagNumber = ''
  checkinForm.lockBoxLocation = ''
  checkinForm.roadTest = RoadTestStatus.NOT_REQUIRED
  checkinErrors.mileage = ''
  showCheckinModal.value = true
}

async function submitCheckin() {
  if (!job.value) return
  checkinErrors.mileage = checkinForm.mileage !== '' ? '' : 'Mileage is required'
  if (checkinErrors.mileage) return

  checkinSubmitting.value = true
  try {
    job.value = await jobsStore.createCheckin(job.value.id, {
      fuelLevel: checkinForm.fuelLevel,
      mileage: Number(checkinForm.mileage),
      bodyworkNotes: checkinForm.bodyworkNotes.trim() || undefined,
      sundryNotes: checkinForm.sundryNotes.trim() || undefined,
      keyTagNumber: checkinForm.keyTagNumber.trim() || undefined,
      lockBoxLocation: checkinForm.lockBoxLocation.trim() || undefined,
      roadTest: checkinForm.roadTest,
    })
    ToastService.success('Vehicle checked in')
    showCheckinModal.value = false
  } catch (err: any) {
    const message = err?.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to check in'))
  } finally {
    checkinSubmitting.value = false
  }
}

async function toggleKeyStatus() {
  if (!job.value?.checkin) return
  const next = job.value.checkin.keyStatus === KeyStatus.IN_WORKSHOP ? KeyStatus.RETURNED : KeyStatus.IN_WORKSHOP
  try {
    job.value = await jobsStore.updateCheckin(job.value.id, { keyStatus: next })
    ToastService.success(next === KeyStatus.RETURNED ? 'Keys returned to customer' : 'Keys in workshop')
  } catch {
    ToastService.error('Failed to update key status')
  }
}

async function updateRoadTest(value: RoadTestStatus) {
  if (!job.value?.checkin) return
  try {
    job.value = await jobsStore.updateCheckin(job.value.id, { roadTest: value })
    ToastService.success('Road test updated')
  } catch {
    ToastService.error('Failed to update road test')
  }
}

onMounted(load)
</script>

<template>
  <DefaultLayout>
    <div class="flex items-center justify-between mb-6">
      <button @click="router.back()" class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft class="w-4 h-4" /> Back to Jobs
      </button>
      <div class="flex items-center gap-2">
        <UiButton
          v-if="canCreate && job && ['complete', 'collected'].includes(job.status)"
          variant="secondary"
          @click="raiseRework"
        >
          <RotateCcw class="w-4 h-4" /> Create Rework Job
        </UiButton>
        <UiButton v-if="canCheckin && canUpdate" variant="secondary" @click="openCheckinModal">
          <ClipboardCheck class="w-4 h-4" /> Check In Vehicle
        </UiButton>
        <UiButton v-if="canUpdateStatus && (job?.allowedTransitions?.length ?? 0) > 0" @click="openStatusModal">
          Move to next status
        </UiButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 xl:grid-cols-3 gap-5 animate-pulse">
      <div class="card h-56 bg-slate-100 dark:bg-white/5" />
      <div class="xl:col-span-2 card h-56 bg-slate-100 dark:bg-white/5" />
    </div>

    <div v-else-if="job" class="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <!-- Left column -->
      <div class="space-y-5">
        <!-- Job header card -->
        <div class="card">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h1 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ job.jobNumber }}</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ job.description }}</p>
            </div>
            <UiBadge :variant="(jobStatusBadgeVariant[job.status] as any)" dot>{{ jobStatusLabels[job.status] }}</UiBadge>
          </div>
          <div v-if="job.isRework" class="mb-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
            <RotateCcw class="w-3.5 h-3.5 flex-shrink-0" />
            Rework<template v-if="job.originalJobId"> — <router-link :to="`/jobs/${job.originalJobId}`" class="underline">original job</router-link></template>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-slate-400">Created</span><span class="text-slate-700 dark:text-slate-200">{{ formatDate(job.createdAt) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Due</span><span class="text-slate-700 dark:text-slate-200">{{ formatDate(job.dueDate) }}</span></div>
            <div v-if="job.completedAt" class="flex justify-between"><span class="text-slate-400">Completed</span><span class="text-green-600">{{ formatDate(job.completedAt, true) }}</span></div>
            <div v-if="job.collectedAt" class="flex justify-between"><span class="text-slate-400">Collected</span><span class="text-green-600">{{ formatDate(job.collectedAt, true) }}</span></div>
          </div>
        </div>

        <!-- Customer & vehicle -->
        <div class="card space-y-3">
          <router-link :to="`/customers/${job.customerId}`" class="flex items-center gap-3 group">
            <div class="w-9 h-9 bg-brand-100 dark:bg-brand-900/20 rounded-lg flex items-center justify-center"><User class="w-4 h-4 text-brand-600" /></div>
            <div>
              <p class="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-brand-600">{{ job.customerName ?? 'Customer' }}</p>
              <p class="text-xs text-slate-400">Bill-to customer</p>
            </div>
          </router-link>
          <router-link :to="`/vehicles/${job.vehicleId}`" class="flex items-center gap-3 group">
            <div class="w-9 h-9 bg-slate-100 dark:bg-dark-surface rounded-lg flex items-center justify-center"><Car class="w-4 h-4 text-slate-500" /></div>
            <div>
              <p class="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-brand-600">{{ job.vehicleLabel ?? 'Vehicle' }}</p>
              <p class="text-xs font-mono text-slate-400">{{ job.vehicleRegistration }}</p>
            </div>
          </router-link>
        </div>

        <!-- Technicians (Module 7) -->
        <JobAssignmentsCard :job="job" @updated="(j) => (job = j)" />

        <!-- Field/QC checklist (Module 8) -->
        <JobChecklistCard :jobId="(route.params.id as string)" :jobStatus="job?.status" />

        <!-- Photos & files (arrival/WIP/completion photos incl. field uploads, documents) -->
        <JobAttachmentsCard :jobId="(route.params.id as string)" />

        <!-- Parts orders (Module 6) -->
        <JobPartsCard v-if="canReadParts" :jobId="(route.params.id as string)" />

        <!-- Diagnostics: fault codes + reports + ADAS certificate (Module 4) -->
        <JobDiagnosticsCard
          :jobId="(route.params.id as string)"
          :jobNumber="job?.jobNumber"
          :showCertificate="['quality_check', 'complete', 'collected'].includes(job?.status ?? '')"
        />

        <!-- Check-in card -->
        <div class="card">
          <div class="flex items-center gap-2 mb-3">
            <ClipboardCheck class="w-4 h-4 text-brand-500" />
            <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Vehicle Check-in</h2>
          </div>
          <p v-if="!job.checkin" class="text-sm text-slate-400">Not checked in yet.</p>
          <div v-else class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-slate-400 flex items-center gap-1"><Fuel class="w-3.5 h-3.5" /> Fuel</span><span class="font-medium text-slate-700 dark:text-slate-200">{{ fuelLevelLabels[job.checkin.fuelLevel] }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Mileage</span><span class="font-medium text-slate-700 dark:text-slate-200">{{ job.checkin.mileage.toLocaleString('en-GB') }} mi</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Checked in</span><span class="text-slate-700 dark:text-slate-200">{{ formatDate(job.checkin.checkedInAt, true) }}</span></div>
            <div v-if="job.checkin.bodyworkNotes" class="pt-1">
              <p class="text-xs text-slate-400 mb-0.5">Bodywork / damage</p>
              <p class="text-slate-600 dark:text-slate-300">{{ job.checkin.bodyworkNotes }}</p>
            </div>
            <div v-if="job.checkin.sundryNotes" class="pt-1">
              <p class="text-xs text-slate-400 mb-0.5">Sundries</p>
              <p class="text-slate-600 dark:text-slate-300">{{ job.checkin.sundryNotes }}</p>
            </div>

            <!-- Key tracking -->
            <div class="pt-2 border-t border-slate-100 dark:border-dark-border">
              <div class="flex items-center justify-between">
                <span class="text-slate-400 flex items-center gap-1"><KeyRound class="w-3.5 h-3.5" /> Keys</span>
                <div class="flex items-center gap-2">
                  <UiBadge :variant="job.checkin.keyStatus === KeyStatus.IN_WORKSHOP ? 'progress' : 'done'" dot>
                    {{ job.checkin.keyStatus === KeyStatus.IN_WORKSHOP ? 'In workshop' : 'Returned' }}
                  </UiBadge>
                  <button v-if="canUpdate" @click="toggleKeyStatus" class="text-xs text-brand-600 hover:underline">toggle</button>
                </div>
              </div>
              <p v-if="job.checkin.keyTagNumber || job.checkin.lockBoxLocation" class="text-xs text-slate-400 mt-1">
                <template v-if="job.checkin.keyTagNumber">Tag {{ job.checkin.keyTagNumber }}</template>
                <template v-if="job.checkin.lockBoxLocation"> · Box {{ job.checkin.lockBoxLocation }}</template>
              </p>
            </div>

            <!-- Road test -->
            <div class="flex items-center justify-between pt-1">
              <span class="text-slate-400">Road test</span>
              <select
                v-if="canUpdate"
                :value="job.checkin.roadTest"
                @change="updateRoadTest(($event.target as HTMLSelectElement).value as RoadTestStatus)"
                class="text-xs border border-slate-200 dark:border-dark-border rounded-lg px-2 py-1 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-200"
              >
                <option v-for="o in roadTestOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <span v-else class="text-slate-700 dark:text-slate-200">{{ roadTestLabels[job.checkin.roadTest] }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="xl:col-span-2 space-y-5">
        <!-- Notes -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <StickyNote class="w-4 h-4 text-brand-500" />
              <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Notes</h2>
            </div>
            <UiButton v-if="canUpdate && !editingNotes" variant="secondary" @click="startEditNotes">Edit</UiButton>
          </div>

          <div v-if="!editingNotes && job.onBehalfOf" class="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-white/5">
            <p class="text-xs font-semibold text-slate-400 uppercase mb-1">Work carried out on behalf of</p>
            <p class="text-sm text-slate-600 dark:text-slate-300">{{ job.onBehalfOf }}</p>
          </div>

          <div v-if="!editingNotes" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-3 rounded-lg bg-slate-50 dark:bg-white/5">
              <p class="text-xs font-semibold text-slate-400 uppercase mb-1.5">Customer-facing / billable</p>
              <p class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{{ job.customerNotes || '—' }}</p>
            </div>
            <div class="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
              <p class="text-xs font-semibold text-amber-500 uppercase mb-1.5">Internal — staff only</p>
              <p class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{{ job.internalNotes || '—' }}</p>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-sm font-medium text-slate-600 dark:text-slate-300">Customer-facing / billable notes</label>
                <AiRewriteButton
                  :text="notesForm.customerNotes"
                  context="Customer-facing notes on a vehicle repair job card"
                  @accept="(draft) => (notesForm.customerNotes = draft)"
                />
              </div>
              <textarea v-model="notesForm.customerNotes" rows="3" class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">On behalf of — end customer / vehicle owner (B2B jobs, appears on the ADAS certificate)</label>
              <input v-model="notesForm.onBehalfOf" type="text" maxlength="200" class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Internal notes (never shown to customers)</label>
              <textarea v-model="notesForm.internalNotes" rows="3" class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div class="flex justify-end gap-2">
              <UiButton variant="ghost" @click="editingNotes = false">Cancel</UiButton>
              <UiButton :loading="notesSubmitting" @click="saveNotes">Save Notes</UiButton>
            </div>
          </div>
        </div>

        <!-- Quotes (Module 5) -->
        <JobQuotesCard :jobId="(route.params.id as string)" @changed="load" />

        <!-- Invoices (Module 9) -->
        <JobInvoiceCard :jobId="(route.params.id as string)" :customerId="job.customerId" @changed="load" />

        <!-- Timeline -->
        <div class="card">
          <div class="flex items-center gap-2 mb-4">
            <History class="w-4 h-4 text-brand-500" />
            <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Timeline</h2>
          </div>
          <p v-if="!job.statusHistory?.length" class="text-sm text-slate-400">No status changes yet.</p>
          <ol v-else class="relative border-l border-slate-200 dark:border-dark-border ml-2 space-y-5">
            <li v-for="entry in job.statusHistory" :key="entry.id" class="ml-5">
              <span class="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-brand-500" />
              <div class="flex flex-wrap items-center gap-2">
                <UiBadge :variant="(jobStatusBadgeVariant[entry.toStatus] as any)" dot>{{ jobStatusLabels[entry.toStatus] }}</UiBadge>
                <span v-if="entry.fromStatus" class="text-xs text-slate-400">from {{ jobStatusLabels[entry.fromStatus] }}</span>
                <span class="text-xs text-slate-400 ml-auto">{{ formatDate(entry.changedAt, true) }}<template v-if="entry.changedBy"> · {{ entry.changedBy }}</template></span>
              </div>
              <p v-if="entry.note" class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ entry.note }}</p>
            </li>
          </ol>
        </div>
      </div>
    </div>

    <!-- Status transition modal -->
    <UiModal :open="showStatusModal" title="Update Job Status" @close="showStatusModal = false">
      <div class="space-y-4">
        <p class="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          Current status:
          <UiBadge v-if="job" :variant="(jobStatusBadgeVariant[job.status] as any)" dot>{{ jobStatusLabels[job.status] }}</UiBadge>
        </p>
        <UiSelect v-model="statusForm.status" label="Move to" :options="transitionOptions" required />
        <UiInput v-model="statusForm.note" label="Note (optional)" placeholder="e.g. Customer confirmed by phone" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showStatusModal = false">Cancel</UiButton>
        <UiButton :loading="statusSubmitting" @click="submitStatus">Update Status</UiButton>
      </template>
    </UiModal>

    <!-- Check-in modal -->
    <UiModal :open="showCheckinModal" title="Vehicle Check-in" @close="showCheckinModal = false">
      <form @submit.prevent="submitCheckin" class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-4">
          <UiSelect v-model="checkinForm.fuelLevel" label="Fuel Level" :options="fuelOptions" required />
          <UiInput v-model="checkinForm.mileage" label="Mileage" type="number" placeholder="42000" required :error="checkinErrors.mileage" />
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-sm font-medium text-slate-600 dark:text-slate-300">Bodywork marks / damage</label>
            <button
              v-if="hasFeature(AIFeatureType.PHOTO_DAMAGE_NOTES)"
              type="button"
              :disabled="draftingDamage"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-brand-600 border border-brand-200 dark:border-brand-500/30 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors disabled:opacity-50"
              @click="draftDamage"
            >
              <Loader2 v-if="draftingDamage" class="w-3.5 h-3.5 animate-spin" />
              <Sparkles v-else class="w-3.5 h-3.5" />
              {{ draftingDamage ? 'Analysing photos…' : 'Draft from photos' }}
            </button>
          </div>
          <textarea v-model="checkinForm.bodyworkNotes" rows="2" placeholder="Scratch on rear bumper, stone chip on bonnet..." class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <UiInput v-model="checkinForm.sundryNotes" label="Sundry notes" placeholder="Items left in vehicle, etc." />
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="checkinForm.keyTagNumber" label="Key Tag No" placeholder="e.g. 14" />
          <UiInput v-model="checkinForm.lockBoxLocation" label="Lock Box" placeholder="e.g. B3" />
        </div>
        <UiSelect v-model="checkinForm.roadTest" label="Road Test" :options="roadTestOptions" />
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="showCheckinModal = false">Cancel</UiButton>
        <UiButton :loading="checkinSubmitting" @click="submitCheckin">Check In</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
