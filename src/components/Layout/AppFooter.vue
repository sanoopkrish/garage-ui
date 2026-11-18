<script setup lang="ts">
/**
 * Sprint 28 — page footer for every office and field screen. Product rule: the
 * footer always reads "© <year> Cruise" and "Powered by A-soft - Tconsult Technologies",
 * whatever the tenant's branding — the copyright is the product's, not the garage's.
 */
defineProps<{ compact?: boolean }>()
const year = new Date().getFullYear()
</script>

<template>
  <footer
    :class="[
      'no-print shrink-0 border-t border-slate-200 dark:border-dark-border text-slate-400 dark:text-slate-500',
      compact ? 'px-4 py-2 text-[11px] text-center' : 'px-6 py-3 text-xs flex flex-wrap items-center justify-between gap-x-4 gap-y-1',
    ]"
  >
    <span>&copy; {{ year }} Cruise</span>
    <span v-if="compact" class="mx-1">·</span>
    <span>Powered by <span class="font-semibold text-slate-500 dark:text-slate-400">A-soft - Tconsult Technologies</span></span>
  </footer>
</template>
