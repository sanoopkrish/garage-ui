<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Clock, LogIn, LogOut } from 'lucide-vue-next'
import { useAttendanceStore } from '@/stores/attendance.store'
import { AttendanceSource } from '@/types/generated/enums/hr'
import { minutesLabel, timeOf } from '@/utils/hr'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/**
 * Clock in / out (Sprint 18). `header` = compact pill for the desktop top bar,
 * `card` = the big thumb-friendly card at the top of the field app.
 */
const props = withDefaults(defineProps<{ variant?: 'header' | 'card' }>(), { variant: 'header' })

const store = useAttendanceStore()
const source = computed(() => (props.variant === 'card' ? AttendanceSource.FIELD_APP : AttendanceSource.DESKTOP))

// tick once a minute so "3h 10m" stays current without refetching
const now = ref(Date.now())
let tick: ReturnType<typeof setInterval> | null = null

const open = computed(() => store.status?.open ?? null)
const elapsed = computed(() => (open.value ? minutesLabel((now.value - new Date(open.value.clockInAt).getTime()) / 60000) : ''))
const todayWorked = computed(() => store.status?.todayWorkedMinutes ?? 0)

async function handleClockIn() {
  try {
    await store.clockIn(source.value)
    const flags = store.status?.open?.flags ?? []
    ToastService.success(flags.includes('late') ? 'Clocked in (recorded as late)' : 'Clocked in')
  } catch {
    ToastService.error(store.error ?? 'Could not clock in')
  }
}

async function handleClockOut() {
  const timers = store.status?.runningTimers ?? []
  const text = timers.length
    ? `Clock out now? This also stops your running job timer on ${timers.map((t) => t.jobNumber).join(', ')}.`
    : 'Clock out now?'
  const result = await showConfirmDialog(text, false, 'Clock out')
  if (!result.isConfirmed) return
  try {
    const stopped = await store.clockOut(source.value)
    ToastService.success(stopped.length ? `Clocked out — timer stopped on ${stopped.join(', ')}` : 'Clocked out')
  } catch {
    ToastService.error(store.error ?? 'Could not clock out')
  }
}

onMounted(() => {
  store.startPolling()
  tick = setInterval(() => { now.value = Date.now() }, 30000)
})
onUnmounted(() => {
  store.stopPolling()
  if (tick) clearInterval(tick)
})
</script>

<template>
  <!-- Desktop header pill -->
  <div v-if="variant === 'header'" class="flex items-center gap-2">
    <span
      v-if="open"
      class="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
      :title="`Clocked in at ${timeOf(open.clockInAt)}`"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      In since {{ timeOf(open.clockInAt) }} · {{ elapsed }}
    </span>
    <!-- Kiosk on → office staff clock at the kiosk; the header only shows the state -->
    <span
      v-if="store.kioskEnabled && store.status && !open"
      class="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
      :title="store.hasKioskPin ? 'Clock in at the kiosk' : 'Set your kiosk PIN under My Profile'"
    >
      Not clocked in · {{ store.hasKioskPin ? 'use the kiosk' : 'set a kiosk PIN' }}
    </span>
    <button
      v-if="store.status && !store.kioskEnabled"
      :disabled="store.busy"
      :class="[
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60',
        open
          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20'
          : 'bg-brand-500 text-white hover:bg-brand-600',
      ]"
      @click="open ? handleClockOut() : handleClockIn()"
    >
      <component :is="open ? LogOut : LogIn" class="w-4 h-4" />
      {{ store.busy ? '…' : open ? 'Clock out' : 'Clock in' }}
    </button>
  </div>

  <!-- Field app card -->
  <div v-else class="card !p-4 mb-4">
    <div v-if="!store.status" class="h-12 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />
    <div v-else class="flex items-center gap-3">
      <div :class="['w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', open ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-white/10']">
        <Clock :class="['w-5 h-5', open ? 'text-green-600' : 'text-slate-400']" />
      </div>
      <div class="flex-1 min-w-0">
        <template v-if="open">
          <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">Clocked in since {{ timeOf(open.clockInAt) }}</p>
          <p class="text-xs text-slate-400">{{ elapsed }} so far<template v-if="open.flags.includes('late')"> · late</template></p>
        </template>
        <template v-else>
          <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">Not clocked in</p>
          <p class="text-xs text-slate-400">{{ todayWorked > 0 ? `${minutesLabel(todayWorked)} worked today` : 'Clock in when you start work' }}</p>
        </template>
      </div>
      <button
        :disabled="store.busy"
        :class="[
          'px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-95 disabled:opacity-60',
          open ? 'bg-slate-800 text-white dark:bg-white/20' : 'bg-brand-500 text-white',
        ]"
        @click="open ? handleClockOut() : handleClockIn()"
      >
        {{ store.busy ? 'Locating…' : open ? 'Clock out' : 'Clock in' }}
      </button>
    </div>
  </div>
</template>
