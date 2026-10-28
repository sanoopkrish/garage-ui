import './assets/css/index.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia } from './stores/piniaInstance'
import { Toast, toastOptions } from './plugins/toast'
import clickOutside from './directives/clickOutside'
import { vPermission } from './composables/usePermissions'
import { useAuthStore } from './stores/auth'
import { handleError } from './utils/errorHandler'

const app = createApp(App)

app.directive('click-outside', clickOutside)
app.directive('permission', vPermission)

app.config.errorHandler = (err) => handleError(err, 'vue')
window.addEventListener('unhandledrejection', (e) => handleError(e.reason, 'rejection'))

app.use(Toast, toastOptions)
app.use(pinia)
app.use(router)

const init = async () => {
  try {
    await router.isReady()
    const authStore = useAuthStore(pinia)
    // The wall-tablet kiosk is never logged in — don't try to restore a session there
    // (a failed refresh would bounce the tablet to the login page)
    if (router.currentRoute.value.name !== 'kiosk') await authStore.initialize()
    else authStore.initialized = true
  } catch (e) {
    console.error('Init failed:', e)
  }
  app.mount('#app')
}

init()
