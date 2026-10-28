import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getAttendanceStatus, clockIn as clockInApi, clockOut as clockOutApi } from '@/api/attendance.api'
import type { AttendanceStatus, AttendanceLocation } from '@/api/attendance.api'
import { AttendanceSource } from '@/types/generated/enums/hr'
import { getMyKioskPin } from '@/api/kiosk.api'

function messageOf(err: any, fallback: string): string {
  const message = err?.response?.data?.message
  return Array.isArray(message) ? message.join('; ') : (message ?? fallback)
}

/** Best-effort position: 5 s timeout, never blocks clocking */
function locate(): Promise<AttendanceLocation | undefined> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(undefined)
    const timer = setTimeout(() => resolve(undefined), 5500)
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }) },
      () => { clearTimeout(timer); resolve(undefined) },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    )
  })
}

/**
 * The caller's own clock state (Sprint 18). One shared instance feeds the header widget and the
 * field card; while clocked in it re-polls every 60 s so an auto-close or a manager fix shows up.
 */
export const useAttendanceStore = defineStore('attendance', () => {
  const status = ref<AttendanceStatus | null>(null)
  const isLoading = ref(false)
  const busy = ref(false)
  const error = ref<string | null>(null)
  let poll: ReturnType<typeof setInterval> | null = null
  let watchers = 0

  /** When the kiosk is on, office staff clock at the kiosk — the desktop button is hidden */
  const kioskEnabled = ref(false)
  const hasKioskPin = ref(false)

  const clockedIn = computed(() => status.value?.clockedIn ?? false)

  async function fetchKiosk() {
    try {
      const info = await getMyKioskPin()
      kioskEnabled.value = info.kioskEnabled
      hasKioskPin.value = info.hasPin
    } catch { /* leave the defaults */ }
  }

  async function fetchStatus() {
    isLoading.value = true
    error.value = null
    try {
      status.value = await getAttendanceStatus()
    } catch (err) {
      error.value = messageOf(err, 'Failed to load clock status')
    } finally {
      isLoading.value = false
    }
  }

  /** Reference-counted so several mounted widgets share one timer */
  function startPolling() {
    watchers++
    if (poll) return
    fetchStatus()
    fetchKiosk()
    poll = setInterval(() => { if (clockedIn.value || !status.value) fetchStatus() }, 60000)
  }
  function stopPolling() {
    watchers = Math.max(0, watchers - 1)
    if (watchers === 0 && poll) { clearInterval(poll); poll = null }
  }

  async function clockIn(source: AttendanceSource) {
    busy.value = true
    error.value = null
    try {
      const location = await locate()
      await clockInApi({ source, location })
      await fetchStatus()
    } catch (err) {
      error.value = messageOf(err, 'Could not clock in')
      await fetchStatus()
      throw err
    } finally {
      busy.value = false
    }
  }

  async function clockOut(source: AttendanceSource): Promise<string[]> {
    busy.value = true
    error.value = null
    try {
      const location = await locate()
      const result = await clockOutApi({ source, location })
      await fetchStatus()
      return result.stoppedTimers ?? []
    } catch (err) {
      error.value = messageOf(err, 'Could not clock out')
      await fetchStatus()
      throw err
    } finally {
      busy.value = false
    }
  }

  function reset() {
    status.value = null
    if (poll) { clearInterval(poll); poll = null }
    watchers = 0
  }

  return { status, isLoading, busy, error, clockedIn, kioskEnabled, hasKioskPin, fetchKiosk, fetchStatus, startPolling, stopPolling, clockIn, clockOut, reset }
})
