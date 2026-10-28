<script setup lang="ts">
import { watch } from 'vue'
import PanicAlertOverlay from '@/components/Notifications/PanicAlertOverlay.vue'
import { useAuthStore } from '@/stores/auth'
import { useIdleLogout } from '@/composables/useIdleLogout'

const authStore = useAuthStore()
const idle = useIdleLogout()

// Idle-session logout (§6): armed once signed in, torn down on logout
watch(
  () => authStore.isAuthenticated,
  (authed) => {
    if (authed) idle.start()
    else idle.teardown()
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
  <!-- App-level so panic alerts interrupt on every screen (admin + field) -->
  <PanicAlertOverlay />
</template>
