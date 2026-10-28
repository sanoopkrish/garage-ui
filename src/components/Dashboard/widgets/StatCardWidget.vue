<script setup lang="ts">
import { computed } from 'vue'
import type { StatCardData } from '@/api/dashboard.api'
import { formatValue, TONE_TEXT } from '@/utils/dashboard'

const props = defineProps<{ data: StatCardData; label?: string; description?: string }>()

const headline = computed(() => {
  if (props.data?.value === null || props.data?.value === undefined) return props.data?.emptyText ?? '—'
  return formatValue(props.data.value, props.data.format)
})
const isEmptyText = computed(() => (props.data?.value === null || props.data?.value === undefined) && !!props.data?.emptyText)
const toneClass = computed(() => TONE_TEXT[props.data?.tone ?? 'default'])
</script>

<template>
  <div class="min-w-0">
    <p v-if="label" class="text-xs text-slate-400 dark:text-slate-500 font-medium truncate" :title="description">{{ label }}</p>
    <p :class="['mt-1 font-bold tracking-tight truncate', isEmptyText ? 'text-sm text-slate-400' : ['text-2xl', toneClass]]">{{ headline }}</p>
    <p v-if="data?.secondary?.length" class="mt-1 text-xs text-slate-400 dark:text-slate-500 flex flex-wrap gap-x-2">
      <span v-for="s in data.secondary" :key="s.label" :class="s.tone && s.tone !== 'default' ? TONE_TEXT[s.tone] : ''">
        {{ formatValue(s.value, s.format ?? 'number') }} {{ s.label.toLowerCase() }}
      </span>
    </p>
  </div>
</template>
