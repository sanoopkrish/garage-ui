<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import { ChevronLeft, ChevronRight, RefreshCw, Download, Check, X } from 'lucide-vue-next'
import { useTimesheetsStore } from '@/stores/timesheets.store'
import { downloadTimesheetCsv, getMyTimesheet, type Timesheet } from '@/api/timesheets.api'
import { TimesheetStatus } from '@/types/generated/enums/hr'
import {
  addDaysIso, attendanceFlagClass, attendanceFlagLabels, h2, timesheetStatusLabels, timesheetStatusVariant, weekLabel,
} from '@/utils/hr'
import { usePermissions } from '@/composables/usePermissions'
import { useAuthStore } from '@/stores/auth'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/**
 * Timesheets (Sprint 18) — week list + Pending-approval inbox.
 * Layout and approve / reject-with-reason flow ported from psa-ui TimesheetList + TimesheetApprovalList.
 */
const router = useRouter()
const store = useTimesheetsStore()
const authStore = useAuthStore()
const { hasPermission: canApprove } = usePermissions('menus.hr.timesheets.approve')
const { hasPermission: canExport } = usePermissions('menus.hr.timesheets.export')

const activeTab = ref<'week' | 'pending'>('week')
const loading = ref(true)
const periodStart = ref('')
const currentPeriodStart = ref('')
const statusFilter = ref<'' | TimesheetStatus>('')

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: TimesheetStatus.DRAFT, label: 'Draft' },
  { value: TimesheetStatus.SUBMITTED, label: 'Submitted' },
  { value: TimesheetStatus.LOCKED, label: 'Approved' },
  { value: TimesheetStatus.REJECTED, label: 'Rejected' },
]
const periodEnd = computed(() => (periodStart.value ? addDaysIso(periodStart.value, 6) : ''))
const rows = computed(() => (activeTab.value === 'pending' ? store.pendingApprovals : store.items))
const myUserId = computed(() => (authStore.user as any)?.id ?? null)

async function load() {
  loading.value = true
  try {
    await Promise.all([
      store.fetchTimesheets({ periodStart: periodStart.value, status: statusFilter.value || undefined }),
      store.fetchPendingApprovals(),
    ])
  } catch {
    ToastService.error(store.error ?? 'Failed to load timesheets')
  } finally {
    loading.value = false
  }
}

function go(weeks: number) {
  const next = addDaysIso(periodStart.value, weeks * 7)
  if (next > currentPeriodStart.value) return
  periodStart.value = next
  load()
}

const generating = ref(false)
async function handleGenerate() {
  generating.value = true
  try {
    const result = await store.generate(periodStart.value)
    ToastService.success(`${result.generated} created, ${result.refreshed} refreshed, ${result.skipped} already submitted or approved`)
    await load()
  } catch {
    ToastService.error(store.error ?? 'Failed to generate timesheets')
  } finally {
    generating.value = false
  }
}

async function handleExport() {
  const notReady = store.items.filter((t) => ![TimesheetStatus.APPROVED, TimesheetStatus.LOCKED].includes(t.status)).length
  if (notReady) {
    const result = await showConfirmDialog(`${notReady} timesheet(s) for this week are not approved yet and will be left out of the export. Export anyway?`, false, 'Export')
    if (!result.isConfirmed) return
  }
  try {
    await downloadTimesheetCsv(periodStart.value)
  } catch {
    ToastService.error('Failed to export the CSV')
  }
}

async function handleApprove(sheet: Timesheet) {
  const result = await showConfirmDialog(`Approve ${sheet.employeeName}'s timesheet (${h2(sheet.totalPaidHours)} hours)? The week locks once approved.`, false, 'Approve')
  if (!result.isConfirmed) return
  try {
    await store.approve(sheet.id)
    ToastService.success('Timesheet approved')
    await load()
  } catch {
    ToastService.error(store.error ?? 'Failed to approve')
  }
}

// Reject modal — reason required (PSA)
const rejecting = ref<Timesheet | null>(null)
const rejectReason = ref('')
const rejectBusy = ref(false)
async function submitReject() {
  if (!rejecting.value || rejectReason.value.trim().length < 3) return
  rejectBusy.value = true
  try {
    await store.reject(rejecting.value.id, rejectReason.value.trim())
    ToastService.success('Timesheet returned to the employee')
    rejecting.value = null
    await load()
  } catch {
    ToastService.error(store.error ?? 'Failed to reject')
  } finally {
    rejectBusy.value = false
  }
}

onMounted(async () => {
  try {
    // any logged-in user can ask for the current period; default the list to LAST week (the one being approved)
    const { currentPeriodStart: current } = await getMyTimesheet()
    currentPeriodStart.value = current
    periodStart.value = addDaysIso(current, -7)
  } catch {
    ToastService.error('Failed to work out the current week')
  }
  await load()
})
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Timesheets" subtitle="Weekly timesheets built from attendance — review, approve and export for payroll.">
      <UiButton v-if="canApprove" variant="secondary" :loading="generating" @click="handleGenerate"><RefreshCw class="w-4 h-4" /> Generate / refresh week</UiButton>
      <UiButton v-if="canExport" variant="secondary" @click="handleExport"><Download class="w-4 h-4" /> Export CSV</UiButton>
    </UiPageHeader>

    <div class="flex items-center gap-1 mb-5 border-b border-slate-200 dark:border-dark-border">
      <button
        v-for="t in [{ key: 'week', label: 'By week' }, { key: 'pending', label: `Pending approval (${store.pendingApprovals.length})` }]"
        :key="t.key"
        :class="['px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
          activeTab === t.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300']"
        @click="activeTab = t.key as typeof activeTab"
      >{{ t.label }}</button>
    </div>

    <div v-if="activeTab === 'week'" class="flex items-center gap-3 mb-5">
      <div class="flex items-center gap-1">
        <button class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500" aria-label="Previous week" @click="go(-1)"><ChevronLeft class="w-4 h-4" /></button>
        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-[150px] text-center">{{ periodStart ? weekLabel(periodStart, periodEnd) : '…' }}</span>
        <button class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 disabled:opacity-30" :disabled="periodStart >= currentPeriodStart" aria-label="Next week" @click="go(1)"><ChevronRight class="w-4 h-4" /></button>
      </div>
      <div class="w-44"><UiSelect v-model="statusFilter" :options="statusOptions" @update:modelValue="load" /></div>
      <span class="text-sm text-slate-400 ml-auto">{{ store.items.length }} timesheets</span>
    </div>

    <UiTable :headers="['Employee', 'Week', 'Attended', 'On jobs', 'Leave / sick', 'Overtime', 'Paid', 'Status', '']">
      <template v-if="loading && rows.length === 0">
        <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in 9" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-16 bg-slate-200 dark:bg-white/10 rounded" /></td>
        </tr>
      </template>
      <template v-else-if="rows.length === 0">
        <tr><td colspan="9" class="px-4 py-10 text-center text-sm text-slate-400">
          {{ activeTab === 'pending' ? 'No timesheets pending approval.' : 'No timesheets for this week yet — generate them from attendance.' }}
        </td></tr>
      </template>
      <tr v-else v-for="t in rows" :key="t.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" @click="router.push(`/hr/timesheets/${t.id}`)">
        <td class="px-4 py-3.5">
          <span class="font-semibold text-slate-700 dark:text-slate-200">{{ t.employeeName }}</span>
          <div v-if="t.flags.length" class="flex flex-wrap gap-1 mt-1">
            <span v-for="flag in t.flags" :key="flag" :class="['px-1.5 py-0.5 rounded-full text-[10px] font-medium', attendanceFlagClass[flag] ?? 'bg-slate-100 text-slate-500']">{{ attendanceFlagLabels[flag] ?? flag }}</span>
          </div>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-500">{{ weekLabel(t.periodStart, t.periodEnd) }}</td>
        <td class="px-4 py-3.5 text-slate-600 dark:text-slate-300">{{ h2(t.attendedHours) }}<span class="text-xs text-slate-400"> / {{ h2(t.scheduledHours) }}</span></td>
        <td class="px-4 py-3.5 text-slate-500">{{ h2(t.jobHours) }}</td>
        <td class="px-4 py-3.5 text-slate-500">{{ t.leaveHours + t.sickHours > 0 ? h2(t.leaveHours + t.sickHours) : '—' }}</td>
        <td class="px-4 py-3.5" :class="t.overtimeHours > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'">{{ t.overtimeHours > 0 ? h2(t.overtimeHours) : '—' }}</td>
        <td class="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-100">{{ h2(t.totalPaidHours) }}</td>
        <td class="px-4 py-3.5"><UiBadge :variant="(timesheetStatusVariant[t.status] as any)" dot>{{ timesheetStatusLabels[t.status] }}</UiBadge></td>
        <td class="px-4 py-3.5" @click.stop>
          <div v-if="canApprove && t.status === TimesheetStatus.SUBMITTED && t.userId !== myUserId" class="flex items-center justify-end gap-1.5">
            <button class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700" @click="handleApprove(t)"><Check class="w-3.5 h-3.5" /> Approve</button>
            <button class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20" @click="rejecting = t; rejectReason = ''"><X class="w-3.5 h-3.5" /> Reject</button>
          </div>
        </td>
      </tr>
    </UiTable>

    <UiModal :open="!!rejecting" title="Reject timesheet" @close="rejecting = null">
      <p class="text-sm text-slate-500 mb-3">Returning {{ rejecting?.employeeName }}'s timesheet for {{ rejecting ? weekLabel(rejecting.periodStart, rejecting.periodEnd) : '' }}.</p>
      <textarea v-model="rejectReason" rows="3" placeholder="Reason for rejection (required)…"
        class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
      <template #footer>
        <UiButton variant="ghost" @click="rejecting = null">Cancel</UiButton>
        <UiButton variant="danger" :loading="rejectBusy" :disabled="rejectReason.trim().length < 3" @click="submitReject">Reject</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
