<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Siren, MapPin, Bell, X } from 'lucide-vue-next'
import { useNotificationsStore } from '@/stores/notifications.store'
import type { AppNotification } from '@/api/notifications.api'

/**
 * Custom urgency view for panic alerts (NOT a toast): full-width red banner
 * pinned to the top of the screen, pulsing, stays until acknowledged.
 * Renders every queued alert — two engineers can panic at once.
 */
const store = useNotificationsStore()
const router = useRouter()

function mapsUrl(alert: AppNotification): string | null {
  const url = (alert as any).metadata?.mapsUrl
  return typeof url === 'string' && url.startsWith('https://') ? url : null
}

function openLocation(alert: AppNotification) {
  const url = mapsUrl(alert)
  if (url) window.open(url, '_blank', 'noopener')
}

function viewNotifications(alert: AppNotification) {
  store.dismissPanicAlert(alert.id)
  router.push('/notifications')
}

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="store.panicAlerts.length" class="fixed top-0 inset-x-0 z-[100] space-y-1.5 p-2 sm:p-3 pointer-events-none">
      <div
        v-for="alert in store.panicAlerts"
        :key="alert.id"
        class="pointer-events-auto mx-auto max-w-2xl rounded-xl border-2 border-red-500 bg-red-600 text-white shadow-2xl shadow-red-900/40 overflow-hidden animate-panic-pulse"
        role="alertdialog"
        aria-live="assertive"
      >
        <div class="flex items-start gap-3 p-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Siren class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-sm sm:text-base leading-snug">{{ alert.title || '🚨 PANIC ALERT' }}</p>
            <p class="text-sm text-red-50 mt-0.5">{{ alert.message?.replace(/https?:\/\/\S+/g, '').trim() }}</p>
            <p class="text-xs text-red-200 mt-1">{{ formatTime(alert.createdAt) }}</p>
            <div class="flex flex-wrap gap-2 mt-3">
              <button
                v-if="mapsUrl(alert)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-red-700 text-xs font-bold hover:bg-red-50"
                @click="openLocation(alert)"
              >
                <MapPin class="w-3.5 h-3.5" /> View location
              </button>
              <button
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 text-white text-xs font-semibold hover:bg-white/25"
                @click="viewNotifications(alert)"
              >
                <Bell class="w-3.5 h-3.5" /> All notifications
              </button>
            </div>
          </div>
          <button
            class="flex-shrink-0 p-1.5 rounded-lg text-red-100 hover:bg-white/15"
            aria-label="Acknowledge alert"
            title="Acknowledge"
            @click="store.dismissPanicAlert(alert.id)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes panic-pulse {
  0%, 100% { box-shadow: 0 10px 40px rgba(127, 29, 29, 0.5); }
  50% { box-shadow: 0 10px 60px rgba(239, 68, 68, 0.9); }
}
.animate-panic-pulse {
  animation: panic-pulse 1.2s ease-in-out infinite;
}
</style>
