<script setup lang="ts">
import { ref, computed } from 'vue'

interface Option {
  value: string | number
  label: string
}

const props = defineProps<{
  modelValue: Array<string | number>
  options: Option[]
  label?: string
  placeholder?: string
  required?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [val: Array<string | number>] }>()

const isOpen = ref(false)
const searchQuery = ref('')

const selectedValues = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const selectedOptions = computed(() =>
  props.options.filter(opt => selectedValues.value.includes(opt.value))
)

const filteredOptions = computed(() =>
  props.options.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

function toggleDropdown() {
  isOpen.value = !isOpen.value
  searchQuery.value = ''
}

function closeDropdown() {
  isOpen.value = false
}

function remove(value: string | number) {
  selectedValues.value = selectedValues.value.filter(v => v !== value)
}
</script>

<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      {{ label }}<span v-if="required" class="text-red-500 ml-0.5">*</span>
    </label>

    <div class="relative" v-click-outside="closeDropdown">
      <!-- Trigger -->
      <div
        class="min-h-[38px] flex flex-wrap gap-1 p-1.5 border rounded-lg cursor-pointer bg-white dark:bg-dark-surface border-slate-200 dark:border-dark-border transition-colors"
        :class="isOpen ? 'ring-2 ring-brand-500 border-brand-500' : 'hover:border-slate-300'"
        @click="toggleDropdown"
      >
        <template v-if="selectedOptions.length">
          <span
            v-for="opt in selectedOptions"
            :key="opt.value"
            class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full"
          >
            {{ opt.label }}
            <button type="button" @click.stop="remove(opt.value)" class="hover:text-brand-800 dark:hover:text-brand-200 leading-none">×</button>
          </span>
        </template>
        <span v-else class="text-sm text-slate-400 dark:text-slate-500 px-1 py-0.5">
          {{ placeholder ?? 'Select options' }}
        </span>
      </div>

      <!-- Dropdown -->
      <div
        v-show="isOpen"
        class="absolute z-20 w-full mt-1 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-lg shadow-lg max-h-56 overflow-auto"
      >
        <div class="p-2 border-b border-slate-100 dark:border-dark-border">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search…"
            class="w-full text-sm bg-transparent focus:outline-none text-slate-700 dark:text-slate-300 placeholder-slate-400"
          />
        </div>
        <div>
          <label
            v-for="opt in filteredOptions"
            :key="opt.value"
            class="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-dark-hover text-slate-700 dark:text-slate-300"
          >
            <input
              type="checkbox"
              :value="opt.value"
              v-model="selectedValues"
              class="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
            />
            {{ opt.label }}
          </label>
          <p v-if="filteredOptions.length === 0" class="px-3 py-2 text-sm text-slate-400">No results.</p>
        </div>
      </div>
    </div>
  </div>
</template>
