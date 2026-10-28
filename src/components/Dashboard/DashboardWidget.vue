<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { GripVertical, RefreshCw, X, Lock, AlertCircle, ArrowUpRight } from 'lucide-vue-next'
import type { LayoutEntry } from '@/api/dashboard.api'
import { WidgetSize } from '@/types/generated/enums/dashboard'
import { resolveWidgetComponent } from './widget-component-map'
import { SIZE_OPTIONS, isStatType } from '@/utils/dashboard'

/**
 * Card around one widget (cms DashboardWidget, re-cut): title, refresh, size
 * select + drag handle + hide in edit mode, lock badge, skeleton / error states.
 * Stat cards have no header outside edit mode — the widget draws its own label.
 */
const props = defineProps<{
  entry: LayoutEntry
  data: any
  isLoading: boolean
  error?: string
  isEditing: boolean
}>()
const emit = defineEmits<{ refresh: []; remove: []; resize: [size: WidgetSize] }>()

const router = useRouter()
const component = computed(() => resolveWidgetComponent(props.entry.widgetType))
const isStat = computed(() => isStatType(props.entry.widgetType))
const showHeader = computed(() => props.isEditing || !isStat.value)
const clickable = computed(() => !!props.entry.link && !props.isEditing)

function open() {
  if (clickable.value && props.entry.link) router.push(props.entry.link)
}
</script>

<template>
  <div
    :class="[
      'card group relative flex flex-col !p-4 min-h-[128px] transition-colors',
      isEditing ? 'ring-1 ring-dashed ring-brand-300 dark:ring-brand-700' : '',
      clickable ? 'cursor-pointer hover:border-brand-300 dark:hover:border-brand-600' : '',
    ]"
    @click="open"
  >
    <!-- Header -->
    <div v-if="showHeader" class="flex items-center gap-2 mb-3 min-w-0">
      <GripVertical v-if="isEditing && !entry.isLocked" class="drag-handle w-4 h-4 text-slate-300 cursor-grab active:cursor-grabbing flex-shrink-0" />
      <Lock v-if="entry.isLocked" class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" title="Locked by your administrator" />
      <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate flex-1" :title="entry.description">{{ entry.displayName }}</h3>
      <template v-if="isEditing">
        <select
          :value="entry.size"
          :disabled="entry.isLocked"
          class="text-xs border border-slate-200 dark:border-dark-border rounded-md px-1.5 py-1 bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-300 disabled:opacity-50"
          title="Size"
          @click.stop
          @change="emit('resize', ($event.target as HTMLSelectElement).value as WidgetSize)"
        >
          <option v-for="o in SIZE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <button
          v-if="!entry.isLocked"
          type="button"
          class="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Hide widget"
          @click.stop="emit('remove')"
        >
          <X class="w-4 h-4" />
        </button>
      </template>
      <template v-else>
        <button
          type="button"
          class="p-1 rounded-md text-slate-300 hover:text-brand-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          title="Refresh"
          @click.stop="emit('refresh')"
        >
          <RefreshCw :class="['w-3.5 h-3.5', isLoading ? 'animate-spin' : '']" />
        </button>
        <ArrowUpRight v-if="entry.link" class="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </template>
    </div>

    <!-- Stat card refresh (no header) -->
    <button
      v-else
      type="button"
      class="absolute top-2 right-2 p-1 rounded-md text-slate-300 hover:text-brand-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
      title="Refresh"
      @click.stop="emit('refresh')"
    >
      <RefreshCw :class="['w-3.5 h-3.5', isLoading ? 'animate-spin' : '']" />
    </button>

    <!-- Body -->
    <div class="flex-1 min-w-0">
      <div v-if="isLoading && data === undefined" class="animate-pulse space-y-2">
        <div class="h-4 bg-slate-100 dark:bg-white/5 rounded w-1/2" />
        <div class="h-8 bg-slate-100 dark:bg-white/5 rounded w-3/4" />
      </div>
      <div v-else-if="error && data === undefined" class="flex items-start gap-2 text-sm text-red-500">
        <AlertCircle class="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p>{{ error }}</p>
          <button type="button" class="text-xs underline text-slate-500 hover:text-brand-600" @click.stop="emit('refresh')">Retry</button>
        </div>
      </div>
      <component
        :is="component"
        v-else-if="component"
        :data="data"
        :size="entry.size"
        :label="isStat && !showHeader ? entry.displayName : undefined"
        :description="isStat ? entry.description : undefined"
      />
      <p v-else class="text-sm text-slate-400">Widget type not supported.</p>
    </div>
  </div>
</template>
