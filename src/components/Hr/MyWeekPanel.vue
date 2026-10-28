<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronLeft, ChevronRight, Send, Undo2 } from 'lucide-vue-next'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import { getMyTimesheet, submitTimesheet, recallTimesheet, type Timesheet } from '@/api/timesheets.api'
import { TimesheetStatus } from '@/types/generated/enums/hr'
import {
  addDaysIso, attendanceFlagClass, attendanceFlagLabels, dayLabel, h2, timeOf, timesheetStatusLabels, timesheetStatusVariant, weekLabel,
} from '@/utils/hr'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/**
 * "My week" (Sprint 18) — the employee's own timesheet: 7 day rows, totals, submit / recall,
 * previous weeks. Shared by the field app (/field/timesheet) and the desktop page (/hr/my-week).
 */
const sheet = ref<Timesheet | null>(null)
const currentPeriodStart = ref('')
const periodStart = ref<string | undefined>(undefined)
const loading = ref(true)
const busy = ref(false)
const notOnRun = ref(false)

const isCurrentWeek = computed(() => !!sheet.value && sheet.value.periodStart === currentPeriodStart.value)
const canSubmit = computed(() => !!sheet.value && [TimesheetStatus.DRAFT, TimesheetStatus.REJECTED].includes(sheet.value.status))
const hasMissingClockOut = computed(() => sheet.value?.flags.includes('missing_clock_out') ?? false)

function apiError(err: any, fallback: string) {
  const message = err?.response?.data?.message
  ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? fallback))
}

async function load() {
  loading.value = true
  try {
    const result = await getMyTimesheet(periodStart.value)
    sheet.value = result.timesheet
    currentPeriodStart.value = result.currentPeriodStart
    notOnRun.value = !result.timesheet
  } catch (err) {
    apiError(err, 'Failed to load your week')
  } finally {
    loading.value = false
  }
}

function go(weeks: number) {
  const base = sheet.value?.periodStart ?? currentPeriodStart.value
  if (!base) return
  const next = addDaysIso(base, weeks * 7)
  if (next > currentPeriodStart.value) return
  periodStart.value = next
  load()
}

async function handleSubmit() {
  if (!sheet.value) return
  const result = await showConfirmDialog(
    `Submit your timesheet for ${weekLabel(sheet.value.periodStart, sheet.value.periodEnd)} (${h2(sheet.value.totalPaidHours)} hours) for approval?`,
    false, 'Submit',
  )
  if (!result.isConfirmed) return
  busy.value = true
  try {
    sheet.value = await submitTimesheet(sheet.value.id)
    ToastService.success('Timesheet submitted')
  } catch (err) { apiError(err, 'Could not submit') } finally { busy.value = false }
}

async function handleRecall() {
  if (!sheet.value) return
  busy.value = true
  try {
    sheet.value = await recallTimesheet(sheet.value.id)
    ToastService.success('Timesheet recalled — it is a draft again')
  } catch (err) { apiError(err, 'Could not recall') } finally { busy.value = false }
}

onMounted(load)
</script>

<template>
  <div>
    <div v-if="loading && !sheet" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card !p-4 h-16 animate-pulse bg-slate-100 dark:bg-white/5" />
    </div>

    <div v-else-if="notOnRun" class="card text-sm text-slate-500">
      Your account is not on the timesheet run. Ask a manager if you think it should be.
    </div>

    <template v-else-if="sheet">
      <!-- Week navigator -->
      <div class="flex items-center justify-between mb-3">
        <button class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500" aria-label="Previous week" @click="go(-1)"><ChevronLeft class="w-5 h-5" /></button>
        <div class="text-center">
          <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ weekLabel(sheet.periodStart, sheet.periodEnd) }}</p>
          <UiBadge :variant="(timesheetStatusVariant[sheet.status] as any)" dot>{{ timesheetStatusLabels[sheet.status] }}</UiBadge>
        </div>
        <button class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 disabled:opacity-30" :disabled="isCurrentWeek" aria-label="Next week" @click="go(1)"><ChevronRight class="w-5 h-5" /></button>
      </div>

      <p v-if="sheet.status === TimesheetStatus.REJECTED && sheet.rejectionReason" class="mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm px-3 py-2">
        Returned: {{ sheet.rejectionReason }}
      </p>
      <p v-if="hasMissingClockOut && canSubmit" class="mb-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm px-3 py-2">
        A day is missing its clock-out. Ask your manager to correct it before you submit.
      </p>

      <!-- Totals -->
      <div class="grid grid-cols-4 gap-2 mb-3">
        <div class="card !p-3 text-center"><p class="text-[11px] text-slate-400">Attended</p><p class="text-base font-bold text-slate-800 dark:text-white">{{ h2(sheet.attendedHours) }}</p></div>
        <div class="card !p-3 text-center"><p class="text-[11px] text-slate-400">On jobs</p><p class="text-base font-bold text-slate-800 dark:text-white">{{ h2(sheet.jobHours) }}</p></div>
        <div class="card !p-3 text-center"><p class="text-[11px] text-slate-400">Overtime</p><p class="text-base font-bold" :class="sheet.overtimeHours > 0 ? 'text-amber-600' : 'text-slate-800 dark:text-white'">{{ h2(sheet.overtimeHours) }}</p></div>
        <div class="card !p-3 text-center"><p class="text-[11px] text-slate-400">Paid</p><p class="text-base font-bold text-brand-600">{{ h2(sheet.totalPaidHours) }}</p></div>
      </div>

      <!-- Days -->
      <div class="card !p-0 divide-y divide-slate-100 dark:divide-dark-border mb-4">
        <div v-for="line in sheet.lines" :key="line.id" class="px-4 py-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium" :class="line.scheduledHours > 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'">{{ dayLabel(line.workDate) }}</p>
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ h2(line.attendedHours + line.leaveHours + line.sickHours) }} h</p>
          </div>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-slate-400">
            <span v-if="line.firstInAt">{{ timeOf(line.firstInAt) }} – {{ line.lastOutAt ? timeOf(line.lastOutAt) : 'now' }}</span>
            <span v-if="line.breakMinutes">break {{ line.breakMinutes }}m</span>
            <span v-if="line.jobHours">jobs {{ h2(line.jobHours) }}h</span>
            <span v-if="line.leaveHours">leave {{ h2(line.leaveHours) }}h</span>
            <span v-if="line.sickHours">sick {{ h2(line.sickHours) }}h</span>
            <span v-for="flag in line.flags" :key="flag" :class="['px-1.5 py-0.5 rounded-full text-[10px] font-medium', attendanceFlagClass[flag] ?? 'bg-slate-100 text-slate-500']">
              {{ attendanceFlagLabels[flag] ?? flag }}
            </span>
          </div>
          <p v-if="line.note" class="text-xs text-slate-500 mt-1">{{ line.note }}</p>
        </div>
      </div>

      <!-- left-aligned: on the phone the SOS button floats bottom-right -->
      <div class="flex items-center justify-start gap-2">
        <UiButton v-if="sheet.status === TimesheetStatus.SUBMITTED" variant="secondary" :loading="busy" @click="handleRecall"><Undo2 class="w-4 h-4" /> Recall</UiButton>
        <UiButton v-if="canSubmit" :loading="busy" :disabled="hasMissingClockOut" @click="handleSubmit"><Send class="w-4 h-4" /> Submit for approval</UiButton>
      </div>
      <p v-if="canSubmit && isCurrentWeek" class="text-xs text-slate-400 mt-2 pr-16">This week is still in progress — submit once it is complete.</p>
    </template>
  </div>
</template>
