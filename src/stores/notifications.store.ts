import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { io, Socket } from 'socket.io-client'
import type { AppNotification } from '@/api/notifications.api'
import {
  getNotifications,
  markRead as apiMarkRead,
  markAllRead as apiMarkAllRead,
  deleteNotification as apiDeleteNotification,
} from '@/api/notifications.api'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<AppNotification[]>([])
  const total = ref(0)
  const loading = ref(false)
  const socket = ref<Socket | null>(null)
  /** Live panic alerts awaiting acknowledgement (rendered by PanicAlertOverlay) */
  const panicAlerts = ref<AppNotification[]>([])

  const unreadCount = computed(() => total.value)

  function dismissPanicAlert(id: string): void {
    panicAlerts.value = panicAlerts.value.filter((a) => a.id !== id)
  }

  async function fetchNotifications(unreadOnly?: boolean): Promise<void> {
    loading.value = true
    try {
      const result = await getNotifications({ unreadOnly })
      notifications.value = result.notifications
      total.value = result.total
    } finally {
      loading.value = false
    }
  }

  async function markRead(id: string): Promise<void> {
    await apiMarkRead(id)
    const notification = notifications.value.find((n) => n.id === id)
    if (notification && !notification.read) {
      notification.read = true
      total.value = Math.max(0, total.value - 1)
    }
  }

  async function markAllRead(): Promise<void> {
    await apiMarkAllRead()
    notifications.value.forEach((n) => { n.read = true })
    total.value = 0
  }

  async function deleteNotification(id: string): Promise<void> {
    notifications.value = notifications.value.filter((n) => n.id !== id)
    total.value = Math.max(0, total.value - 1)
    await apiDeleteNotification(id)
  }

  async function initialize(): Promise<void> {
    await fetchNotifications()
  }

  /** Real-time in-app notifications via the /notifications Socket.io namespace (cms pattern) */
  function initializeSocket(token: string): void {
    if (socket.value) {
      socket.value.disconnect()
    }

    // Dev goes through the Vite ws proxy (origin); production uses the API URL
    const base = import.meta.env.DEV
      ? `${window.location.origin}/api/v1`
      : import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api/v1`
    const wsUrl = base.replace(/^http/, 'ws').replace('/api/v1', '') + '/notifications'

    socket.value = io(wsUrl, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket'],
      extraHeaders: { Authorization: `Bearer ${token}` },
    })

    socket.value.on('notification', (notification: AppNotification) => {
      notifications.value.unshift(notification)
      // Keep only recent notifications in memory (cms cap)
      if (notifications.value.length > 50) {
        notifications.value = notifications.value.slice(0, 50)
      }
      total.value += 1

      // Panic alerts must interrupt: queued for the full-screen PanicAlertOverlay,
      // which stays up until someone acknowledges it
      if (notification.type === 'PANIC_ALERT') {
        panicAlerts.value.push(notification)
      }
    })
  }

  function disconnectSocket(): void {
    socket.value?.disconnect()
    socket.value = null
  }

  return {
    notifications,
    socket,
    panicAlerts,
    dismissPanicAlert,
    unreadCount,
    total,
    loading,
    fetchNotifications,
    initializeSocket,
    disconnectSocket,
    markRead,
    markAllRead,
    deleteNotification,
    initialize,
  }
})
