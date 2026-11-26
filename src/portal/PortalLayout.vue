<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, Gauge, Phone, LogOut, UserRound } from 'lucide-vue-next'
import { useBrandingStore } from '@/stores/branding.store'
import { usePortalStore } from './portal.store'

/**
 * Sprint 29 — customer portal shell. Mobile-first, the garage's own logo and colour (Sprint 28),
 * nothing from the office bundle. Footer: company name + Powered by Cruise · A-soft.
 */
defineProps<{
  title?: string
  backTo?: string
  /** hide account / sign-out (sign-in screens) */
  bare?: boolean
}>()

const router = useRouter()
const brand = useBrandingStore()
const portal = usePortalStore()
const year = new Date().getFullYear()

async function signOut() {
  await portal.logout()
  router.replace({ name: 'portal-signin' })
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-dark-bg flex flex-col">
    <header class="sticky top-0 z-20 bg-white/95 dark:bg-dark-surface/95 backdrop-blur border-b border-slate-200 dark:border-dark-border">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        <button
          v-if="backTo"
          type="button"
          class="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-white/5"
          aria-label="Back"
          @click="router.push(backTo)"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <router-link v-else :to="portal.isSignedIn ? { name: 'portal-home' } : { name: 'portal-signin' }" class="flex items-center gap-2 min-w-0">
          <img v-if="brand.darkLogo || brand.lightLogo" :src="(brand.lightLogo || brand.darkLogo) as string" :alt="brand.companyName" class="h-8 max-w-[140px] object-contain" />
          <template v-else>
            <span class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0"><Gauge class="w-4 h-4 text-brand-contrast" /></span>
            <span class="font-semibold text-slate-800 dark:text-slate-100 truncate">{{ brand.companyName || brand.appName }}</span>
          </template>
        </router-link>
        <h1 v-if="title" class="flex-1 min-w-0 text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{{ title }}</h1>
        <span v-else class="flex-1" />
        <template v-if="!bare && portal.isSignedIn">
          <a v-if="portal.me?.workshop.phone" :href="`tel:${portal.me.workshop.phone.replace(/\s+/g, '')}`" class="p-2 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Call the workshop">
            <Phone class="w-5 h-5" />
          </a>
          <router-link :to="{ name: 'portal-account' }" class="p-2 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Your account">
            <UserRound class="w-5 h-5" />
          </router-link>
          <button type="button" class="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Sign out" @click="signOut">
            <LogOut class="w-5 h-5" />
          </button>
        </template>
      </div>
    </header>

    <main class="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 lg:py-8">
      <slot />
    </main>

    <!-- Same product line as AppFooter: never the client's name here, always Cruise -->
    <footer class="shrink-0 border-t border-slate-200 dark:border-dark-border px-4 py-3 text-[11px] text-center text-slate-400 dark:text-slate-500">
      <span>&copy; {{ year }} Cruise</span>
      <span class="mx-1">·</span>
      <span>Powered by <span class="font-semibold text-slate-500 dark:text-slate-400">A-soft - Tconsult Technologies</span></span>
    </footer>
  </div>
</template>
