<script setup lang="ts">
import { Search } from 'lucide-vue-next'
defineProps<{ modelValue?: string; placeholder?: string }>()
defineEmits<{ 'update:modelValue': [val: string] }>()
</script>

<template>
  <div class="relative">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :placeholder="placeholder || 'Search...'"
      class="pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent w-64"
    />
  </div>
</template>
