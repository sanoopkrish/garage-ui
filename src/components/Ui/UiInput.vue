<script setup lang="ts">
defineProps<{
  modelValue?: string | number
  label?: string
  placeholder?: string
  type?: string
  error?: string
  disabled?: boolean
  required?: boolean
  /** id of a <datalist> offering suggestions */
  list?: string
}>()
defineEmits<{ 'update:modelValue': [val: string] }>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-sm font-medium text-slate-700 dark:text-slate-300">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :type="type || 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :list="list"
      :class="[
        'w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-dark-surface text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
        error
          ? 'border-red-400 focus:ring-red-400'
          : 'border-slate-200 dark:border-dark-border',
        disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : '',
      ]"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
