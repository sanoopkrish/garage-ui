<script setup lang="ts">
import type { TimelineData } from '@/api/dashboard.api'
import { relativeTime } from '@/utils/dashboard'

defineProps<{ data: TimelineData; size: string }>()

const dotClass = (type?: string) => {
  const t = (type ?? '').toLowerCase()
  if (t.includes('delete') || t.includes('fail')) return 'bg-red-500'
  if (t.includes('create')) return 'bg-green-500'
  if (t.includes('update')) return 'bg-brand-500'
  return 'bg-slate-400'
}
</script>

<template>
  <div>
    <ol v-if="data?.items?.length" class="relative border-l border-slate-200 dark:border-white/10 ml-1.5 max-h-80 overflow-y-auto pr-1">
      <li v-for="i in data.items" :key="i.id" class="ml-4 pb-3 last:pb-0">
        <span :class="['absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-dark-surface', dotClass(i.type)]" />
        <component :is="i.link ? 'router-link' : 'div'" :to="i.link" class="block text-sm">
          <p class="font-medium text-slate-700 dark:text-slate-200 leading-snug">{{ i.title }}</p>
          <p class="text-xs text-slate-400">
            <span v-if="i.description">{{ i.description }} · </span>{{ relativeTime(i.date) }}
          </p>
        </component>
      </li>
    </ol>
    <p v-else class="text-sm text-slate-400">No recent activity.</p>
  </div>
</template>
