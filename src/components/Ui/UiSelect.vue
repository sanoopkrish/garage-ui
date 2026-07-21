<script setup lang="ts">
defineProps<{
  modelValue?: string | number
  label?: string
  options: { value: string | number; label: string }[]
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
}>()
defineEmits<{ 'update:modelValue': [val: string] }>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-sm font-medium text-slate-700 dark:text-slate-300">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      :disabled="disabled"
      :class="[
        'w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-dark-surface text-slate-900 dark:text-slate-100 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
        error ? 'border-red-400' : 'border-slate-200 dark:border-dark-border',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ]"
    >
      <option v-if="placeholder" value="" disabled selected>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
