<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Loader2, MailCheck, KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-vue-next'
import PortalLayout from '../PortalLayout.vue'
import { usePortalStore } from '../portal.store'
import { portalAuth } from '../portal.api'
import { portalErrorCode, portalErrorMessage } from '../portal.client'
import { useBrandingStore } from '@/stores/branding.store'

/**
 * Sprint 29 — portal sign-in. One box for email or mobile → a one-time link. Trade contacts
 * with a password can switch to email + password. The response is the same whether or not
 * the details matched, on purpose.
 */
const router = useRouter()
const portal = usePortalStore()
const brand = useBrandingStore()

const mode = ref<'link' | 'password'>('link')
const identifier = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const busy = ref(false)
const sent = ref(false)
const error = ref('')

async function requestLink() {
  if (!identifier.value.trim() || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await portalAuth.requestLink(identifier.value.trim())
    sent.value = true
  } catch (e: any) {
    error.value = portalErrorMessage(e, 'Something went wrong. Please try again in a moment.')
  } finally {
    busy.value = false
  }
}

async function login() {
  if (!email.value.trim() || !password.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await portal.login(email.value.trim(), password.value)
    router.replace({ name: 'portal-home' })
  } catch (e: any) {
    if (portalErrorCode(e) === 'PORTAL_DISABLED') portal.disabled = true
    error.value = portalErrorMessage(e, 'Email or password is not right.')
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  if (portal.isSignedIn) router.replace({ name: 'portal-home' })
})
</script>

<template>
  <PortalLayout bare>
    <div class="max-w-sm mx-auto pt-6">
      <div class="text-center mb-8">
        <img v-if="brand.lightLogo" :src="brand.lightLogo" :alt="brand.companyName" class="max-h-16 max-w-[220px] object-contain mx-auto mb-3" />
        <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100">{{ brand.companyName || brand.appName }}</h1>
        <p class="text-sm text-slate-500 mt-1">Follow your vehicle's progress and message the workshop.</p>
      </div>

      <div v-if="portal.disabled" class="card text-center">
        <p class="text-sm text-slate-600 dark:text-slate-300">Online access is not switched on for this garage yet.</p>
        <p class="text-xs text-slate-400 mt-1">Please call the workshop instead.</p>
      </div>

      <div v-else class="card">
        <template v-if="mode === 'link'">
          <div v-if="sent" class="text-center py-2">
            <MailCheck class="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h2 class="font-semibold text-slate-800 dark:text-slate-100">Check your messages</h2>
            <p class="text-sm text-slate-500 mt-2">If we recognise those details, a sign-in link is on its way by email or text. It works once and expires in 15 minutes.</p>
            <button type="button" class="mt-4 text-sm text-brand-500 hover:underline" @click="sent = false">Use a different email or number</button>
          </div>
          <form v-else class="space-y-4" @submit.prevent="requestLink">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email address or mobile number</label>
              <input
                v-model="identifier"
                type="text"
                inputmode="email"
                autocomplete="username"
                placeholder="you@example.com or 07700 900123"
                class="w-full px-3.5 py-2.5 text-base rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
              />
              <p class="text-xs text-slate-400 mt-1">We'll send you a one-time sign-in link. No password needed.</p>
            </div>
            <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
            <button type="submit" :disabled="busy || !identifier.trim()" class="w-full py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-brand-contrast font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
              <Loader2 v-if="busy" class="w-4 h-4 animate-spin" /> Send me a sign-in link
            </button>
          </form>
          <button type="button" class="mt-5 w-full text-sm text-slate-500 hover:text-brand-500 inline-flex items-center justify-center gap-1.5" @click="mode = 'password'; error = ''">
            <KeyRound class="w-4 h-4" /> Trade account? Sign in with a password
          </button>
        </template>

        <template v-else>
          <button type="button" class="text-sm text-slate-500 hover:text-brand-500 inline-flex items-center gap-1 mb-4" @click="mode = 'link'; error = ''">
            <ArrowLeft class="w-4 h-4" /> Back to sign-in link
          </button>
          <form class="space-y-4" @submit.prevent="login">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email address</label>
              <input v-model="email" type="email" autocomplete="username" class="w-full px-3.5 py-2.5 text-base rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div class="relative">
                <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" class="w-full px-3.5 py-2.5 pr-10 text-base rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-300" />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" @click="showPassword = !showPassword" aria-label="Show password">
                  <EyeOff v-if="showPassword" class="w-4 h-4" /><Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
            <button type="submit" :disabled="busy || !email.trim() || !password" class="w-full py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-brand-contrast font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
              <Loader2 v-if="busy" class="w-4 h-4 animate-spin" /> Sign in
            </button>
            <p class="text-xs text-slate-400 text-center">Forgotten your password? Use a sign-in link instead, or ask the workshop to send a new invitation.</p>
          </form>
        </template>
      </div>
    </div>
  </PortalLayout>
</template>
