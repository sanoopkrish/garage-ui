<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2, KeyRound } from 'lucide-vue-next'
import PortalLayout from '../PortalLayout.vue'
import { usePortalStore } from '../portal.store'
import { portalErrorMessage } from '../portal.client'

/** Sprint 29 — trade contact: choose a password from the invitation link, then signed straight in. */
const route = useRoute()
const router = useRouter()
const portal = usePortalStore()

const password = ref('')
const confirm = ref('')
const busy = ref(false)
const error = ref('')

const tooShort = computed(() => password.value.length > 0 && password.value.length < 10)
const mismatch = computed(() => confirm.value.length > 0 && confirm.value !== password.value)
const canSubmit = computed(() => password.value.length >= 10 && confirm.value === password.value && !busy.value)

async function submit() {
  if (!canSubmit.value) return
  busy.value = true
  error.value = ''
  try {
    await portal.setPassword(String(route.params.token ?? ''), password.value)
    router.replace({ name: 'portal-home' })
  } catch (e: any) {
    error.value = portalErrorMessage(e, 'This invitation has expired or was already used. Ask the workshop to send a new one.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PortalLayout bare>
    <div class="max-w-sm mx-auto pt-6">
      <div class="card">
        <div class="flex items-center gap-2 mb-1">
          <KeyRound class="w-5 h-5 text-brand-500" />
          <h1 class="font-semibold text-slate-800 dark:text-slate-100">Choose a password</h1>
        </div>
        <p class="text-sm text-slate-500 mb-5">At least 10 characters. You can always use a sign-in link instead.</p>
        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New password</label>
            <input v-model="password" type="password" autocomplete="new-password" class="w-full px-3.5 py-2.5 text-base rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            <p v-if="tooShort" class="text-xs text-red-500 mt-1">A few more characters, please.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Repeat it</label>
            <input v-model="confirm" type="password" autocomplete="new-password" class="w-full px-3.5 py-2.5 text-base rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            <p v-if="mismatch" class="text-xs text-red-500 mt-1">The two passwords don't match.</p>
          </div>
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
          <button type="submit" :disabled="!canSubmit" class="w-full py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-brand-contrast font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
            <Loader2 v-if="busy" class="w-4 h-4 animate-spin" /> Save and sign in
          </button>
        </form>
      </div>
    </div>
  </PortalLayout>
</template>
