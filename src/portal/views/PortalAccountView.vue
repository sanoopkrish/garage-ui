<script setup lang="ts">
import { useRouter } from 'vue-router'
import { LogOut, Mail, Phone, UserRound, Building2 } from 'lucide-vue-next'
import PortalLayout from '../PortalLayout.vue'
import { usePortalStore } from '../portal.store'

/** Sprint 29 — the signed-in contact's details and sign out. Edits go through the workshop. */
const router = useRouter()
const portal = usePortalStore()

async function signOut() {
  await portal.logout()
  router.replace({ name: 'portal-signin' })
}
</script>

<template>
  <PortalLayout title="Your account" back-to="/portal/home">
    <div class="space-y-4 max-w-md">
      <section class="card">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center"><UserRound class="w-5 h-5 text-brand-500" /></span>
          <div class="min-w-0">
            <p class="font-semibold text-slate-800 dark:text-slate-100 truncate">{{ portal.contact?.name }}</p>
            <p v-if="portal.customer && portal.customer.name !== portal.contact?.name" class="text-xs text-slate-500 inline-flex items-center gap-1"><Building2 class="w-3.5 h-3.5" /> {{ portal.customer.name }}</p>
          </div>
        </div>
        <dl class="mt-4 space-y-2 text-sm">
          <div v-if="portal.contact?.email" class="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Mail class="w-4 h-4 text-slate-400" /> {{ portal.contact.email }}</div>
          <div v-if="portal.contact?.phone" class="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Phone class="w-4 h-4 text-slate-400" /> {{ portal.contact.phone }}</div>
        </dl>
        <p class="text-xs text-slate-400 mt-4">To change these details, or to add someone else from your company, contact {{ portal.me?.workshop.name ?? 'the workshop' }}.</p>
      </section>

      <section class="card">
        <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Signed-in devices</h2>
        <p class="text-xs text-slate-500">You stay signed in on this device for a while after each visit. Signing out ends it here; the workshop can end it everywhere.</p>
        <button type="button" class="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-dark-border text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-red-300 hover:text-red-600" @click="signOut">
          <LogOut class="w-4 h-4" /> Sign out
        </button>
      </section>
    </div>
  </PortalLayout>
</template>
