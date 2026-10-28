<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import { ArrowLeft, Check, X, RotateCcw, Send, Undo2 } from 'lucide-vue-next'
import { useTimesheetsStore } from '@/stores/timesheets.store'
import type { TimesheetLine } from '@/api/timesheets.api'
import { TimesheetStatus } from '@/types/generated/enums/hr'
import {
  attendanceFlagClass, attendanceFlagLabels, dayLabel, h2, timeOf, timesheetStatusLabels, timesheetStatusVariant, weekLabel,
} from '@/utils/hr'
import { usePermissions } from '@/composables/usePermissions'
import { useAuthStore } from '@/stores/auth'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/**
 * Timesheet detail (Sprint 18) — dedicated page: header + summary stats + 7-day grid.
 * Structure ported from psa-ui TimesheetDetailView / TimesheetGrid; here the hours come from
 * attendance, so the only editable cells are the manager's leave / sick hours and day note.
 */
const route = useRoute()
const router = useRouter()
const store = useTimesheetsStore()
const authStore = useAuthStore()
const { hasPermission: canApprove } = usePermissions('menus.hr.timesheets.approve')
const { hasPermission: canReopen } = usePermissions('menus.hr.timesheets.reopen')

const loading = ref(true)
const busy = ref(false)
const sheet = computed(() => store.item)
const isOwner = computed(() => !!sheet.value && sheet.value.userId === (authStore.user as any)?.id)
const editable = computed(() => canApprove.value && !!sheet.value
  && [TimesheetStatus.DRAFT, TimesheetStatus.SUBMITTED, TimesheetStatus.REJECTED].includes(sheet.value.status))
const showApproval = computed(() => canApprove.value && !isOwner.value && sheet.value?.status === TimesheetStatus.SUBMITTED)
const isLocked = computed(() => !!sheet.value && [TimesheetStatus.LOCKED, TimesheetStatus.APPROVED].includes(sheet.value.status))

async function act(fn: () => Promise<unknown>, success: string) {
  busy.value = true
  try {
    await fn()
    ToastService.success(success)
  } catch {
    ToastService.error(store.error ?? 'Something went wrong')
  } finally {
    busy.value = false
  }
}

// ── Day editing (blur-save, like the PSA grid) ────────────────────────────────
const drafts = reactive<Record<string, { leaveHours: string; sickHours: string; note: string }>>({})
function draftFor(line: TimesheetLine) {
  if (!drafts[line.id]) drafts[line.id] = { leaveHours: String(line.leaveHours || ''), sickHours: String(line.sickHours || ''), note: line.note ?? '' }
  return drafts[line.id]
}
async function saveLine(line: TimesheetLine) {
  if (!sheet.value) return
  const d = draftFor(line)
  const leaveHours = Number(d.leaveHours) || 0
  const sickHours = Number(d.sickHours) || 0
  const note = d.note.trim()
  if (leaveHours === Number(line.leaveHours) && sickHours === Number(line.sickHours) && note === (line.note ?? '')) return
  try {
    await store.updateLine(sheet.value.id, line.id, { leaveHours, sickHours, note })
    ToastService.success(`${dayLabel(line.workDate)} saved`)
  } catch {
    ToastService.error(store.error ?? 'Failed to save the day')
    delete drafts[line.id]
  }
}

async function handleApprove() {
  if (!sheet.value) return
  const result = await showConfirmDialog(`Approve ${sheet.value.employeeName}'s timesheet (${h2(sheet.value.totalPaidHours)} hours)? The week locks once approved.`, false, 'Approve')
  if (result.isConfirmed) await act(() => store.approve(sheet.value!.id), 'Timesheet approved and locked')
}

// reason modal shared by reject + reopen
const reasonFor = ref<'reject' | 'reopen' | null>(null)
const reason = ref('')
async function submitReason() {
  if (!sheet.value || reason.value.trim().length < 3 || !reasonFor.value) return
  const id = sheet.value.id
  const text = reason.value.trim()
  if (reasonFor.value === 'reject') await act(() => store.reject(id, text), 'Timesheet returned to the employee')
  else await act(() => store.reopen(id, text), 'Timesheet reopened as a draft')
  reasonFor.value = null
  Object.keys(drafts).forEach((k) => delete drafts[k])
}

async function handleSubmit() {
  if (!sheet.value) return
  const result = await showConfirmDialog('Submit this timesheet for approval?', false, 'Submit')
  if (result.isConfirmed) await act(() => store.submit(sheet.value!.id), 'Timesheet submitted')
}

onMounted(async () => {
  try {
    await store.fetchTimesheet(route.params.id as string)
  } catch {
    ToastService.error(store.error ?? 'Failed to load timesheet')
    router.push('/hr/timesheets')
  } finally {
    loading.value = false
  }
})

const inputClass = 'w-16 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-400'
</script>

<template>
  <DefaultLayout>
    <div class="flex items-center justify-between mb-6">
      <button class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" @click="router.push('/hr/timesheets')">
        <ArrowLeft class="w-4 h-4" /> Back to Timesheets
      </button>
      <div v-if="sheet" class="flex items-center gap-2">
        <UiButton v-if="isOwner && [TimesheetStatus.DRAFT, TimesheetStatus.REJECTED].includes(sheet.status)" :loading="busy" @click="handleSubmit"><Send class="w-4 h-4" /> Submit</UiButton>
        <UiButton v-if="isOwner && sheet.status === TimesheetStatus.SUBMITTED" variant="secondary" :loading="busy" @click="act(() => store.recall(sheet!.id), 'Timesheet recalled')"><Undo2 class="w-4 h-4" /> Recall</UiButton>
        <UiButton v-if="showApproval" :loading="busy" @click="handleApprove"><Check class="w-4 h-4" /> Approve</UiButton>
        <UiButton v-if="showApproval" variant="danger" :disabled="busy" @click="reasonFor = 'reject'; reason = ''"><X class="w-4 h-4" /> Reject</UiButton>
        <UiButton v-if="canReopen && isLocked" variant="secondary" :disabled="busy" @click="reasonFor = 'reopen'; reason = ''"><RotateCcw class="w-4 h-4" /> Reopen</UiButton>
      </div>
    </div>

    <div v-if="loading" class="card h-64 animate-pulse bg-slate-100 dark:bg-white/5" />

    <template v-else-if="sheet">
      <div class="card mb-5">
        <div class="flex flex-wrap items-center gap-3 mb-1">
          <h1 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ sheet.employeeName }}</h1>
          <UiBadge :variant="(timesheetStatusVariant[sheet.status] as any)" dot>{{ timesheetStatusLabels[sheet.status] }}</UiBadge>
        </div>
        <p class="text-sm text-slate-500">
          {{ weekLabel(sheet.periodStart, sheet.periodEnd) }} · contracted {{ h2(sheet.contractedHours) }} h/week
          <template v-if="sheet.submittedAt"> · submitted {{ new Date(sheet.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }}</template>
        </p>

        <div class="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3"><p class="text-xs text-slate-400">Scheduled</p><p class="text-lg font-bold text-slate-800 dark:text-white">{{ h2(sheet.scheduledHours) }}h</p></div>
          <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3"><p class="text-xs text-slate-400">Attended</p><p class="text-lg font-bold text-slate-800 dark:text-white">{{ h2(sheet.attendedHours) }}h</p></div>
          <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3"><p class="text-xs text-slate-400">On jobs</p><p class="text-lg font-bold text-slate-500">{{ h2(sheet.jobHours) }}h</p></div>
          <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3"><p class="text-xs text-slate-400">Leave / sick</p><p class="text-lg font-bold text-slate-800 dark:text-white">{{ h2(sheet.leaveHours + sheet.sickHours) }}h</p></div>
          <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3"><p class="text-xs text-slate-400">Overtime</p><p class="text-lg font-bold" :class="sheet.overtimeHours > 0 ? 'text-amber-600' : 'text-slate-800 dark:text-white'">{{ h2(sheet.overtimeHours) }}h</p></div>
          <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3"><p class="text-xs text-slate-400">Total paid</p><p class="text-lg font-bold text-brand-600">{{ h2(sheet.totalPaidHours) }}h</p></div>
        </div>

        <p v-if="sheet.status === TimesheetStatus.REJECTED && sheet.rejectionReason" class="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm px-3 py-2">Rejected: {{ sheet.rejectionReason }}</p>
        <p v-if="sheet.reopenedReason && sheet.status === TimesheetStatus.DRAFT" class="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm px-3 py-2">Reopened: {{ sheet.reopenedReason }}</p>
        <p v-if="sheet.employeeNotes" class="mt-3 text-sm text-slate-500"><span class="text-slate-400">Employee note:</span> {{ sheet.employeeNotes }}</p>
        <p v-if="sheet.managerNotes" class="mt-1 text-sm text-slate-500"><span class="text-slate-400">Manager note:</span> {{ sheet.managerNotes }}</p>
      </div>

      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-dark-border">
              <th class="py-2 pr-3">Day</th>
              <th class="py-2 pr-3">In – out</th>
              <th class="py-2 pr-3 text-right">Break</th>
              <th class="py-2 pr-3 text-right">Scheduled</th>
              <th class="py-2 pr-3 text-right">Attended</th>
              <th class="py-2 pr-3 text-right">On jobs</th>
              <th class="py-2 pr-3 text-right">Leave</th>
              <th class="py-2 pr-3 text-right">Sick</th>
              <th class="py-2 pr-3">Flags</th>
              <th class="py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in sheet.lines" :key="line.id" :class="['border-b border-slate-50 dark:border-dark-border/50', line.scheduledHours === 0 ? 'bg-slate-50/60 dark:bg-white/[0.02]' : '']">
              <td class="py-2.5 pr-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{{ dayLabel(line.workDate) }}</td>
              <td class="py-2.5 pr-3 text-slate-500 whitespace-nowrap">
                <template v-if="line.firstInAt">{{ timeOf(line.firstInAt) }} – {{ line.lastOutAt ? timeOf(line.lastOutAt) : '…' }}</template>
                <template v-else>—</template>
              </td>
              <td class="py-2.5 pr-3 text-right text-slate-400">{{ line.breakMinutes ? `${line.breakMinutes}m` : '—' }}</td>
              <td class="py-2.5 pr-3 text-right text-slate-400">{{ line.scheduledHours ? h2(line.scheduledHours) : '—' }}</td>
              <td class="py-2.5 pr-3 text-right font-medium text-slate-700 dark:text-slate-200">{{ h2(line.attendedHours) }}</td>
              <td class="py-2.5 pr-3 text-right text-slate-500">{{ line.jobHours ? h2(line.jobHours) : '—' }}</td>
              <td class="py-2.5 pr-3 text-right">
                <input v-if="editable" v-model="draftFor(line).leaveHours" type="number" min="0" max="24" step="0.25" :class="inputClass" @blur="saveLine(line)" @keydown.enter="($event.target as HTMLInputElement).blur()" />
                <span v-else class="text-slate-500">{{ line.leaveHours ? h2(line.leaveHours) : '—' }}</span>
              </td>
              <td class="py-2.5 pr-3 text-right">
                <input v-if="editable" v-model="draftFor(line).sickHours" type="number" min="0" max="24" step="0.25" :class="inputClass" @blur="saveLine(line)" @keydown.enter="($event.target as HTMLInputElement).blur()" />
                <span v-else class="text-slate-500">{{ line.sickHours ? h2(line.sickHours) : '—' }}</span>
              </td>
              <td class="py-2.5 pr-3">
                <div class="flex flex-wrap gap-1">
                  <span v-for="flag in line.flags" :key="flag" :class="['px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap', attendanceFlagClass[flag] ?? 'bg-slate-100 text-slate-500']">{{ attendanceFlagLabels[flag] ?? flag }}</span>
                </div>
              </td>
              <td class="py-2.5">
                <input v-if="editable" v-model="draftFor(line).note" type="text" placeholder="Note" class="w-full min-w-[120px] rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" @blur="saveLine(line)" @keydown.enter="($event.target as HTMLInputElement).blur()" />
                <span v-else class="text-slate-500">{{ line.note ?? '' }}</span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="font-semibold text-slate-800 dark:text-slate-100">
              <td class="pt-3 pr-3" colspan="3">Week total</td>
              <td class="pt-3 pr-3 text-right">{{ h2(sheet.scheduledHours) }}</td>
              <td class="pt-3 pr-3 text-right">{{ h2(sheet.attendedHours) }}</td>
              <td class="pt-3 pr-3 text-right">{{ h2(sheet.jobHours) }}</td>
              <td class="pt-3 pr-3 text-right">{{ h2(sheet.leaveHours) }}</td>
              <td class="pt-3 pr-3 text-right">{{ h2(sheet.sickHours) }}</td>
              <td class="pt-3" colspan="2"></td>
            </tr>
          </tfoot>
        </table>
        <p v-if="editable" class="text-xs text-slate-400 mt-3">Attended and job hours come from clock-ins and job timers — correct them on the Attendance page. Leave, sick hours and notes save when you leave the field.</p>
      </div>
    </template>

    <UiModal :open="!!reasonFor" :title="reasonFor === 'reject' ? 'Reject timesheet' : 'Reopen timesheet'" @close="reasonFor = null">
      <p class="text-sm text-slate-500 mb-3">
        {{ reasonFor === 'reject' ? 'The employee is told why and can submit again.' : 'The week goes back to draft for correction. The reason is kept in the audit log.' }}
      </p>
      <textarea v-model="reason" rows="3" placeholder="Reason (required)…"
        class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
      <template #footer>
        <UiButton variant="ghost" @click="reasonFor = null">Cancel</UiButton>
        <UiButton :variant="reasonFor === 'reject' ? 'danger' : 'primary'" :loading="busy" :disabled="reason.trim().length < 3" @click="submitReason">{{ reasonFor === 'reject' ? 'Reject' : 'Reopen' }}</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
