<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Gauge, ArrowLeft, LogOut, Bell, BellRing } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications.store'
import { usePushNotifications } from '@/composables/usePushNotifications'
import { ToastService } from '@/services/toast.service'

defineProps<{
  title: string
  /** Route to go back to; omit to hide the back button */
  backTo?: string
}>()

const router = useRouter()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const push = usePushNotifications()

async function togglePush() {
  if (!push.supported.value || push.busy.value) return
  if (push.enabled.value) {
    await push.disable()
    ToastService.success('Push notifications turned off on this device')
  } else {
    const ok = await push.enable()
    if (ok) ToastService.success('Push notifications enabled — you will be notified even when the app is closed')
    else ToastService.error('Could not enable notifications — check the browser permission')
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-dark-bg flex flex-col">
    <!-- Sticky mobile top bar -->
    <header
      class="sticky top-0 z-20 flex items-center gap-3 px-4 h-14 bg-sidebar border-b border-white/10 text-white"
    >
      <button
        v-if="backTo"
        @click="router.push(backTo)"
        class="p-1.5 -ml-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Back"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div v-else class="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
        <Gauge class="w-4 h-4 text-white" />
      </div>

      <h1 class="flex-1 font-semibold text-base truncate">{{ title }}</h1>

      <component
        :is="push.supported.value ? 'button' : 'div'"
        class="relative"
        :class="push.supported.value ? 'p-1.5 -m-1.5 rounded-lg hover:bg-white/10 transition-colors' : ''"
        :aria-label="push.enabled.value ? 'Disable push notifications' : 'Enable push notifications'"
        @click="togglePush"
      >
        <BellRing v-if="push.enabled.value" class="w-5 h-5 text-brand-400" />
        <Bell v-else class="w-5 h-5 text-slate-300" />
        <span
          v-if="notificationsStore.unreadCount > 0"
          class="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-brand-500 rounded-full text-[10px] font-bold flex items-center justify-center"
        >
          {{ notificationsStore.unreadCount }}
        </span>
      </component>

      <button
        @click="authStore.logout()"
        class="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Sign out"
      >
        <LogOut class="w-5 h-5" />
      </button>
    </header>

    <main class="flex-1 w-full max-w-2xl mx-auto p-4 pb-24">
      <slot />
    </main>
  </div>
</template>
