<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Grid cell that spans as many 8px rows as its content needs, so the parent
 * grid (grid-auto-rows: 8px, dense flow) packs cards like a masonry wall
 * instead of leaving a hole under short cards that share a row with a tall one.
 */
const props = withDefaults(defineProps<{ rowUnit?: number; gap?: number; tolerance?: number }>(), { rowUnit: 8, gap: 16, tolerance: 4 })

const cell = ref<HTMLElement | null>(null)
const span = ref(1)
let observer: ResizeObserver | null = null

function measure() {
  const inner = cell.value?.firstElementChild as HTMLElement | null
  if (!inner) return
  const height = inner.getBoundingClientRect().height
  // A card a few px over a row band (e.g. 129px vs a 128px band) snaps down rather than
  // claiming a whole extra row; the overflow disappears into the 16px gap.
  span.value = Math.max(1, Math.ceil((height + props.gap - props.tolerance) / (props.rowUnit + props.gap)))
}

onMounted(() => {
  measure()
  const inner = cell.value?.firstElementChild
  if (inner && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => measure())
    observer.observe(inner)
  }
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="cell" :style="{ gridRowEnd: `span ${span}` }">
    <slot />
  </div>
</template>
