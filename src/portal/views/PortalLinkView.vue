<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2, LinkIcon } from 'lucide-vue-next'
import PortalLayout from '../PortalLayout.vue'
import { usePortalStore } from '../portal.store'
import { portalErrorCode, portalErrorMessage } from '../portal.client'

/** Sprint 29 — landing page of a sign-in link: swaps the token for a session, then goes home. */
const route = useRoute()
const router = useRouter()
const portal = usePortalStore()
const error = ref('')

onMounted(async () => {
  const token = String(route.params.token ?? '')
  try {
    await portal.exchange(token)
    router.replace({ name: 'portal-home' })
  } catch (e: any) {
    if (portalErrorCode(e) === 'PORTAL_DISABLED') portal.disabled = true
    error.value = portalErrorMessage(e, 'This link has expired or was already used.')
  }
})
</script>

<template>
  <PortalLayout bare>
    <div class="max-w-sm mx-auto pt-12 text-center">
      <div v-if="!error" class="card">
        <Loader2 class="w-8 h-8 animate-spin text-brand-500 mx-auto mb-3" />
        <p class="text-sm text-slate-600 dark:text-slate-300">Signing you in…</p>
      </div>
      <div v-else class="card">
        <LinkIcon class="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <h1 class="font-semibold text-slate-800 dark:text-slate-100">That link didn't work</h1>
        <p class="text-sm text-slate-500 mt-2">{{ error }}</p>
        <router-link :to="{ name: 'portal-signin' }" class="inline-block mt-5 px-4 py-2 rounded-lg bg-brand-500 text-brand-contrast text-sm font-semibold hover:bg-brand-600">Request a new link</router-link>
      </div>
    </div>
  </PortalLayout>
</template>
