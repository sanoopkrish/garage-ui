import { onBeforeUnmount } from 'vue'
import api from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { ToastService } from '@/services/toast.service'

/**
 * Idle-session logout (proposal §6). Fetches the tenant's security policy and,
 * when idleTimeoutMinutes > 0, logs the user out after that much inactivity
 * (pointer/keyboard/scroll/visibility). The server independently rejects
 * refresh attempts past the same limit, so this is UX — the enforcement is
 * server-side.
 */
export function useIdleLogout() {
  const authStore = useAuthStore()
  let timer: ReturnType<typeof setTimeout> | null = null
  let timeoutMs = 0
  const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

  function reset() {
    if (!timeoutMs) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      teardown()
      ToastService.warning('You have been signed out due to inactivity')
      await authStore.logout()
    }, timeoutMs)
  }

  function teardown() {
    if (timer) clearTimeout(timer)
    timer = null
    events.forEach((e) => window.removeEventListener(e, reset))
  }

  async function start() {
    try {
      const response = await api.get('/company/security-policy')
      const policy = response.data?.data ?? response.data
      timeoutMs = (Number(policy?.idleTimeoutMinutes) || 0) * 60 * 1000
    } catch {
      timeoutMs = 0
    }
    if (!timeoutMs) return
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
  }

  onBeforeUnmount(teardown)

  return { start, teardown }
}
