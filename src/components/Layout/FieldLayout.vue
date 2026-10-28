<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Gauge, ArrowLeft, LogOut, Bell, BellRing, CircleQuestionMark } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/composables/usePermissions'
import { useNotificationsStore } from '@/stores/notifications.store'
import { usePushNotifications } from '@/composables/usePushNotifications'
import { ToastService } from '@/services/toast.service'
import PanicButton from '@/components/Field/PanicButton.vue'
import ClockWidget from '@/components/Hr/ClockWidget.vue'
import HelpDrawer from '@/components/Help/HelpDrawer.vue'
import { useHelpStore } from '@/stores/help.store'
import FieldReceiptButton from '@/components/Field/FieldReceiptButton.vue'

defineProps<{
  title: string
  /** Route to go back to; omit to hide the back button */
  backTo?: string
}>()

const router = useRouter()
const route = useRoute()

// Sprint 18 — top-level field pages share a clock card and a Jobs / Week switch
const { hasPermission: canFindKit } = usePermissions('menus.assets.register.read')
const fieldTabs = computed(() => [
  { to: '/field', label: 'Jobs' },
  { to: '/field/timesheet', label: 'My week' },
  ...(canFindKit.value ? [{ to: '/field/kit', label: 'Find kit' }] : []),
])
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const push = usePushNotifications()
const help = useHelpStore()

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

      <button
        @click="help.openForRoute(route.name as string)"
        class="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Help"
      >
        <CircleQuestionMark class="w-5 h-5" />
      </button>

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
      <template v-if="!backTo">
        <ClockWidget variant="card" />
        <FieldReceiptButton />
        <div class="flex gap-1 p-1 mb-4 rounded-xl bg-slate-200/70 dark:bg-white/10">
          <router-link
            v-for="tab in fieldTabs" :key="tab.to" :to="tab.to" class="flex-1"
            :class="['text-center py-2 rounded-lg text-sm font-semibold transition-colors',
              route.path === tab.to ? 'bg-white dark:bg-dark-surface text-slate-800 dark:text-white shadow-sm' : 'text-slate-500']"
          >{{ tab.label }}</router-link>
        </div>
      </template>
      <slot />
    </main>

    <PanicButton />
    <HelpDrawer />
  </div>
</template>
