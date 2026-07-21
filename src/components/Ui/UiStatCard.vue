<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  value: string | number
  subtitle?: string
  icon: Component
  iconBg?: string
  trend?: string
  trendUp?: boolean
}>()
</script>

<template>
  <div class="card flex items-start justify-between gap-4">
    <div>
      <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">{{ title }}</p>
      <p class="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{{ value }}</p>
      <p v-if="subtitle" class="mt-0.5 text-xs text-slate-400">{{ subtitle }}</p>
      <div v-if="trend" class="mt-2 flex items-center gap-1 text-xs font-medium" :class="trendUp ? 'text-green-600' : 'text-red-500'">
        <span>{{ trendUp ? '▲' : '▼' }}</span>
        <span>{{ trend }}</span>
      </div>
    </div>
    <div :class="['p-3 rounded-xl flex-shrink-0', iconBg || 'bg-brand-50 dark:bg-brand-900/20']">
      <component :is="icon" :class="['w-6 h-6', iconBg ? 'text-white' : 'text-brand-500']" />
    </div>
  </div>
</template>
