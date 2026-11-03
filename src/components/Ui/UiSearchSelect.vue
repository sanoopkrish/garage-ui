<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ChevronDown, X } from 'lucide-vue-next'

interface Option {
  value: string | number
  label: string
}

const props = withDefaults(defineProps<{
  modelValue?: string | number
  options: Option[]
  label?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  error?: string
  required?: boolean
  disabled?: boolean
  loading?: boolean
  /** When true the parent filters (server-side search): the component emits `search` and lists options as given. */
  remote?: boolean
}>(), {
  placeholder: 'Select…',
  searchPlaceholder: 'Type to search…',
  emptyText: 'No results.',
})

const emit = defineEmits<{
  'update:modelValue': [val: string]
  search: [query: string]
}>()

const isOpen = ref(false)
const query = ref('')
const highlighted = ref(0)
const searchInput = ref<HTMLInputElement | null>(null)
/** Remembered so the trigger keeps showing the chosen label even if a remote search drops it from `options`. */
const selectedLabel = ref('')

const currentLabel = computed(() => {
  if (props.modelValue === undefined || props.modelValue === '') return ''
  return props.options.find((o) => o.value === props.modelValue)?.label ?? selectedLabel.value
})

const filtered = computed(() => {
  if (props.remote) return props.options
  const q = query.value.trim().toLowerCase()
  return q ? props.options.filter((o) => o.label.toLowerCase().includes(q)) : props.options
})

watch(() => props.modelValue, (v) => { if (v === '' || v === undefined) selectedLabel.value = '' })

let debounce: ReturnType<typeof setTimeout> | undefined
watch(query, (q) => {
  highlighted.value = 0
  if (!props.remote) return
  clearTimeout(debounce)
  debounce = setTimeout(() => emit('search', q.trim()), 250)
})

async function open() {
  if (props.disabled) return
  isOpen.value = true
  query.value = ''
  highlighted.value = 0
  if (props.remote) emit('search', '')
  await nextTick()
  searchInput.value?.focus()
}

function close() {
  isOpen.value = false
}

function toggle() {
  isOpen.value ? close() : open()
}

function select(opt: Option) {
  selectedLabel.value = opt.label
  emit('update:modelValue', String(opt.value))
  close()
}

function clear() {
  selectedLabel.value = ''
  emit('update:modelValue', '')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { close(); return }
  if (e.key === 'ArrowDown') { e.preventDefault(); highlighted.value = Math.min(highlighted.value + 1, filtered.value.length - 1); return }
  if (e.key === 'ArrowUp') { e.preventDefault(); highlighted.value = Math.max(highlighted.value - 1, 0); return }
  if (e.key === 'Enter') { e.preventDefault(); const opt = filtered.value[highlighted.value]; if (opt) select(opt) }
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-sm font-medium text-slate-700 dark:text-slate-300">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative" v-click-outside="close">
      <!-- Trigger -->
      <button
        type="button"
        :disabled="disabled"
        @click="toggle"
        @keydown.down.prevent="open"
        :class="[
          'w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left bg-white dark:bg-dark-surface transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
          error ? 'border-red-400' : 'border-slate-200 dark:border-dark-border',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-300',
          isOpen ? 'ring-2 ring-brand-400 border-transparent' : '',
        ]"
      >
        <span class="flex-1 truncate" :class="currentLabel ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'">
          {{ currentLabel || placeholder }}
        </span>
        <span
          v-if="currentLabel && !disabled"
          role="button"
          aria-label="Clear"
          class="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          @click.stop="clear"
        >
          <X class="w-3.5 h-3.5" />
        </span>
        <ChevronDown class="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      <!-- Dropdown -->
      <div
        v-show="isOpen"
        class="absolute z-30 w-full mt-1 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-lg shadow-lg"
      >
        <div class="p-2 border-b border-slate-100 dark:border-dark-border">
          <input
            ref="searchInput"
            v-model="query"
            type="text"
            :placeholder="searchPlaceholder"
            class="w-full text-sm bg-transparent focus:outline-none text-slate-700 dark:text-slate-300 placeholder-slate-400"
            @keydown="onKeydown"
          />
        </div>
        <ul class="max-h-56 overflow-auto py-1" role="listbox">
          <li
            v-for="(opt, i) in filtered"
            :key="opt.value"
            role="option"
            :aria-selected="opt.value === modelValue"
            :class="[
              'px-3 py-2 text-sm cursor-pointer',
              i === highlighted ? 'bg-slate-100 dark:bg-dark-hover' : 'hover:bg-slate-50 dark:hover:bg-dark-hover',
              opt.value === modelValue ? 'font-medium text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300',
            ]"
            @mouseenter="highlighted = i"
            @click="select(opt)"
          >
            {{ opt.label }}
          </li>
          <li v-if="loading" class="px-3 py-2 text-sm text-slate-400">Loading…</li>
          <li v-else-if="filtered.length === 0" class="px-3 py-2 text-sm text-slate-400">{{ emptyText }}</li>
        </ul>
      </div>
    </div>

    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
