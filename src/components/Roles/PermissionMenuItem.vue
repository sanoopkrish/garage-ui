<template>
  <div v-if="isVisible" :class="['permission-menu-item', level > 0 ? 'ml-4' : '']">
    <!-- Boolean leaf node: checkbox row -->
    <template v-if="isBoolean">
      <label
        class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
      >
        <div class="relative flex-shrink-0">
          <input
            type="checkbox"
            :checked="currentValue as boolean"
            @change="handleCheckboxChange"
            class="sr-only peer"
          />
          <div
            :class="[
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
              currentValue
                ? 'bg-brand-500 border-brand-500'
                : 'bg-white dark:bg-dark-surface border-slate-300 dark:border-dark-border group-hover:border-brand-400',
            ]"
          >
            <svg
              v-if="currentValue"
              class="w-3 h-3 text-white"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="2,6 5,9 10,3" />
            </svg>
          </div>
        </div>
        <span class="text-sm text-slate-700 dark:text-slate-300 select-none">
          {{ formattedKey }}
        </span>
      </label>
    </template>

    <!-- Object node: collapsible section -->
    <template v-else>
      <div
        class="rounded-lg border border-slate-200 dark:border-dark-border overflow-hidden mb-2"
      >
        <!-- Section header -->
        <div
          class="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-white/5 cursor-pointer select-none"
          @click="toggleExpanded"
        >
          <!-- Chevron -->
          <svg
            :class="[
              'w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 flex-shrink-0',
              isExpanded ? 'rotate-90' : '',
            ]"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6,4 10,8 6,12" />
          </svg>

          <!-- Section label -->
          <span class="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            {{ formattedKey }}
          </span>

          <!-- Status dot -->
          <div
            :class="[
              'w-2.5 h-2.5 rounded-full flex-shrink-0',
              sectionStatus === 'all'
                ? 'bg-green-500'
                : sectionStatus === 'some'
                  ? 'bg-yellow-400'
                  : 'bg-slate-300 dark:bg-slate-600',
            ]"
            :title="
              sectionStatus === 'all'
                ? 'All enabled'
                : sectionStatus === 'some'
                  ? 'Partially enabled'
                  : 'All disabled'
            "
          />

          <!-- Progress badge -->
          <span
            class="text-xs text-slate-500 dark:text-slate-400 tabular-nums min-w-[2.5rem] text-right"
          >
            {{ enabledCount }}/{{ totalCount }}
          </span>

          <!-- Enable all button -->
          <button
            type="button"
            @click.stop="enableAll"
            class="w-6 h-6 flex items-center justify-center rounded text-xs font-bold text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            title="Enable all"
          >
            ✓
          </button>

          <!-- Disable all button -->
          <button
            type="button"
            @click.stop="disableAll"
            class="w-6 h-6 flex items-center justify-center rounded text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            title="Disable all"
          >
            ✗
          </button>
        </div>

        <!-- Progress bar -->
        <div class="h-0.5 bg-slate-200 dark:bg-slate-700">
          <div
            class="h-full bg-brand-500 transition-all duration-300"
            :style="{ width: totalCount > 0 ? `${(enabledCount / totalCount) * 100}%` : '0%' }"
          />
        </div>

        <!-- Children -->
        <div v-show="isExpanded" class="p-2">
          <PermissionMenuItem
            v-for="(val, key) in (menuValue as Record<string, any>)"
            :key="key"
            :menuKey="String(key)"
            :menuValue="val"
            :path="[...path, String(key)]"
            :permissions="permissions"
            :searchTerm="searchTerm"
            :level="level + 1"
            :forceExpand="forceExpand"
            @changed="$emit('changed')"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { get, set } from 'lodash-es'

// ─── Props ───────────────────────────────────────────────────────────────────

const props = withDefaults(
  defineProps<{
    menuKey: string
    menuValue: boolean | Record<string, any>
    path: string[]
    permissions: Record<string, any>
    searchTerm: string
    level?: number
    forceExpand?: boolean
  }>(),
  {
    level: 0,
  },
)

// ─── Emits ───────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  changed: []
}>()

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert camelCase / snake_case / kebab-case to Title Case */
function formatKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → camel Case
    .replace(/[_-]+/g, ' ') // snake_case / kebab-case → spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // Title Case
    .trim()
}

/** Recursively collect all boolean leaf values under a node */
function collectBooleans(obj: Record<string, any>): boolean[] {
  const results: boolean[] = []
  for (const val of Object.values(obj)) {
    if (typeof val === 'boolean') {
      results.push(val)
    } else if (val && typeof val === 'object') {
      results.push(...collectBooleans(val))
    }
  }
  return results
}

/** Recursively set all boolean leaves to a given value */
function setAllBooleans(
  perms: Record<string, any>,
  pathArr: string[],
  value: boolean,
): void {
  const node = get(perms, pathArr.join('.'))
  if (!node || typeof node !== 'object') return

  for (const [k, v] of Object.entries(node)) {
    const childPath = [...pathArr, k]
    if (typeof v === 'boolean') {
      set(perms, childPath.join('.'), value)
    } else if (v && typeof v === 'object') {
      setAllBooleans(perms, childPath, value)
    }
  }
}

/** Check whether a node (or any of its descendants) matches the search term */
function nodeMatchesSearch(
  key: string,
  value: boolean | Record<string, any>,
  term: string,
): boolean {
  const lowerTerm = term.toLowerCase()
  if (key.toLowerCase().includes(lowerTerm)) return true
  if (typeof value === 'object' && value !== null) {
    for (const [k, v] of Object.entries(value)) {
      if (nodeMatchesSearch(k, v, term)) return true
    }
  }
  return false
}

// ─── Computed ────────────────────────────────────────────────────────────────

const isBoolean = computed(() => typeof props.menuValue === 'boolean')
const formattedKey = computed(() => formatKey(props.menuKey))

/** Live value from the shared permissions object */
const currentValue = computed(() => get(props.permissions, props.path.join('.')))

/** For object nodes: gather boolean stats from the live permissions object */
const booleanStats = computed(() => {
  if (isBoolean.value) return { enabled: 0, total: 0 }
  const liveNode = get(props.permissions, props.path.join('.'))
  if (!liveNode || typeof liveNode !== 'object') return { enabled: 0, total: 0 }
  const all = collectBooleans(liveNode)
  return {
    enabled: all.filter(Boolean).length,
    total: all.length,
  }
})

const enabledCount = computed(() => booleanStats.value.enabled)
const totalCount = computed(() => booleanStats.value.total)

const sectionStatus = computed<'all' | 'some' | 'none'>(() => {
  if (totalCount.value === 0) return 'none'
  if (enabledCount.value === totalCount.value) return 'all'
  if (enabledCount.value > 0) return 'some'
  return 'none'
})

/** Visibility for filtering */
const isVisible = computed(() => {
  if (!props.searchTerm) return true
  return nodeMatchesSearch(props.menuKey, props.menuValue, props.searchTerm)
})

// ─── Expand / Collapse ───────────────────────────────────────────────────────

const isExpanded = ref(false)

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

/** Auto-expand if any children are enabled on mount */
onMounted(() => {
  if (!isBoolean.value) {
    const liveNode = get(props.permissions, props.path.join('.'))
    if (liveNode && typeof liveNode === 'object') {
      const bools = collectBooleans(liveNode)
      if (bools.some(Boolean)) {
        isExpanded.value = true
      }
    }
  }
})

/** Auto-expand when a searchTerm is active and this node is visible */
watch(
  () => props.searchTerm,
  (term) => {
    if (!isBoolean.value) {
      isExpanded.value = !!term && isVisible.value
    }
  },
)

/** Respond to external expand-all / collapse-all signals */
watch(
  () => props.forceExpand,
  (val) => {
    if (!isBoolean.value && val !== undefined) {
      isExpanded.value = val
    }
  },
)

// ─── Actions ─────────────────────────────────────────────────────────────────

function handleCheckboxChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  set(props.permissions, props.path.join('.'), checked)
  emit('changed')
}

function enableAll() {
  setAllBooleans(props.permissions, props.path, true)
  emit('changed')
}

function disableAll() {
  setAllBooleans(props.permissions, props.path, false)
  emit('changed')
}
</script>
