<script setup lang="ts">
defineProps<{
  headers: string[]
  loading?: boolean
  empty?: string
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-100 dark:border-dark-border">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-slate-50 dark:bg-dark-surface border-b border-slate-100 dark:border-dark-border">
          <th
            v-for="h in headers"
            :key="h"
            class="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap"
          >
            {{ h }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-50 dark:divide-dark-border bg-white dark:bg-dark-surface">
        <!-- Loading skeleton -->
        <template v-if="loading">
          <tr v-for="i in 5" :key="i">
            <td v-for="h in headers" :key="h" class="px-4 py-3">
              <div class="h-4 bg-slate-100 dark:bg-white/10 rounded animate-pulse w-full" />
            </td>
          </tr>
        </template>

        <!-- Empty state -->
        <tr v-else-if="!$slots.default">
          <td :colspan="headers.length" class="px-4 py-12 text-center text-slate-400">
            {{ empty || 'No records found.' }}
          </td>
        </tr>

        <slot v-else />
      </tbody>
    </table>
  </div>
</template>
