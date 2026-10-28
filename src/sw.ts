/// <reference lib="webworker" />
// Custom service worker (injectManifest) — replicates the previous generateSW
// behaviour (precache app shell, network-first API) and adds Web Push handlers.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | { url: string; revision: string | null })[]
}

// autoUpdate: activate new SW immediately
self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA navigation fallback — API routes excluded. Dev has an empty precache
// manifest, where createHandlerBoundToURL throws at SW evaluation — skip it
// there (vite serves index.html itself; the dev SW only needs push handling).
if (!import.meta.env.DEV) {
  registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api/] }))
}

// API always network-first so job data stays fresh
registerRoute(
  ({ url }) => url.pathname.includes('/api/v1/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 })],
  }),
)

// ---- Web Push ----

interface PushData {
  title: string
  body: string
  url?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data: PushData = { title: 'Cruise', body: '' }
  try {
    data = { ...data, ...event.data.json() }
  } catch {
    data.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag,
      data: { url: data.url ?? '/field' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url: string = event.notification.data?.url ?? '/field'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const existing = clients.find((c): c is WindowClient => 'focus' in c)
      if (existing) {
        await existing.navigate(url)
        return existing.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
