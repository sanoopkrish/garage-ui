<script setup lang="ts">
import { useBrandingStore } from '@/stores/branding.store'

/**
 * Sprint 28 — page footer for every office and field screen. Product rule: the
 * "Powered by Cruise · A-soft" line is always present; the garage's name joins it once branded.
 */
defineProps<{ compact?: boolean }>()
const brand = useBrandingStore()
const year = new Date().getFullYear()
</script>

<template>
  <footer
    :class="[
      'no-print shrink-0 border-t border-slate-200 dark:border-dark-border text-slate-400 dark:text-slate-500',
      compact ? 'px-4 py-2 text-[11px] text-center' : 'px-6 py-3 text-xs flex flex-wrap items-center justify-between gap-x-4 gap-y-1',
    ]"
  >
    <span>&copy; {{ year }} {{ brand.branded ? brand.companyName : 'Cruise' }}<template v-if="!brand.branded">. All rights reserved.</template></span>
    <span v-if="compact" class="mx-1">·</span>
    <span>Powered by <span class="font-semibold text-slate-500 dark:text-slate-400">Cruise</span> · A-soft</span>
  </footer>
</template>
