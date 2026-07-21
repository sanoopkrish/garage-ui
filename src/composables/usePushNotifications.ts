import { onMounted, ref } from 'vue'
import { getPushPublicKey, subscribePush, unsubscribePush } from '@/api/push.api'

function base64UrlToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/**
 * Web Push enable/disable for the current device (Field PWA).
 * `supported` is false on http, unsupported browsers, or when the server
 * has no VAPID keys configured — callers should hide the toggle then.
 */
export function usePushNotifications() {
  const supported = ref(false)
  const enabled = ref(false)
  const busy = ref(false)

  async function refresh() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !window.isSecureContext) return
    const publicKey = await getPushPublicKey().catch(() => null)
    if (!publicKey) return
    supported.value = true
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    enabled.value = !!subscription && Notification.permission === 'granted'
  }

  async function enable(): Promise<boolean> {
    busy.value = true
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return false
      const publicKey = await getPushPublicKey()
      if (!publicKey) return false
      const registration = await navigator.serviceWorker.ready
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(publicKey),
        }))
      await subscribePush(subscription.toJSON())
      enabled.value = true
      return true
    } catch {
      return false
    } finally {
      busy.value = false
    }
  }

  async function disable(): Promise<void> {
    busy.value = true
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await unsubscribePush(subscription.endpoint).catch(() => {})
        await subscription.unsubscribe()
      }
      enabled.value = false
    } finally {
      busy.value = false
    }
  }

  onMounted(refresh)

  return { supported, enabled, busy, enable, disable }
}
