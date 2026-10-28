<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Siren, Phone, X } from 'lucide-vue-next'
import api from '@/api/client'
import { useCompanyStore } from '@/stores/company.store'

/**
 * Field safety panic button — floats on every /field screen.
 * Confirm sheet prevents pocket presses; geolocation is best-effort only
 * (3s timeout, silently skipped when denied) so the alert is never blocked.
 */
const route = useRoute()
const companyStore = useCompanyStore()

const state = ref<'idle' | 'confirm' | 'sending' | 'sent' | 'failed'>('idle')
const note = ref('')

function getPosition(): Promise<{ latitude?: number; longitude?: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({})
    const timer = setTimeout(() => resolve({}), 3000)
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }) },
      () => { clearTimeout(timer); resolve({}) },
      { enableHighAccuracy: true, timeout: 2500, maximumAge: 60000 },
    )
  })
}

async function send() {
  state.value = 'sending'
  try {
    const coords = await getPosition()
    const jobId = route.name === 'field-job-detail' ? (route.params.id as string) : undefined
    await api.post('/notifications/panic', { note: note.value.trim() || undefined, jobId, ...coords })
    state.value = 'sent'
  } catch {
    state.value = 'failed'
  }
}

function reset() {
  state.value = 'idle'
  note.value = ''
}

const officePhone = () => companyStore.company?.companyPhone ?? null
</script>

<template>
  <!-- Floating SOS -->
  <button
    v-if="state === 'idle'"
    @click="state = 'confirm'"
    class="fixed bottom-5 right-4 z-30 w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/40 flex flex-col items-center justify-center active:scale-95 transition-transform"
    aria-label="Emergency — alert the office"
  >
    <Siren class="w-5 h-5" />
    <span class="text-[9px] font-bold tracking-widest">SOS</span>
  </button>

  <!-- Confirm sheet -->
  <div v-else class="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center" @click.self="state === 'confirm' && reset()">
    <div class="w-full sm:max-w-sm bg-white dark:bg-dark-surface rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
      <template v-if="state === 'confirm' || state === 'sending'">
        <div class="flex items-start justify-between">
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Siren class="w-5 h-5 text-red-600" /> Send emergency alert?
          </h2>
          <button class="p-1 text-slate-400 hover:text-slate-600" aria-label="Cancel" @click="reset"><X class="w-5 h-5" /></button>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          The office will be notified immediately with your name{{ route.name === 'field-job-detail' ? ', this job' : '' }} and your location (if allowed).
        </p>
        <input
          v-model="note"
          type="text"
          maxlength="200"
          placeholder="What's happening? (optional)"
          class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <div class="flex gap-2">
          <button
            class="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm disabled:opacity-60"
            :disabled="state === 'sending'"
            @click="send"
          >
            {{ state === 'sending' ? 'Sending…' : 'SEND ALERT' }}
          </button>
          <button class="px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border text-sm text-slate-600 dark:text-slate-300" :disabled="state === 'sending'" @click="reset">
            Cancel
          </button>
        </div>
      </template>

      <template v-else-if="state === 'sent'">
        <div class="text-center py-2 space-y-3">
          <div class="w-14 h-14 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Siren class="w-7 h-7 text-green-600" />
          </div>
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">Alert sent</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">The office has been notified and can see your location.</p>
          <a
            v-if="officePhone()"
            :href="`tel:${officePhone()}`"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold"
          >
            <Phone class="w-4 h-4" /> Call the office
          </a>
          <div><button class="text-sm text-slate-400 hover:text-slate-600 mt-1" @click="reset">Close</button></div>
        </div>
      </template>

      <template v-else>
        <div class="text-center py-2 space-y-3">
          <h2 class="text-lg font-bold text-red-600">Alert could not be sent</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">Check your connection and try again — or call the office directly.</p>
          <a
            v-if="officePhone()"
            :href="`tel:${officePhone()}`"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"
          >
            <Phone class="w-4 h-4" /> Call the office
          </a>
          <div class="flex gap-2 justify-center">
            <button class="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold" @click="send">Retry</button>
            <button class="px-4 py-2 rounded-xl border border-slate-200 dark:border-dark-border text-sm text-slate-600 dark:text-slate-300" @click="reset">Close</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
