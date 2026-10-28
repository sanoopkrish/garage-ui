<script setup lang="ts">
import { computed } from 'vue'
import type { StatusListData } from '@/api/dashboard.api'
import { jobStatusLabels } from '@/utils/jobStatus'
import type { JobStatus } from '@/types/generated/enums/job'

const props = defineProps<{ data: StatusListData }>()

/** Prefer the UI's own status labels when the key is a job status */
const items = computed(() =>
  (props.data?.items ?? []).map((i) => ({ ...i, label: (jobStatusLabels as Record<string, string>)[i.key as JobStatus] ?? i.label })),
)
</script>

<template>
  <div>
    <div v-if="items.length" class="flex flex-wrap gap-2">
      <component
        :is="i.link ? 'router-link' : 'div'"
        v-for="i in items"
        :key="i.key"
        :to="i.link"
        class="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
      >
        <span class="text-lg font-bold text-slate-800 dark:text-white">{{ i.count }}</span>
        <span class="text-xs text-slate-500">{{ i.label }}</span>
      </component>
    </div>
    <p v-else class="text-sm text-slate-400">Nothing here right now.</p>
  </div>
</template>
