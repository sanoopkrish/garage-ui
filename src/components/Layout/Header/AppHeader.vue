<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, Sun, Moon, LogOut, User, ChevronDown } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useDarkMode } from '@/composables/useDarkMode'

const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const router = useRouter()
const { dark, toggle: toggleDark } = useDarkMode()
const dropdownOpen = ref(false)
const notificationsOpen = ref(false)

onMounted(() => {
  notificationsStore.fetchNotifications()
})

const badgeLabel = (count: number): string => (count > 9 ? '9+' : String(count))

const formatDate = (iso: string): string => {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const recentNotifications = () => notificationsStore.notifications.slice(0, 10)

const handleMarkRead = async (id: string) => {
  await notificationsStore.markRead(id)
}

const handleMarkAllRead = async () => {
  await notificationsStore.markAllRead()
}

const logout = async () => {
  authStore.logout()
  router.push('/auth/login')
}
</script>

<template>
  <header class="h-14 bg-white dark:bg-dark-surface border-b border-slate-100 dark:border-dark-border flex items-center justify-between px-6 flex-shrink-0">
    <!-- Page title slot -->
    <div class="flex items-center gap-2">
      <slot name="title">
        <span class="text-slate-700 dark:text-slate-200 font-semibold text-base">Dashboard</span>
      </slot>
    </div>

    <!-- Right actions -->
    <div class="flex items-center gap-2">
      <!-- Dark mode -->
      <button
        @click="toggleDark"
        class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors"
      >
        <Sun v-if="dark" class="w-4.5 h-4.5" />
        <Moon v-else class="w-4.5 h-4.5" />
      </button>

      <!-- Notifications -->
      <div class="relative" v-click-outside="() => notificationsOpen = false">
        <button
          @click="notificationsOpen = !notificationsOpen"
          class="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors"
        >
          <Bell class="w-4.5 h-4.5" />
          <!-- Badge: only shown when there are unread notifications -->
          <span
            v-if="notificationsStore.unreadCount > 0"
            class="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold leading-none"
          >
            {{ badgeLabel(notificationsStore.unreadCount) }}
          </span>
        </button>

        <!-- Notifications dropdown -->
        <Transition name="dropdown">
          <div
            v-if="notificationsOpen"
            class="absolute right-0 mt-1 w-80 bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-xl shadow-lg z-50 flex flex-col"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-dark-border flex-shrink-0">
              <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</span>
              <button
                v-if="notificationsStore.unreadCount > 0"
                @click="handleMarkAllRead"
                class="text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors"
              >
                Mark all read
              </button>
            </div>

            <!-- List -->
            <div
              class="overflow-y-auto"
              style="max-height: 320px"
            >
              <!-- Empty state -->
              <div
                v-if="recentNotifications().length === 0"
                class="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500 text-sm"
              >
                <Bell class="w-8 h-8 mb-2 opacity-40" />
                No notifications
              </div>

              <!-- Notification items -->
              <button
                v-for="item in recentNotifications()"
                :key="item.id"
                @click="handleMarkRead(item.id)"
                class="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                :class="{ 'bg-brand-50 dark:bg-brand-900/10': !item.read }"
              >
                <!-- Unread dot indicator -->
                <span
                  class="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full"
                  :class="item.read ? 'bg-transparent' : 'bg-brand-500'"
                />

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm text-slate-800 dark:text-slate-100 truncate"
                    :class="{ 'font-medium': !item.read }"
                  >
                    {{ item.title }}
                  </p>
                  <p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">
                    {{ item.message }}
                  </p>
                  <p class="text-xs text-slate-400 dark:text-slate-600 mt-1">
                    {{ formatDate(item.createdAt) }}
                  </p>
                </div>
              </button>
            </div>

            <!-- Footer -->
            <div
              v-if="recentNotifications().length > 0"
              class="border-t border-slate-100 dark:border-dark-border px-4 py-2.5 flex-shrink-0"
            >
              <span class="text-xs text-slate-400 dark:text-slate-500 cursor-not-allowed select-none">
                View all notifications
              </span>
            </div>
          </div>
        </Transition>
      </div>

      <!-- User menu -->
      <div class="relative" v-click-outside="() => dropdownOpen = false">
        <button
          @click="dropdownOpen = !dropdownOpen"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors"
        >
          <div class="w-7 h-7 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {{ authStore.fullName.charAt(0) || 'U' }}
          </div>
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">
            {{ authStore.fullName || 'User' }}
          </span>
          <ChevronDown class="w-4 h-4 text-slate-400" />
        </button>

        <!-- Dropdown -->
        <Transition name="dropdown">
          <div
            v-if="dropdownOpen"
            class="absolute right-0 mt-1 w-48 bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-xl shadow-lg py-1 z-50"
          >
            <router-link
              to="/admin/settings"
              @click="dropdownOpen = false"
              class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <User class="w-4 h-4" /> Profile
            </router-link>
            <hr class="my-1 border-slate-100 dark:border-dark-border" />
            <button
              @click="logout"
              class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut class="w-4 h-4" /> Sign out
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<style scoped>
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
