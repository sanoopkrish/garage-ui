<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { linkifyHtml } from '@/utils/linkify'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { Bell, BellDot, CheckCheck, CheckCircle2, Trash2, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { getNotifications, markRead, markAllRead, deleteNotification, type AppNotification } from '@/api/notifications.api'
import { useNotificationsStore } from '@/stores/notifications.store'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

const store = useNotificationsStore()

const items = ref<AppNotification[]>([])
const total = ref(0)
const unreadTotal = ref(0)
const loading = ref(true)
const page = ref(1)
const pageSize = 20

type Filter = 'all' | 'unread' | 'read'
const filter = ref<Filter>('all')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const readTotal = computed(() => Math.max(0, grandTotal.value - unreadTotal.value))
const grandTotal = ref(0)

async function load() {
  loading.value = true
  try {
    const [pageResult, allResult, unreadResult] = await Promise.all([
      getNotifications({
        unreadOnly: false,
        page: page.value,
        limit: pageSize,
        read: filter.value === 'all' ? undefined : filter.value === 'read',
      }),
      getNotifications({ unreadOnly: false, page: 1, limit: 1 }),
      getNotifications({ unreadOnly: false, page: 1, limit: 1, read: false }),
    ])
    items.value = pageResult.notifications
    total.value = pageResult.total
    grandTotal.value = allResult.total
    unreadTotal.value = unreadResult.total
  } catch {
    ToastService.error('Failed to load notifications')
  } finally {
    loading.value = false
  }
}

function setFilter(f: Filter) {
  filter.value = f
  page.value = 1
  load()
}

function changePage(delta: number) {
  const next = page.value + delta
  if (next < 1 || next > totalPages.value) return
  page.value = next
  load()
}

async function onMarkRead(item: AppNotification) {
  if (item.read) return
  await markRead(item.id).catch(() => {})
  item.read = true
  unreadTotal.value = Math.max(0, unreadTotal.value - 1)
  store.fetchNotifications() // keep the header bell in sync
}

async function onMarkAllRead() {
  await markAllRead().catch(() => {})
  items.value.forEach((n) => (n.read = true))
  unreadTotal.value = 0
  store.fetchNotifications()
  ToastService.success('All notifications marked as read')
}

async function onDelete(item: AppNotification) {
  const result = await showConfirmDialog('This notification will be deleted.')
  if (!result.isConfirmed) return
  await deleteNotification(item.id).catch(() => {})
  store.fetchNotifications()
  load()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const priorityVariant = (p: string) => (p === 'urgent' ? 'cancelled' : p === 'high' ? 'pending' : 'open')

onMounted(load)
</script>

<template>
  <DefaultLayout>
    <div class="max-w-3xl mx-auto">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Notifications</h1>
        <UiButton v-if="unreadTotal > 0" variant="secondary" @click="onMarkAllRead">
          <CheckCheck class="w-4 h-4" /> Mark all read
        </UiButton>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="card !p-4 flex items-center justify-between">
          <div>
            <p class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ grandTotal }}</p>
            <p class="text-xs text-slate-500">Total</p>
          </div>
          <Bell class="w-8 h-8 text-brand-500/40" />
        </div>
        <div class="card !p-4 flex items-center justify-between">
          <div>
            <p class="text-2xl font-bold text-amber-500">{{ unreadTotal }}</p>
            <p class="text-xs text-slate-500">Unread</p>
          </div>
          <BellDot class="w-8 h-8 text-amber-500/40" />
        </div>
        <div class="card !p-4 flex items-center justify-between">
          <div>
            <p class="text-2xl font-bold text-green-600">{{ readTotal }}</p>
            <p class="text-xs text-slate-500">Read</p>
          </div>
          <CheckCircle2 class="w-8 h-8 text-green-500/40" />
        </div>
      </div>

      <!-- Filter chips -->
      <div class="flex gap-2 mb-4">
        <button
          v-for="f in (['all', 'unread', 'read'] as const)"
          :key="f"
          @click="setFilter(f)"
          :class="[
            'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
            filter === f
              ? 'bg-brand-500 text-white'
              : 'bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:border-brand-400',
          ]"
        >
          {{ f }}
        </button>
      </div>

      <!-- List -->
      <div v-if="loading" class="card h-40 animate-pulse bg-slate-100 dark:bg-white/5" />

      <div v-else-if="items.length" class="card !p-0 divide-y divide-slate-100 dark:divide-dark-border">
        <div
          v-for="item in items"
          :key="item.id"
          class="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
          @click="onMarkRead(item)"
        >
          <span class="mt-2 flex-shrink-0 w-2 h-2 rounded-full" :class="item.read ? 'bg-transparent' : 'bg-brand-500'" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm text-slate-800 dark:text-slate-100 truncate" :class="{ 'font-semibold': !item.read }">
                {{ item.title }}
              </p>
              <UiBadge v-if="item.priority === 'urgent' || item.priority === 'high'" :variant="priorityVariant(item.priority)">
                {{ item.priority }}
              </UiBadge>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5" v-html="linkifyHtml(item.message)" />
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">{{ formatDate(item.createdAt) }}</p>
          </div>
          <button
            class="p-1.5 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
            title="Delete"
            @click.stop="onDelete(item)"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div v-else class="card py-14 text-center text-slate-400">
        <Bell class="w-10 h-10 mx-auto mb-3 opacity-30" />
        No {{ filter === 'all' ? '' : filter }} notifications
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 text-sm text-slate-500">
        <span>Page {{ page }} of {{ totalPages }} · {{ total }} notifications</span>
        <div class="flex gap-1">
          <button
            class="p-2 rounded-lg border border-slate-200 dark:border-dark-border disabled:opacity-40 hover:border-brand-400 transition-colors"
            :disabled="page <= 1"
            @click="changePage(-1)"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button
            class="p-2 rounded-lg border border-slate-200 dark:border-dark-border disabled:opacity-40 hover:border-brand-400 transition-colors"
            :disabled="page >= totalPages"
            @click="changePage(1)"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>
