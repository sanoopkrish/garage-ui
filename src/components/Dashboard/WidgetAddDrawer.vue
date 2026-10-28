<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import GeneralSliderPanel from '@/components/Ui/GeneralSliderPanel.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import type { WidgetSummary } from '@/api/dashboard.api'
import { CATEGORY_LABELS, CATEGORY_ORDER, TYPE_LABELS, SIZE_OPTIONS } from '@/utils/dashboard'

/** Catalogue of widgets the user can still add, grouped by category (cms WidgetAddDrawer) */
const props = defineProps<{ open: boolean; widgets: WidgetSummary[]; busyKey?: string | null }>()
const emit = defineEmits<{ add: [widgetKey: string]; close: [] }>()

const search = ref('')

const groups = computed(() => {
  const q = search.value.trim().toLowerCase()
  const filtered = props.widgets.filter(
    (w) => !q || w.displayName.toLowerCase().includes(q) || w.description.toLowerCase().includes(q) || CATEGORY_LABELS[w.category].toLowerCase().includes(q),
  )
  return CATEGORY_ORDER.map((c) => ({ key: c, label: CATEGORY_LABELS[c], widgets: filtered.filter((w) => w.category === c) })).filter((g) => g.widgets.length)
})

const sizeLabel = (size: string) => SIZE_OPTIONS.find((s) => s.value === size)?.label ?? size
</script>

<template>
  <GeneralSliderPanel :model-value="open" title="Add widget" subtitle="Pick what you want to see on your dashboard" size="md" @update:model-value="(v) => !v && emit('close')" @close="emit('close')">
    <div class="space-y-5">
      <UiSearchInput v-model="search" placeholder="Search widgets…" />

      <p v-if="!groups.length" class="text-sm text-slate-400 text-center py-8">
        {{ widgets.length ? 'No widgets match your search.' : 'Everything available is already on your dashboard.' }}
      </p>

      <section v-for="g in groups" :key="g.key">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">{{ g.label }}</h4>
        <ul class="space-y-1.5">
          <li v-for="w in g.widgets" :key="w.key">
            <button
              type="button"
              :disabled="busyKey === w.key"
              class="w-full flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-dark-border hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-900/10 text-left transition-colors disabled:opacity-50"
              @click="emit('add', w.key)"
            >
              <span class="mt-0.5 w-6 h-6 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 flex items-center justify-center flex-shrink-0">
                <Plus class="w-3.5 h-3.5" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-medium text-slate-800 dark:text-slate-100">{{ w.displayName }}</span>
                <span class="block text-xs text-slate-500 dark:text-slate-400">{{ w.description }}</span>
                <span class="block text-[11px] text-slate-400 mt-1">{{ TYPE_LABELS[w.widgetType] }} · {{ sizeLabel(w.defaultSize) }}</span>
              </span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </GeneralSliderPanel>
</template>
