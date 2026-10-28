import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getTimesheets, getPendingTimesheets, getTimesheet as getTimesheetApi, generateTimesheets as generateApi,
  approveTimesheet as approveApi, rejectTimesheet as rejectApi, reopenTimesheet as reopenApi,
  updateTimesheetLine as updateLineApi, submitTimesheet as submitApi, recallTimesheet as recallApi,
} from '@/api/timesheets.api'
import type { Timesheet } from '@/api/timesheets.api'
import type { TimesheetStatus } from '@/types/generated/enums/hr'

function messageOf(err: any, fallback: string): string {
  const message = err?.response?.data?.message
  return Array.isArray(message) ? message.join('; ') : (message ?? fallback)
}

/** Manager-side timesheet state (list for a week, pending inbox, the open sheet) */
export const useTimesheetsStore = defineStore('timesheets', () => {
  const items = ref<Timesheet[]>([])
  const pendingApprovals = ref<Timesheet[]>([])
  const item = ref<Timesheet | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function run<T>(fallback: string, fn: () => Promise<T>): Promise<T> {
    error.value = null
    try {
      return await fn()
    } catch (err) {
      error.value = messageOf(err, fallback)
      throw err
    }
  }

  /** Keep the list, the inbox and the open sheet in step after any mutation */
  function apply(updated: Timesheet): Timesheet {
    const index = items.value.findIndex((t) => t.id === updated.id)
    if (index >= 0) items.value[index] = updated
    pendingApprovals.value = pendingApprovals.value.filter((t) => t.id !== updated.id || updated.status === 'submitted')
    if (item.value?.id === updated.id) item.value = updated
    return updated
  }

  async function fetchTimesheets(params: { periodStart?: string; status?: TimesheetStatus; userId?: string }) {
    isLoading.value = true
    try {
      items.value = await run('Failed to load timesheets', () => getTimesheets(params))
    } finally {
      isLoading.value = false
    }
  }

  const fetchPendingApprovals = () => run('Failed to load pending timesheets', async () => (pendingApprovals.value = await getPendingTimesheets()))
  const fetchTimesheet = (id: string) => run('Failed to load timesheet', async () => (item.value = await getTimesheetApi(id)))
  const generate = (periodStart: string, notify = false) => run('Failed to generate timesheets', () => generateApi(periodStart, notify))
  const approve = (id: string, comments?: string) => run('Failed to approve timesheet', async () => apply(await approveApi(id, comments)))
  const reject = (id: string, comments: string) => run('Failed to reject timesheet', async () => apply(await rejectApi(id, comments)))
  const reopen = (id: string, comments: string) => run('Failed to reopen timesheet', async () => apply(await reopenApi(id, comments)))
  const submit = (id: string, notes?: string) => run('Failed to submit timesheet', async () => apply(await submitApi(id, notes)))
  const recall = (id: string) => run('Failed to recall timesheet', async () => apply(await recallApi(id)))
  const updateLine = (id: string, lineId: string, payload: { leaveHours?: number; sickHours?: number; note?: string }) =>
    run('Failed to save the day', async () => apply(await updateLineApi(id, lineId, payload)))

  return {
    items, pendingApprovals, item, isLoading, error,
    fetchTimesheets, fetchPendingApprovals, fetchTimesheet, generate, approve, reject, reopen, submit, recall, updateLine,
  }
})
