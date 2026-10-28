<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Gauge, LogIn, LogOut, CheckCircle2, Users, Lock } from 'lucide-vue-next'
import KioskPinPad from '@/components/Kiosk/KioskPinPad.vue'
import {
  getKioskStatus, getKioskWhosOnSite, kioskPinLogin, kioskClockIn, kioskClockOut,
  unlockKiosk, lockThisKiosk, getKioskDeviceToken, isKioskLockedError,
  type KioskOnSite, type KioskPinLogin,
} from '@/api/kiosk.api'

/**
 * Wall-tablet clocking page (Sprint 18) — flow ported from cms-ui KioskClockView:
 * master PIN unlocks the device (once) → staff PIN → staff card with the next action → success → back to the pad.
 * Public route: the tablet is never logged in. No photo step (out of scope here).
 */
type Step = 'loading' | 'disabled' | 'setup' | 'locked' | 'pin' | 'confirm' | 'done'
const step = ref<Step>('loading')
const companyName = ref('')
const onSite = ref<KioskOnSite[]>([])
const session = ref<KioskPinLogin | null>(null)
const pinError = ref<string | null>(null)
const busy = ref(false)
const doneMessage = ref({ title: '', detail: '' })
const actionError = ref<string | null>(null)
const masterError = ref<string | null>(null)

const now = ref(new Date())
const timeLabel = computed(() => now.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
const dateLabel = computed(() => now.value.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))
const t = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const hm = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`

let clockTimer: ReturnType<typeof setInterval> | null = null
let boardTimer: ReturnType<typeof setInterval> | null = null
let resetTimer: ReturnType<typeof setTimeout> | null = null

function errorOf(err: any, fallback: string): string {
  const message = err?.response?.data?.message
  return Array.isArray(message) ? message.join('; ') : (message ?? fallback)
}

/** The server said this device is no longer unlocked (master PIN changed / all kiosks locked) */
function relock() {
  lockThisKiosk()
  if (resetTimer) clearTimeout(resetTimer)
  session.value = null
  masterError.value = null
  step.value = 'locked'
}

async function loadBoard() {
  try { onSite.value = await getKioskWhosOnSite() } catch (err) { if (isKioskLockedError(err)) relock() /* otherwise the board is a nicety */ }
}

async function onMasterPin(pin: string) {
  busy.value = true
  masterError.value = null
  try {
    await unlockKiosk(pin)
    step.value = 'pin'
    await loadBoard()
  } catch (err) {
    masterError.value = errorOf(err, 'Could not check the master PIN')
  } finally {
    busy.value = false
  }
}

function lockNow() {
  relock()
}

function backToPin(delay = 0) {
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    session.value = null
    pinError.value = null
    actionError.value = null
    step.value = 'pin'
    loadBoard()
  }, delay)
}

async function onPin(pin: string) {
  busy.value = true
  pinError.value = null
  try {
    session.value = await kioskPinLogin(pin)
    step.value = 'confirm'
    // nobody leaves a half-finished session on the wall
    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => backToPin(), 30000)
  } catch (err) {
    if (isKioskLockedError(err)) relock()
    else pinError.value = errorOf(err, 'Could not check the PIN')
  } finally {
    busy.value = false
  }
}

async function confirm() {
  if (!session.value) return
  busy.value = true
  actionError.value = null
  const name = session.value.user.firstName
  try {
    if (session.value.action === 'clock-in') {
      const result = await kioskClockIn(session.value.token)
      doneMessage.value = {
        title: `Good ${now.value.getHours() < 12 ? 'morning' : 'afternoon'}, ${name}`,
        detail: `Clocked in at ${t(result.clockInAt)}${result.flags.includes('late') ? ' (recorded as late)' : ''}`,
      }
    } else {
      const result = await kioskClockOut(session.value.token)
      doneMessage.value = {
        title: `Goodbye, ${name}`,
        detail: `Clocked out at ${t(result.clockOutAt)} · ${hm(result.workedMinutes)} worked${result.breakMinutes ? ` (after a ${result.breakMinutes} min break)` : ''}`
          + (result.stoppedTimers.length ? ` · timer stopped on ${result.stoppedTimers.join(', ')}` : ''),
      }
    }
    step.value = 'done'
    loadBoard()
    backToPin(4500)
  } catch (err) {
    if (isKioskLockedError(err)) relock()
    else actionError.value = errorOf(err, 'Something went wrong — try again')
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  clockTimer = setInterval(() => { now.value = new Date() }, 15000)
  try {
    const status = await getKioskStatus()
    companyName.value = status.companyName
    if (!status.hasMasterPin) { step.value = 'setup'; return }
    boardTimer = setInterval(() => { if (step.value === 'pin') loadBoard() }, 60000)
    if (!getKioskDeviceToken()) { step.value = 'locked'; return }
    step.value = 'pin'
    await loadBoard() // an out-of-date device token flips this back to 'locked'
  } catch {
    step.value = 'disabled'
  }
})
onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (boardTimer) clearInterval(boardTimer)
  if (resetTimer) clearTimeout(resetTimer)
})
</script>

<template>
  <div class="min-h-screen bg-sidebar text-white flex flex-col select-none">
    <header class="flex items-center justify-between px-8 py-5 border-b border-white/10">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center"><Gauge class="w-5 h-5 text-white" /></div>
        <span class="text-lg font-semibold">{{ companyName || 'Cruise' }}</span>
      </div>
      <div class="flex items-center gap-5">
        <button v-if="step === 'pin'" class="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10" title="Lock this kiosk" aria-label="Lock this kiosk" @click="lockNow">
          <Lock class="w-4 h-4" />
        </button>
        <div class="text-right">
          <p class="text-3xl font-bold leading-none tabular-nums">{{ timeLabel }}</p>
          <p class="text-sm text-white/50 mt-1">{{ dateLabel }}</p>
        </div>
      </div>
    </header>

    <main class="flex-1 flex items-center justify-center p-6">
      <p v-if="step === 'loading'" class="text-white/50 animate-pulse">Loading…</p>

      <div v-else-if="step === 'disabled'" class="text-center max-w-md">
        <p class="text-xl font-semibold mb-2">Kiosk clocking is switched off</p>
        <p class="text-white/50 text-sm">A manager can turn it on under Settings → Working time.</p>
      </div>

      <div v-else-if="step === 'setup'" class="text-center max-w-md">
        <Lock class="w-10 h-10 text-white/40 mx-auto mb-4" />
        <p class="text-xl font-semibold mb-2">Kiosk not set up yet</p>
        <p class="text-white/50 text-sm">A master PIN has not been configured. A manager can set one under Settings → Working time.</p>
      </div>

      <div v-else-if="step === 'locked'" class="flex flex-col items-center">
        <Lock class="w-9 h-9 text-white/50 mb-3" />
        <h1 class="text-2xl font-semibold mb-1">Kiosk locked</h1>
        <p class="text-white/50 text-sm mb-6">A manager enters the master PIN to unlock this kiosk</p>
        <KioskPinPad :maxLength="8" :error="masterError" :isLoading="busy" @submit="onMasterPin" />
      </div>

      <div v-else-if="step === 'pin'" class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full max-w-5xl">
        <div class="flex flex-col items-center">
          <h1 class="text-2xl font-semibold mb-1">Clock in / out</h1>
          <p class="text-white/50 text-sm mb-6">Enter your PIN</p>
          <KioskPinPad :error="pinError" :isLoading="busy" @submit="onPin" />
        </div>
        <div class="hidden lg:block rounded-2xl border border-white/10 bg-white/5 p-6 self-stretch">
          <div class="flex items-center gap-2 mb-4 text-white/70">
            <Users class="w-4 h-4" /><h2 class="text-sm font-semibold uppercase tracking-wide">In now ({{ onSite.length }})</h2>
          </div>
          <p v-if="onSite.length === 0" class="text-white/40 text-sm">Nobody is clocked in.</p>
          <ul v-else class="space-y-2 max-h-[420px] overflow-y-auto">
            <li v-for="(p, i) in onSite" :key="i" class="flex items-center justify-between text-sm">
              <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400" />{{ p.firstName }} {{ p.lastInitial }}</span>
              <span class="text-white/40 tabular-nums">since {{ t(p.clockInTime) }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div v-else-if="step === 'confirm' && session" class="text-center w-full max-w-md">
        <div class="w-20 h-20 mx-auto rounded-full bg-brand-500 flex items-center justify-center text-3xl font-bold mb-4">
          {{ session.user.firstName.charAt(0) }}{{ session.user.lastName.charAt(0) }}
        </div>
        <h1 class="text-3xl font-semibold">{{ session.user.firstName }} {{ session.user.lastName }}</h1>
        <p class="text-white/50 mt-1 mb-8">
          {{ session.action === 'clock-out' && session.clockedInSince ? `Clocked in since ${t(session.clockedInSince)}` : 'Not clocked in' }}
        </p>
        <p v-if="actionError" class="text-red-400 text-sm mb-4">{{ actionError }}</p>
        <button
          :disabled="busy"
          :class="['w-full inline-flex items-center justify-center gap-3 rounded-2xl text-2xl font-semibold py-6 transition-colors disabled:opacity-50',
            session.action === 'clock-in' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-500']"
          @click="confirm"
        >
          <component :is="session.action === 'clock-in' ? LogIn : LogOut" class="w-7 h-7" />
          {{ busy ? '…' : session.action === 'clock-in' ? 'Clock in' : 'Clock out' }}
        </button>
        <button class="mt-5 text-white/50 hover:text-white text-sm" :disabled="busy" @click="backToPin()">Not you? Cancel</button>
      </div>

      <div v-else-if="step === 'done'" class="text-center">
        <CheckCircle2 class="w-20 h-20 text-green-400 mx-auto mb-4" />
        <h1 class="text-3xl font-semibold">{{ doneMessage.title }}</h1>
        <p class="text-white/60 mt-2 text-lg">{{ doneMessage.detail }}</p>
      </div>
    </main>
  </div>
</template>
