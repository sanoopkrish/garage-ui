<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label?: string
  description?: string
  disabled?: boolean
}>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label :class="['flex items-center gap-3 select-none', disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer']">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      :class="[
        'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-1',
        modelValue ? 'bg-brand-500' : 'bg-slate-300 dark:bg-white/20',
      ]"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <span :class="['inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5', modelValue ? 'translate-x-[18px]' : 'translate-x-0.5']" />
    </button>
    <span v-if="label || description" class="text-sm text-slate-700 dark:text-slate-300">
      {{ label }}
      <span v-if="description" class="block text-xs text-slate-400 mt-0.5">{{ description }}</span>
    </span>
  </label>
</template>
