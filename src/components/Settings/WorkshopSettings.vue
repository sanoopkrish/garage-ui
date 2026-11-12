<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { DEFAULT_STATUS_AUTOMATION, getCompanySettings, updateCompanySettings, type StatusAutomationSettings } from '@/api/company.api'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/**
 * Settings → Workshop: how jobs flow through the workshop.
 * Sprint 26 — quote default. Sprint 27 — automatic status rules + planner default hours.
 */
const { hasPermission: canUpdate } = usePermissions('menus.administration.settings.business.update')

const loading = ref(true)
const saving = ref(false)
const quoteRequired = ref(false)
const defaultJobHours = ref(4)
const auto = reactive<StatusAutomationSettings>({ ...DEFAULT_STATUS_AUTOMATION })

/** One row per rule: what triggers it and where the job goes */
const RULES: { key: keyof StatusAutomationSettings; label: string; description: string }[] = [
  { key: 'partsOrdered', label: 'Parts ordered → Parts Ordered', description: 'An approved job moves on when a parts order for it is marked as ordered.' },
  { key: 'inRepairOnTimer', label: 'Timer started → In Repair', description: 'Starting a job timer (workshop or field app) on an approved job starts the repair.' },
  { key: 'inRepairOnFirstTick', label: 'First checklist tick → In Repair', description: 'Ticking the first work item on an approved job starts the repair.' },
  { key: 'inRepairOnPartsReceived', label: 'All parts received → In Repair', description: 'Off by default: parts arriving does not mean someone is working on the car.' },
  { key: 'qualityCheckOnChecklist', label: 'All work items ticked → Quality Check', description: 'When every work item is done the job goes to QC and the QC list appears.' },
  { key: 'completeOnQc', label: 'All QC items ticked → Complete', description: 'Passing the quality check completes the job and emails the customer.' },
  { key: 'completeOnFieldFinish', label: 'Engineer finishes on site → Complete', description: 'On-site jobs: "Job finished" on the engineer\'s stop sheet completes the job; the QC list is ticked by their confirmation.' },
  { key: 'collectedOnSignOff', label: 'Hand over → Collected', description: 'The Hand over button on a complete job records who collected and collects the job.' },
]

const collectedOptions = [
  { value: 'off', label: 'Never — collect by hand' },
  { value: 'b2c', label: 'Private customers only (trade accounts collect on terms)' },
  { value: 'all', label: 'Everyone' },
]

async function load() {
  loading.value = true
  try {
    const settings = await getCompanySettings()
    quoteRequired.value = !!settings.quoteRequired
    defaultJobHours.value = settings.defaultJobHours ?? 4
    Object.assign(auto, DEFAULT_STATUS_AUTOMATION, settings.statusAutomation ?? {})
  } catch {
    ToastService.error('Failed to load workshop settings')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await updateCompanySettings({
      quoteRequired: quoteRequired.value,
      defaultJobHours: Math.max(0.5, Math.min(24, Number(defaultJobHours.value) || 4)),
      statusAutomation: { ...auto, manualHoldMinutes: Math.max(0, Math.min(240, Number(auto.manualHoldMinutes) || 0)) },
    })
    ToastService.success('Workshop settings saved')
  } catch (e: any) {
    const message = e.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to save'))
  } finally {
    saving.value = false
  }
}

onMounted(load)

const inputClass = 'w-24 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60'
</script>

<template>
  <div>
    <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Workshop</h2>
    <p class="text-sm text-slate-500 mb-5">How jobs move from booking to collection.</p>

    <div v-if="loading" class="h-24 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <div v-else class="space-y-8 max-w-2xl">
      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Quotes</p>
        <UiToggle
          v-model="quoteRequired"
          :disabled="!canUpdate"
          label="Jobs need a quote before work starts"
          description="Off: a checked-in job can be approved straight away. On: it must be quoted and the quote accepted first. Individual customers and jobs can override this."
        />
      </div>

      <!-- Sprint 27 — automatic status changes -->
      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Automatic status changes</p>
        <UiToggle
          v-model="auto.enabled"
          :disabled="!canUpdate"
          label="Move jobs along automatically"
          description="Parts arriving, a timer starting, checklists being finished and payments move the job themselves. Switch off to go back to changing every status by hand."
        />
        <div :class="['space-y-3 pl-1 border-l-2 border-slate-100 dark:border-dark-border ml-2', auto.enabled ? '' : 'opacity-50']">
          <div v-for="rule in RULES" :key="rule.key" class="pl-4">
            <UiToggle
              :model-value="auto[rule.key] as boolean"
              :disabled="!canUpdate || !auto.enabled"
              :label="rule.label"
              :description="rule.description"
              @update:model-value="(v) => ((auto as any)[rule.key] = v)"
            />
          </div>
          <div class="pl-4 pt-1">
            <UiSelect
              v-model="auto.collectedOnPayment"
              label="Paid in full → Collected"
              :options="collectedOptions"
              :disabled="!canUpdate || !auto.enabled"
            />
            <p class="text-xs text-slate-400 mt-1">Applies to complete jobs when the last payment settles the invoice. Trade customers usually collect long before they pay.</p>
          </div>
          <div class="pl-4 flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span>After a manual status change, leave the job alone for</span>
            <input v-model.number="auto.manualHoldMinutes" type="number" min="0" max="240" :disabled="!canUpdate || !auto.enabled" :class="inputClass" />
            <span>minutes</span>
          </div>
        </div>
        <p class="text-xs text-slate-400">Automatic changes only ever move a job forward, never touch a collected or cancelled job, and show an <span class="font-semibold">Auto</span> badge on the job's timeline.</p>
      </div>

      <!-- Sprint 27 — planner -->
      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Assignments planner</p>
        <div class="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <span>A job with no approved quoted labour books</span>
          <input v-model.number="defaultJobHours" type="number" min="0.5" max="24" step="0.5" :disabled="!canUpdate" :class="inputClass" />
          <span>hours per day on the planner</span>
        </div>
        <p class="text-xs text-slate-400">Quoted labour is spread over the job's planned days. The capacity bar on each technician's day turns red when booked hours pass the shift length from Working time.</p>
      </div>

      <div v-if="canUpdate" class="pt-2">
        <UiButton :loading="saving" @click="save">Save Changes</UiButton>
      </div>
    </div>
  </div>
</template>
