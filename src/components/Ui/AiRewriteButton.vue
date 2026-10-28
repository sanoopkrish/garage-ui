<script setup lang="ts">
import { ref } from 'vue'
import { Sparkles, Loader2, Check, X } from 'lucide-vue-next'
import { rewriteDraft } from '@/api/ai.api'
import { AIFeatureType, useAiFeatures } from '@/composables/useAiFeatures'
import { ToastService } from '@/services/toast.service'

/**
 * "Improve with AI" — takes the current text, offers rewrite modes, shows the
 * draft for review; only emits `accept` when the user takes it. Renders
 * nothing when the communicationDrafts feature is off for this company.
 */
const props = defineProps<{
  text: string
  context?: string
}>()

const emit = defineEmits<{ accept: [draft: string] }>()

const { hasFeature } = useAiFeatures()

const open = ref(false)
const busy = ref(false)
const draft = ref('')

const modes = [
  { key: 'professional', label: 'More professional' },
  { key: 'simple', label: 'Plain English' },
  { key: 'shorter', label: 'Shorter' },
] as const

async function run(mode: (typeof modes)[number]['key']) {
  if (!props.text?.trim()) {
    ToastService.error('Nothing to rewrite yet — write a draft first')
    return
  }
  busy.value = true
  try {
    draft.value = await rewriteDraft(props.text, mode, props.context)
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'AI rewrite failed')
  } finally {
    busy.value = false
  }
}

function accept() {
  emit('accept', draft.value)
  draft.value = ''
  open.value = false
}
</script>

<template>
  <div v-if="hasFeature(AIFeatureType.COMMUNICATION_DRAFTS)" class="relative">
    <button
      type="button"
      class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-brand-600 border border-brand-200 dark:border-brand-500/30 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
      @click="open = !open"
    >
      <Sparkles class="w-3.5 h-3.5" /> Improve with AI
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-30 mt-1 w-80 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-lg p-3"
    >
      <div class="flex flex-wrap gap-1.5 mb-2">
        <button
          v-for="m in modes"
          :key="m.key"
          type="button"
          :disabled="busy"
          class="px-2 py-1 rounded-lg text-xs border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-500 transition-colors disabled:opacity-50"
          @click="run(m.key)"
        >
          {{ m.label }}
        </button>
      </div>

      <div v-if="busy" class="flex items-center gap-2 text-sm text-slate-400 py-3">
        <Loader2 class="w-4 h-4 animate-spin" /> Drafting…
      </div>

      <template v-else-if="draft">
        <p class="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-100 dark:border-dark-border rounded-lg p-2 mb-2">{{ draft }}</p>
        <div class="flex justify-end gap-1.5">
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            @click="draft = ''"
          >
            <X class="w-3.5 h-3.5" /> Discard
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors"
            @click="accept"
          >
            <Check class="w-3.5 h-3.5" /> Use this
          </button>
        </div>
      </template>

      <p v-else class="text-xs text-slate-400">Pick a style — the rewrite appears here for review; nothing changes until you accept it.</p>
    </div>
  </div>
</template>
