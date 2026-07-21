import { ToastService } from '@/services/toast.service'

export function handleError(err: unknown): void {
  if (err instanceof Error) {
    ToastService.error(err.message)
  }
  console.error(err)
}
