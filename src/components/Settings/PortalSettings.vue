<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { RotateCcw, Loader2 } from 'lucide-vue-next'
import { DEFAULT_PORTAL_SETTINGS, getCompanySettings, updateCompanySettings, type PortalSettings } from '@/api/company.api'
import { JobStatus } from '@/types/generated/enums/job'
import { jobStatusLabels } from '@/utils/jobStatus'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/**
 * Settings → Portal (Sprint 29): switch the customer portal on, choose what customers see,
 * how sign-in links go out, which files are shared automatically, and the words customers
 * read for each job status.
 */
const { hasPermission: canUpdate } = usePermissions('menus.administration.settings.business.update')

const loading = ref(true)
const saving = ref(false)
const s = reactive<PortalSettings>(JSON.parse(JSON.stringify(DEFAULT_PORTAL_SETTINGS)))

const FEATURES: { key: keyof PortalSettings['features']; label: string; description: string; soon?: string }[] = [
  { key: 'jobStatus', label: 'Job progress', description: 'Customers see each job\'s stage in plain words, visit dates and what happens next.' },
  { key: 'documents', label: 'Shared photos and documents', description: 'Files you tick "Share with customer" on the job, plus anything in the automatic list below.' },
  { key: 'messages', label: 'Messages', description: 'Customers can ask a question on a job; the Workshop Manager and Receptionist are notified and reply from the job page.' },
  { key: 'quotes', label: 'Quote approval online', description: 'Approve or decline quote lines in the portal.', soon: 'Sprint 30' },
  { key: 'invoices', label: 'Invoices and statements', description: 'Download invoices, credit notes and statements; "I\'ve paid this".', soon: 'Sprint 30' },
  { key: 'booking', label: 'Online booking', description: 'Book a job with a damage body map and preferred dates.', soon: 'Sprint 31' },
]

const linkChannelOptions = [
  { value: 'auto', label: 'Automatic — text for private customers with a mobile (when SMS is on), email otherwise' },
  { value: 'email', label: 'Always email' },
  { value: 'sms', label: 'Always text message (falls back to email when there is no mobile)' },
]

const SHARE_CATEGORIES = [
  { value: 'certificate', label: 'ADAS / calibration certificates' },
  { value: 'diagnostic_report', label: 'Diagnostic reports' },
  { value: 'completion_photo', label: 'Completion photos' },
  { value: 'wip_photo', label: 'Work-in-progress photos' },
  { value: 'arrival_photo', label: 'Arrival photos' },
  { value: 'checkin_photo', label: 'Check-in photos' },
  { value: 'document', label: 'Other documents' },
]

/** One row per internal status, in process order; quoted and awaiting authorisation share a phrase by default */
const STATUSES: JobStatus[] = [
  JobStatus.ENQUIRY, JobStatus.BOOKED, JobStatus.CHECKED_IN, JobStatus.DIAGNOSIS, JobStatus.QUOTED, JobStatus.AWAITING_AUTHORISATION,
  JobStatus.APPROVED, JobStatus.PARTS_ORDERED, JobStatus.IN_REPAIR, JobStatus.QUALITY_CHECK, JobStatus.COMPLETE, JobStatus.COLLECTED, JobStatus.CANCELLED,
]

const changedWording = computed(() => STATUSES.filter((st) => (s.statusWording[st] ?? '') !== DEFAULT_PORTAL_SETTINGS.statusWording[st]).length)

function toggleShare(value: string, on: boolean) {
  const set = new Set(s.autoShareCategories)
  if (on) set.add(value); else set.delete(value)
  s.autoShareCategories = [...set]
}

function resetWording() {
  s.statusWording = { ...DEFAULT_PORTAL_SETTINGS.statusWording }
}

async function load() {
  loading.value = true
  try {
    const settings = await getCompanySettings()
    const p = settings.portal as Partial<PortalSettings> | undefined
    Object.assign(s, JSON.parse(JSON.stringify(DEFAULT_PORTAL_SETTINGS)), p ?? {}, {
      features: { ...DEFAULT_PORTAL_SETTINGS.features, ...(p?.features ?? {}) },
      statusWording: { ...DEFAULT_PORTAL_SETTINGS.statusWording, ...(p?.statusWording ?? {}) },
    })
  } catch {
    ToastService.error('Failed to load portal settings')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await updateCompanySettings({
      portal: {
        enabled: s.enabled,
        features: { ...s.features },
        welcomeText: s.welcomeText.trim().slice(0, 500),
        linkChannel: s.linkChannel,
        autoShareCategories: [...s.autoShareCategories],
        quoteApproverRoles: [...s.quoteApproverRoles],
        statusWording: Object.fromEntries(STATUSES.map((st) => [st, (s.statusWording[st] ?? '').trim() || DEFAULT_PORTAL_SETTINGS.statusWording[st]])),
        sessionDays: Math.max(1, Math.min(90, Number(s.sessionDays) || 30)),
        messageWindowDays: Math.max(0, Math.min(365, Number(s.messageWindowDays) || 0)),
      },
    })
    ToastService.success('Portal settings saved')
  } catch (e: any) {
    const message = e.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to save'))
  } finally {
    saving.value = false
  }
}

onMounted(load)

const inputClass = 'text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60'
</script>

<template>
  <div>
    <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Customer portal</h2>
    <p class="text-sm text-slate-500 mb-5">What your customers can see and do online, under your own logo and colour.</p>

    <div v-if="loading" class="h-24 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <div v-else class="space-y-8 max-w-2xl">
      <div class="space-y-3">
        <UiToggle
          v-model="s.enabled"
          :disabled="!canUpdate"
          label="Customer portal on"
          description="Off: sign-in links stop working and the portal shows 'not available yet'. On: contacts listed on each customer record can sign in."
        />
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Welcome text (shown on the portal home page)</label>
          <textarea v-model="s.welcomeText" rows="2" maxlength="500" :disabled="!canUpdate" :class="[inputClass, 'w-full']" placeholder="Welcome! Here you can follow your vehicle's progress and message the workshop." />
        </div>
      </div>

      <div class="space-y-3" :class="s.enabled ? '' : 'opacity-50'">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">What customers can do</p>
        <div v-for="f in FEATURES" :key="f.key" class="flex items-start gap-2">
          <UiToggle
            :model-value="s.features[f.key]"
            :disabled="!canUpdate || !s.enabled || !!f.soon"
            :label="f.label"
            :description="f.description"
            @update:model-value="(v) => (s.features[f.key] = v)"
          />
          <span v-if="f.soon" class="mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400 whitespace-nowrap">Coming in {{ f.soon }}</span>
        </div>
      </div>

      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sign-in</p>
        <UiSelect v-model="s.linkChannel" label="How sign-in links are sent" :options="linkChannelOptions" :disabled="!canUpdate" />
        <div class="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <span>Stay signed in on a device for</span>
          <input v-model.number="s.sessionDays" type="number" min="1" max="90" :disabled="!canUpdate" :class="[inputClass, 'w-20']" />
          <span>days</span>
        </div>
        <p class="text-xs text-slate-400">Links work once and expire after 15 minutes. Trade contacts can also be invited to set a password from the customer record.</p>
      </div>

      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Shared automatically</p>
        <p class="text-xs text-slate-400">Files in these categories are visible to the customer as soon as they are uploaded. Everything else stays private until someone ticks "Share with customer" on the job.</p>
        <div class="grid sm:grid-cols-2 gap-2">
          <UiToggle
            v-for="c in SHARE_CATEGORIES"
            :key="c.value"
            :model-value="s.autoShareCategories.includes(c.value)"
            :disabled="!canUpdate"
            :label="c.label"
            @update:model-value="(v) => toggleShare(c.value, v)"
          />
        </div>
      </div>

      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Messages</p>
        <div class="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <span>Customers can still message on a collected or cancelled job for</span>
          <input v-model.number="s.messageWindowDays" type="number" min="0" max="365" :disabled="!canUpdate" :class="[inputClass, 'w-20']" />
          <span>days</span>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Status wording <span v-if="changedWording" class="normal-case tracking-normal text-slate-400">· {{ changedWording }} changed</span></p>
          <button v-if="canUpdate && changedWording" type="button" class="text-xs text-slate-500 hover:text-brand-500 inline-flex items-center gap-1" @click="resetWording"><RotateCcw class="w-3 h-3" /> Reset to defaults</button>
        </div>
        <p class="text-xs text-slate-400">What the customer reads for each internal status. Keep it short and friendly.</p>
        <div class="rounded-lg border border-slate-200 dark:border-dark-border divide-y divide-slate-100 dark:divide-dark-border">
          <div v-for="st in STATUSES" :key="st" class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-center gap-3 px-3 py-1.5">
            <span class="text-sm text-slate-600 dark:text-slate-300 truncate">{{ jobStatusLabels[st] ?? st }}</span>
            <input v-model="s.statusWording[st]" type="text" maxlength="60" :disabled="!canUpdate" :class="[inputClass, 'w-full']" :placeholder="DEFAULT_PORTAL_SETTINGS.statusWording[st]" />
          </div>
        </div>
      </div>

      <div v-if="canUpdate" class="flex justify-end">
        <UiButton :disabled="saving" @click="save">
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
          Save portal settings
        </UiButton>
      </div>
    </div>
  </div>
</template>
