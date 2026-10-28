<script setup lang="ts">
import type { ListData } from '@/api/dashboard.api'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { TONE_BADGE, timeOfDay } from '@/utils/dashboard'

defineProps<{ data: ListData; size: string }>()
</script>

<template>
  <div>
    <ul v-if="data?.items?.length" class="divide-y divide-slate-100 dark:divide-white/5 max-h-72 overflow-y-auto -mx-1">
      <li v-for="i in data.items" :key="i.id">
        <component :is="i.link ? 'router-link' : 'div'" :to="i.link" class="flex items-center gap-3 px-1 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5 rounded-md">
          <div class="min-w-0 flex-1">
            <p class="font-medium text-slate-700 dark:text-slate-200 truncate">{{ i.title }}</p>
            <p v-if="i.subtitle" class="text-xs text-slate-400 truncate">{{ i.subtitle }}<span v-if="i.date"> · {{ timeOfDay(i.date) }}</span></p>
          </div>
          <UiBadge v-if="i.badge" :variant="TONE_BADGE[i.badgeTone ?? 'default']">{{ i.badge }}</UiBadge>
        </component>
      </li>
    </ul>
    <p v-else class="text-sm text-slate-400">Nothing to show.</p>
  </div>
</template>
