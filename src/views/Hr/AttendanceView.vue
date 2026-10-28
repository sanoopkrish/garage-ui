<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import { Pencil, RefreshCw, MapPin, UserCheck, KeyRound } from 'lucide-vue-next'
import KioskPinsModal from '@/components/Hr/KioskPinsModal.vue'
import { getAttendance, getWhosIn, adjustAttendance, runAttendanceChecks, type AttendanceRecord } from '@/api/attendance.api'
import { AttendanceFlag } from '@/types/generated/enums/hr'
import { addDaysIso, attendanceFlagClass, attendanceFlagLabels, attendanceSourceLabels, isoToday, minutesLabel, timeOf } from '@/utils/hr'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

const { hasPermission: canAdjust } = usePermissions('menus.hr.attendance.update')
const showPins = ref(false)

// ── Data (local loading + local loadFn) ───────────────────────────────────────
const records = ref<AttendanceRecord[]>([])
const whosIn = ref<AttendanceRecord[]>([])
const loading = ref(true)
const filters = reactive({ from: addDaysIso(isoToday(), -6), to: isoToday(), userId: '', flag: '' })

const flagOptions = [
  { value: '', label: 'All records' },
  ...Object.values(AttendanceFlag).filter((f) => f !== AttendanceFlag.NO_ATTENDANCE).map((f) => ({ value: f, label: attendanceFlagLabels[f] })),
]
// employee filter is built from what the range returned — no extra user-list permission needed
const employees = ref<{ value: string; label: string }[]>([])
const employeeOptions = computed(() => [{ value: '', label: 'All employees' }, ...employees.value])

function apiError(err: any, fallback: string) {
  const message = err?.response?.data?.message
  ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? fallback))
}

async function load() {
  loading.value = true
  try {
    const [list, inNow] = await Promise.all([
      getAttendance({ from: filters.from || undefined, to: filters.to || undefined, userId: filters.userId || undefined, flag: filters.flag || undefined }),
      getWhosIn(),
    ])
    records.value = list
    whosIn.value = inNow
    if (!filters.userId) {
      const seen = new Map<string, string>()
      for (const r of [...list, ...inNow]) seen.set(r.userId, r.userName ?? r.userId)
      employees.value = [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
    }
  } catch (err) {
    apiError(err, 'Failed to load attendance')
  } finally {
    loading.value = false
  }
}

const checking = ref(false)
async function runChecks() {
  checking.value = true
  try {
    const { autoClosed } = await runAttendanceChecks()
    ToastService.success(autoClosed ? `${autoClosed} forgotten clock-out(s) closed for review` : 'No forgotten clock-outs')
    await load()
  } catch (err) { apiError(err, 'Check failed') } finally { checking.value = false }
}

// ── Adjust modal ──────────────────────────────────────────────────────────────
const adjusting = ref<AttendanceRecord | null>(null)
const adjustForm = reactive({ clockInAt: '', clockOutAt: '', breakMinutes: '', reason: '' })
const adjustErrors = reactive({ reason: '' })
const saving = ref(false)

/** ISO instant → value for <input type="datetime-local"> in the browser's zone */
function toLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openAdjust(record: AttendanceRecord) {
  adjusting.value = record
  adjustForm.clockInAt = toLocalInput(record.clockInAt)
  adjustForm.clockOutAt = toLocalInput(record.clockOutAt)
  adjustForm.breakMinutes = String(record.breakMinutes ?? 0)
  adjustForm.reason = ''
  adjustErrors.reason = ''
}

async function submitAdjust() {
  if (!adjusting.value) return
  adjustErrors.reason = adjustForm.reason.trim().length >= 3 ? '' : 'Give a reason for the correction'
  if (adjustErrors.reason) return
  saving.value = true
  try {
    await adjustAttendance(adjusting.value.id, {
      clockInAt: adjustForm.clockInAt ? new Date(adjustForm.clockInAt).toISOString() : undefined,
      clockOutAt: adjustForm.clockOutAt ? new Date(adjustForm.clockOutAt).toISOString() : undefined,
      breakMinutes: adjustForm.breakMinutes !== '' ? Number(adjustForm.breakMinutes) : undefined,
      reason: adjustForm.reason.trim(),
    })
    ToastService.success('Attendance record corrected')
    adjusting.value = null
    await load()
  } catch (err) { apiError(err, 'Failed to save the correction') } finally { saving.value = false }
}

function dateOf(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
}
function sinceLabel(iso: string): string {
  return minutesLabel((Date.now() - new Date(iso).getTime()) / 60000)
}

onMounted(load)
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Attendance" subtitle="Who is in, clock-in records, and corrections.">
      <UiButton v-if="canAdjust" variant="secondary" @click="showPins = true"><KeyRound class="w-4 h-4" /> Kiosk PINs</UiButton>
      <UiButton v-if="canAdjust" variant="secondary" :loading="checking" @click="runChecks"><RefreshCw class="w-4 h-4" /> Check forgotten clock-outs</UiButton>
    </UiPageHeader>

    <!-- Who's in now -->
    <div class="card mb-5">
      <div class="flex items-center gap-2 mb-3">
        <UserCheck class="w-4 h-4 text-brand-500" />
        <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">In now ({{ whosIn.length }})</h2>
      </div>
      <p v-if="!loading && whosIn.length === 0" class="text-sm text-slate-400">Nobody is clocked in right now.</p>
      <div v-else class="flex flex-wrap gap-2">
        <div v-for="r in whosIn" :key="r.id" class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-dark-border text-sm">
          <span class="w-2 h-2 rounded-full" :class="r.flags.includes('late') ? 'bg-amber-500' : 'bg-green-500'" />
          <span class="font-medium text-slate-700 dark:text-slate-200">{{ r.userName }}</span>
          <span class="text-xs text-slate-400">since {{ timeOf(r.clockInAt) }} · {{ sinceLabel(r.clockInAt) }}</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-end gap-3 mb-5">
      <div class="w-40"><UiInput v-model="filters.from" label="From" type="date" @update:modelValue="load" /></div>
      <div class="w-40"><UiInput v-model="filters.to" label="To" type="date" @update:modelValue="load" /></div>
      <div class="w-52"><UiSelect v-model="filters.userId" label="Employee" :options="employeeOptions" @update:modelValue="load" /></div>
      <div class="w-48"><UiSelect v-model="filters.flag" label="Flag" :options="flagOptions" @update:modelValue="load" /></div>
      <span class="text-sm text-slate-400 ml-auto pb-2">{{ records.length }} records</span>
    </div>

    <UiTable :headers="['Employee', 'Date', 'In', 'Out', 'Break', 'Worked', 'Flags', '']">
      <template v-if="loading && records.length === 0">
        <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in 8" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded" /></td>
        </tr>
      </template>
      <template v-else-if="records.length === 0">
        <tr><td colspan="8" class="px-4 py-10 text-center text-sm text-slate-400">No attendance records in this range.</td></tr>
      </template>
      <tr v-else v-for="r in records" :key="r.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
        <td class="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200">{{ r.userName }}</td>
        <td class="px-4 py-3.5 text-sm text-slate-500">{{ dateOf(r.clockInAt) }}</td>
        <td class="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
          {{ timeOf(r.clockInAt) }}
          <span class="block text-xs text-slate-400">
            {{ attendanceSourceLabels[r.sourceIn] }}
            <MapPin v-if="r.locationIn" class="inline w-3 h-3" :class="r.inGeofenceIn === false ? 'text-sky-500' : 'text-slate-300'" />
          </span>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
          <template v-if="r.clockOutAt">
            {{ timeOf(r.clockOutAt) }}
            <span v-if="r.sourceOut" class="block text-xs text-slate-400">{{ attendanceSourceLabels[r.sourceOut] }}</span>
          </template>
          <span v-else class="text-green-600 font-medium">In now</span>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-500">{{ r.breakMinutes ? `${r.breakMinutes}m` : '—' }}</td>
        <td class="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200">{{ r.workedMinutes != null ? minutesLabel(r.workedMinutes) : '—' }}</td>
        <td class="px-4 py-3.5">
          <div class="flex flex-wrap gap-1">
            <span v-for="flag in r.flags" :key="flag" :class="['px-2 py-0.5 rounded-full text-[11px] font-medium', attendanceFlagClass[flag] ?? 'bg-slate-100 text-slate-500']" :title="flag === 'manager_adjusted' ? (r.adjustedReason ?? '') : ''">
              {{ attendanceFlagLabels[flag] ?? flag }}
            </span>
          </div>
        </td>
        <td class="px-4 py-3.5 text-right">
          <button v-if="canAdjust" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors" title="Correct this record" @click="openAdjust(r)">
            <Pencil class="w-4 h-4" />
          </button>
        </td>
      </tr>
    </UiTable>

    <KioskPinsModal :open="showPins" @close="showPins = false" />

    <UiModal :open="!!adjusting" :title="`Correct attendance — ${adjusting?.userName ?? ''}`" @close="adjusting = null">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="adjustForm.clockInAt" label="Clock in" type="datetime-local" required />
          <UiInput v-model="adjustForm.clockOutAt" label="Clock out" type="datetime-local" />
        </div>
        <UiInput v-model="adjustForm.breakMinutes" label="Unpaid break (minutes)" type="number" />
        <UiInput v-model="adjustForm.reason" label="Reason for the correction" placeholder="e.g. Forgot to clock out, left at 5pm" required :error="adjustErrors.reason" />
        <p class="text-xs text-slate-400">Corrections are recorded in the audit log with your name and this reason.</p>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="adjusting = null">Cancel</UiButton>
        <UiButton :loading="saving" @click="submitAdjust">Save correction</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
