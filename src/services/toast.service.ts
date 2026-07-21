import { useToast } from 'vue-toastification'

const toast = useToast()

export const ToastService = {
  success(message: string) {
    toast.success(message, { timeout: 3000 })
  },
  error(message: string) {
    toast.error(message, { timeout: 5000 })
  },
  info(message: string) {
    toast.info(message, { timeout: 3000 })
  },
  warning(message: string) {
    toast.warning(message, { timeout: 4000 })
  },
}
