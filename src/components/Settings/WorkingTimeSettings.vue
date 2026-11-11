<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import { getCompanySettings, updateCompanySettings, type WorkingTimeSettings } from '@/api/company.api'
import { getKioskAdminStatus, setKioskMasterPin, lockAllKiosks } from '@/api/kiosk.api'
import { showConfirmDialog } from '@/utils/alert'
import { OvertimeMode } from '@/types/generated/enums/hr'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/** Settings → Working time (Sprint 18): the rules behind clocking in and timesheets. */
const { hasPermission: canUpdate } = usePermissions('menus.administration.settings.business.update')

const loading = ref(true)
const saving = ref(false)
const geofenceOn = ref(false)
const form = reactive<WorkingTimeSettings>({
  workingDays: [1, 2, 3, 4, 5], shiftStart: '08:00', shiftEnd: '17:00', lateGraceMinutes: 5,
  unpaidBreakMinutes: 30, breakAfterHours: 6, overtimeMode: OvertimeMode.WEEKLY_OVER_CONTRACTED,
  overtimeDailyThresholdHours: 8, autoClockOutAfterHours: 12, workshopGeofence: null,
  timesheetApproverTag: 'workshop_manager', kioskEnabled: false,
  fieldTimerCutoff: '23:59', fieldTimerReminderAt: '18:30',
})
const geofence = reactive({ lat: '', lng: '', radiusMetres: '250' })
const kioskUrl = `${window.location.origin}/kiosk`

// Kiosk master PIN — unlocks each tablet; changing it locks them all again
const master = reactive({ hasPin: false, pin: '', saving: false })
async function loadKioskAdmin() {
  try { master.hasPin = (await getKioskAdminStatus()).hasMasterPin } catch { /* leave as not set */ }
}
async function saveMasterPin() {
  if (!/^\d{4,8}$/.test(master.pin)) { ToastService.error('The master PIN is 4 to 8 digits'); return }
  if (master.hasPin) {
    const result = await showConfirmDialog('Change the master PIN? Every kiosk locks until the new PIN is entered on it.', false, 'Change')
    if (!result.isConfirmed) return
  }
  master.saving = true
  try {
    await setKioskMasterPin(master.pin)
    ToastService.success('Master PIN saved — enter it on each kiosk to unlock it')
    master.pin = ''
    master.hasPin = true
  } catch (e: any) {
    const message = e.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to save the master PIN'))
  } finally {
    master.saving = false
  }
}
async function lockAll() {
  const result = await showConfirmDialog('Lock every kiosk now? Each one needs the master PIN again before staff can clock in.', false, 'Lock all')
  if (!result.isConfirmed) return
  try {
    await lockAllKiosks()
    ToastService.success('All kiosks locked')
  } catch {
    ToastService.error('Failed to lock the kiosks')
  }
}

const days = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 7, label: 'Sun' },
]
const approverOptions = [
  { value: 'workshop_manager', label: 'Workshop Manager' },
  { value: 'management', label: 'Management' },
  { value: 'accounts', label: 'Accounts' },
]

function toggleDay(day: number) {
  form.workingDays = form.workingDays.includes(day)
    ? form.workingDays.filter((d) => d !== day)
    : [...form.workingDays, day].sort((a, b) => a - b)
}

async function load() {
  loading.value = true
  try {
    const settings = await getCompanySettings()
    if (settings.workingTime) {
      Object.assign(form, settings.workingTime)
      geofenceOn.value = !!settings.workingTime.workshopGeofence
      if (settings.workingTime.workshopGeofence) {
        geofence.lat = String(settings.workingTime.workshopGeofence.lat)
        geofence.lng = String(settings.workingTime.workshopGeofence.lng)
        geofence.radiusMetres = String(settings.workingTime.workshopGeofence.radiusMetres)
      }
    }
  } catch {
    ToastService.error('Failed to load working-time settings')
  } finally {
    loading.value = false
  }
}

function useMyLocation() {
  if (!navigator.geolocation) { ToastService.error('This browser cannot provide a location'); return }
  navigator.geolocation.getCurrentPosition(
    (pos) => { geofence.lat = pos.coords.latitude.toFixed(6); geofence.lng = pos.coords.longitude.toFixed(6) },
    () => ToastService.error('Could not get your location — enter the coordinates by hand'),
    { timeout: 8000 },
  )
}

async function save() {
  if (!form.workingDays.length) { ToastService.error('Choose at least one working day'); return }
  if (form.shiftEnd <= form.shiftStart) { ToastService.error('Shift end must be after shift start'); return }
  let workshopGeofence: WorkingTimeSettings['workshopGeofence'] = null
  if (geofenceOn.value) {
    const lat = Number(geofence.lat), lng = Number(geofence.lng), radiusMetres = Number(geofence.radiusMetres)
    if (!geofence.lat || !geofence.lng || Number.isNaN(lat) || Number.isNaN(lng) || !(radiusMetres >= 25)) {
      ToastService.error('Enter the workshop latitude, longitude and a radius of at least 25 m'); return
    }
    workshopGeofence = { lat, lng, radiusMetres }
  }
  saving.value = true
  try {
    await updateCompanySettings({
      workingTime: {
        ...form,
        lateGraceMinutes: Number(form.lateGraceMinutes), unpaidBreakMinutes: Number(form.unpaidBreakMinutes),
        breakAfterHours: Number(form.breakAfterHours), overtimeDailyThresholdHours: Number(form.overtimeDailyThresholdHours),
        autoClockOutAfterHours: Number(form.autoClockOutAfterHours), workshopGeofence,
      },
    })
    ToastService.success('Working-time settings saved')
    await load()
  } catch (e: any) {
    const message = e.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to save'))
  } finally {
    saving.value = false
  }
}

onMounted(() => { load(); loadKioskAdmin() })

const inputClass = 'w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'
const sectionClass = 'text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2'
</script>

<template>
  <div>
    <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Working time</h2>
    <p class="text-sm text-slate-500 mb-5">The rules behind clocking in and weekly timesheets.</p>

    <div v-if="loading" class="h-40 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <div v-else class="space-y-5 max-w-lg">
      <div class="space-y-4">
        <p :class="sectionClass">Working week</p>
        <div>
          <label :class="labelClass">Working days</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="d in days" :key="d.value" type="button" :disabled="!canUpdate"
              :class="['px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                form.workingDays.includes(d.value) ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-200 dark:border-dark-border text-slate-500']"
              @click="toggleDay(d.value)"
            >{{ d.label }}</button>
          </div>
          <p class="text-xs text-slate-400 mt-1">Contracted weekly hours are spread evenly over these days.</p>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div><label :class="labelClass">Shift start</label><input v-model="form.shiftStart" type="time" :disabled="!canUpdate" :class="inputClass" /></div>
          <div><label :class="labelClass">Shift end</label><input v-model="form.shiftEnd" type="time" :disabled="!canUpdate" :class="inputClass" /></div>
          <div><label :class="labelClass">Late after (min)</label><input v-model.number="form.lateGraceMinutes" type="number" min="0" max="120" :disabled="!canUpdate" :class="inputClass" /></div>
        </div>
      </div>

      <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-dark-border">
        <p :class="sectionClass">Breaks & overtime</p>
        <div class="grid grid-cols-2 gap-4">
          <div><label :class="labelClass">Unpaid break (minutes)</label><input v-model.number="form.unpaidBreakMinutes" type="number" min="0" max="180" :disabled="!canUpdate" :class="inputClass" /></div>
          <div><label :class="labelClass">Deducted after (hours)</label><input v-model.number="form.breakAfterHours" type="number" min="0" max="24" step="0.5" :disabled="!canUpdate" :class="inputClass" /></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label :class="labelClass">Overtime counted</label>
            <select v-model="form.overtimeMode" :disabled="!canUpdate" :class="inputClass">
              <option :value="OvertimeMode.WEEKLY_OVER_CONTRACTED">Weekly — over contracted hours</option>
              <option :value="OvertimeMode.DAILY_OVER_HOURS">Daily — over a daily limit</option>
            </select>
          </div>
          <div>
            <label :class="labelClass">Daily limit (hours)</label>
            <input v-model.number="form.overtimeDailyThresholdHours" type="number" min="1" max="24" step="0.5" :disabled="!canUpdate || form.overtimeMode !== OvertimeMode.DAILY_OVER_HOURS" :class="inputClass" />
          </div>
        </div>
      </div>

      <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-dark-border">
        <p :class="sectionClass">Clocking</p>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label :class="labelClass">Auto clock-out after (hours)</label>
            <input v-model.number="form.autoClockOutAfterHours" type="number" min="4" max="24" :disabled="!canUpdate" :class="inputClass" />
            <p class="text-xs text-slate-400 mt-1">A forgotten clock-out is closed here and flagged for review.</p>
          </div>
          <div>
            <label :class="labelClass">Timesheets approved by</label>
            <select v-model="form.timesheetApproverTag" :disabled="!canUpdate" :class="inputClass">
              <option v-for="o in approverOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
        </div>
        <!-- Sprint 26 — on-site timer guards -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label :class="labelClass">Field timer auto-stop at</label>
            <input v-model="form.fieldTimerCutoff" type="time" :disabled="!canUpdate" :class="inputClass" />
            <p class="text-xs text-slate-400 mt-1">An on-site timer still running at this time is stopped and the entry flagged for review.</p>
          </div>
          <div>
            <label :class="labelClass">Running-timer reminder at</label>
            <input v-model="form.fieldTimerReminderAt" type="time" :disabled="!canUpdate" :class="inputClass" />
            <p class="text-xs text-slate-400 mt-1">Push reminder to the engineer if a timer is still running. Clear to switch off.</p>
          </div>
        </div>
        <UiToggle v-model="geofenceOn" :disabled="!canUpdate" label="Flag off-site clock-ins" description="Marks a clock-in made away from the workshop. It never blocks clocking in." />
        <div v-if="geofenceOn" class="grid grid-cols-3 gap-4">
          <div><label :class="labelClass">Latitude</label><input v-model="geofence.lat" type="number" step="0.000001" :disabled="!canUpdate" :class="inputClass" placeholder="52.040600" /></div>
          <div><label :class="labelClass">Longitude</label><input v-model="geofence.lng" type="number" step="0.000001" :disabled="!canUpdate" :class="inputClass" placeholder="-0.759400" /></div>
          <div><label :class="labelClass">Radius (m)</label><input v-model="geofence.radiusMetres" type="number" min="25" max="5000" :disabled="!canUpdate" :class="inputClass" /></div>
          <button v-if="canUpdate" type="button" class="col-span-3 text-left text-xs text-brand-600 hover:underline" @click="useMyLocation">Use my current location (do this from the workshop)</button>
        </div>
      </div>

      <div class="space-y-3 pt-2 border-t border-slate-100 dark:border-dark-border">
        <p :class="sectionClass">Kiosk</p>
        <UiToggle
          v-model="form.kioskEnabled" :disabled="!canUpdate"
          label="Office staff clock in at a kiosk"
          description="A wall tablet or shared PC with a PIN pad. The desktop clock button is hidden; field engineers keep using the field app."
        />
        <p v-if="form.kioskEnabled" class="text-xs text-slate-500">
          Open <a :href="kioskUrl" target="_blank" rel="noopener" class="text-brand-600 hover:underline font-medium">{{ kioskUrl }}</a> on the tablet and leave it on that page.
          Give each person a PIN from HR → Attendance → Kiosk PINs.
        </p>
        <div v-if="form.kioskEnabled" class="rounded-lg border border-slate-100 dark:border-dark-border p-3 space-y-2">
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
            Master PIN
            <span :class="['ml-2 text-xs font-medium px-2 py-0.5 rounded-full', master.hasPin ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400']">{{ master.hasPin ? 'Set' : 'Not set — the kiosk cannot be used yet' }}</span>
          </p>
          <p class="text-xs text-slate-400">A manager enters this once on each tablet to unlock it, so staff can only clock in at a kiosk you have set up — not from their own phone.</p>
          <div v-if="canUpdate" class="flex flex-wrap items-center gap-2">
            <input v-model="master.pin" type="password" inputmode="numeric" maxlength="8" :placeholder="master.hasPin ? 'New master PIN' : '4–8 digits'" :class="[inputClass, '!w-40']" />
            <UiButton variant="secondary" :loading="master.saving" :disabled="!master.pin" @click="saveMasterPin">{{ master.hasPin ? 'Change' : 'Set master PIN' }}</UiButton>
            <button v-if="master.hasPin" type="button" class="text-xs text-slate-500 hover:text-red-500 ml-auto" @click="lockAll">Lock all kiosks</button>
          </div>
        </div>
      </div>

      <div v-if="canUpdate" class="flex justify-end pt-2">
        <UiButton :loading="saving" @click="save">Save Changes</UiButton>
      </div>
    </div>
  </div>
</template>
