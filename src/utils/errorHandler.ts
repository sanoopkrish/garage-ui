import { ToastService } from '@/services/toast.service'

/**
 * Last-resort net for uncaught errors. Anything the user can act on is already
 * toasted contextually where it happens (views/stores) — errors landing here
 * are internal, so raw messages are only shown in dev.
 *
 * - dev: raw message as a toast (surfaces bugs immediately)
 * - prod: full error to the console; a generic toast only for Vue render
 *   errors (UI may be broken); background rejections (service worker,
 *   prefetch, third-party) stay silent
 */
export function handleError(err: unknown, source: 'vue' | 'rejection' = 'vue'): void {
  console.error(err)

  if (import.meta.env.DEV) {
    if (err instanceof Error) ToastService.error(err.message)
    return
  }

  if (source === 'vue') {
    ToastService.error('Something went wrong — please refresh the page. If it keeps happening, contact support.')
  }
}
