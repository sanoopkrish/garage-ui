<script setup lang="ts">
import { ref, watch } from 'vue'
import draggable from 'vuedraggable'
import type { LayoutEntry } from '@/api/dashboard.api'
import type { WidgetSize } from '@/types/generated/enums/dashboard'
import DashboardWidget from './DashboardWidget.vue'
import MasonryCell from './MasonryCell.vue'
import { SIZE_CLASSES } from '@/utils/dashboard'

/**
 * 12-column grid (cms pattern, no grid library) packed masonry-style: rows are
 * 8px units, each cell spans what its card needs, and dense flow backfills the
 * hole a short card leaves beside a tall one. In edit mode the cards are
 * draggable by their handle; locked widgets are filtered out of the drag.
 */
const GRID = 'grid grid-cols-12 gap-4 grid-flow-row-dense'
const GRID_STYLE = { gridAutoRows: '8px' }
const props = defineProps<{
  widgets: LayoutEntry[]
  widgetData: Record<string, any>
  isEditing: boolean
  loadingStates: Record<string, boolean>
  errors: Record<string, string>
}>()
const emit = defineEmits<{ reorder: [widgetKeys: string[]]; remove: [widgetKey: string]; resize: [widgetKey: string, size: WidgetSize]; refresh: [widgetKey: string] }>()

const internal = ref<LayoutEntry[]>([])
watch(() => props.widgets, (w) => { internal.value = [...w] }, { immediate: true, deep: true })

function onDragEnd() {
  emit('reorder', internal.value.map((w) => w.widgetKey))
}
</script>

<template>
  <draggable
    v-if="isEditing"
    v-model="internal"
    item-key="widgetKey"
    handle=".drag-handle"
    :filter="'.locked'"
    :prevent-on-filter="false"
    ghost-class="opacity-40"
    :class="GRID"
    :style="GRID_STYLE"
    @end="onDragEnd"
  >
    <template #item="{ element }">
      <MasonryCell :class="[SIZE_CLASSES[(element as LayoutEntry).size], (element as LayoutEntry).isLocked ? 'locked' : '']">
        <DashboardWidget
          :entry="element"
          :data="widgetData[element.widgetKey]"
          :is-loading="!!loadingStates[element.widgetKey]"
          :error="errors[element.widgetKey]"
          :is-editing="true"
          @refresh="emit('refresh', element.widgetKey)"
          @remove="emit('remove', element.widgetKey)"
          @resize="(size) => emit('resize', element.widgetKey, size)"
        />
      </MasonryCell>
    </template>
  </draggable>

  <div v-else :class="GRID" :style="GRID_STYLE">
    <MasonryCell v-for="w in widgets" :key="w.widgetKey" :class="SIZE_CLASSES[w.size]">
      <DashboardWidget
        :entry="w"
        :data="widgetData[w.widgetKey]"
        :is-loading="!!loadingStates[w.widgetKey]"
        :error="errors[w.widgetKey]"
        :is-editing="false"
        @refresh="emit('refresh', w.widgetKey)"
      />
    </MasonryCell>
  </div>
</template>
