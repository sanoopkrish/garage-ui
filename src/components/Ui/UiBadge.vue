<script setup lang="ts">
defineProps<{
  variant?: 'open' | 'progress' | 'done' | 'cancelled' | 'pending' | 'info'
  dot?: boolean
}>()

const classes: Record<string, string> = {
  open:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  progress:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  done:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pending:   'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  info:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}
const dotColors: Record<string, string> = {
  open: 'bg-blue-500', progress: 'bg-amber-500', done: 'bg-green-500',
  cancelled: 'bg-red-500', pending: 'bg-slate-400', info: 'bg-purple-500',
}
</script>

<template>
  <span :class="['badge', classes[variant || 'pending']]">
    <span v-if="dot" :class="['w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant || 'pending']]" />
    <slot />
  </span>
</template>
