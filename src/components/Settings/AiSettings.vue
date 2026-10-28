<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { Sparkles, Loader2, BarChart3 } from 'lucide-vue-next'
import { AIFeatureTypeLabels, AIFeatureTypeValues, type AIFeatureType } from '@/types/generated/enums/ai'
import {
  getCompanyAIConfiguration, updateCompanyAIConfiguration, getCompanyAIUsage,
  type AIUsageStats,
} from '@/api/ai.api'
import { ToastService } from '@/services/toast.service'

// All four features have live endpoints; keep the set for future additions
const COMING_SOON = new Set<AIFeatureType>()

const props = defineProps<{ companyId: string }>()

const loading = ref(true)
const saving = ref(false)
const available = ref(true)
const usage = ref<AIUsageStats | null>(null)

const form = reactive({
  enabled: false,
  features: Object.fromEntries(AIFeatureTypeValues.map((f) => [f, false])) as Record<AIFeatureType, boolean>,
})

const maxDayTokens = computed(() =>
  Math.max(1, ...(usage.value?.byDay ?? []).map((d) => d.tokens)),
)

async function load() {
  loading.value = true
  try {
    const [config, stats] = await Promise.all([
      getCompanyAIConfiguration(props.companyId),
      getCompanyAIUsage(props.companyId).catch(() => null),
    ])
    available.value = config.available ?? true
    form.enabled = config.enabled
    for (const f of AIFeatureTypeValues) form.features[f] = config.features?.[f] ?? false
    usage.value = stats
  } catch {
    ToastService.error('Failed to load AI configuration')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await updateCompanyAIConfiguration(props.companyId, { enabled: form.enabled, features: { ...form.features } })
    ToastService.success('AI configuration saved')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to save AI configuration')
  } finally {
    saving.value = false
  }
}

function formatDay(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <div v-if="loading" class="card h-32 animate-pulse bg-slate-100 dark:bg-white/5" />

    <template v-else>
      <div v-if="!available" class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        No AI provider is configured on the platform (AI_* keys) — switches can be saved but features stay inactive until then.
      </div>

      <!-- Switches -->
      <div class="card">
        <div class="flex items-center justify-between mb-1">
          <h3 class="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles class="w-5 h-5 text-brand-500" /> AI Features
          </h3>
          <label class="relative inline-flex cursor-pointer items-center" title="Master switch">
            <input type="checkbox" v-model="form.enabled" class="peer sr-only" />
            <div class="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-brand-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4 dark:bg-slate-700"></div>
          </label>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
          AI assists staff and always requires human review — nothing is sent or saved without a person confirming it.
          Every call is logged below.
        </p>

        <div class="space-y-2" :class="{ 'opacity-50 pointer-events-none': !form.enabled }">
          <div
            v-for="feature in AIFeatureTypeValues"
            :key="feature"
            class="flex items-center justify-between rounded-lg border border-slate-100 dark:border-dark-border px-4 py-3"
          >
            <div>
              <p class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ AIFeatureTypeLabels[feature] }}</p>
            </div>
            <UiBadge v-if="COMING_SOON.has(feature)" variant="open">Coming soon</UiBadge>
            <label v-else class="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" v-model="form.features[feature]" class="peer sr-only" />
              <div class="h-4 w-7 rounded-full bg-slate-200 peer-checked:bg-brand-500 after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-3 dark:bg-slate-700"></div>
            </label>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <UiButton :disabled="saving" @click="save">
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            {{ saving ? 'Saving…' : 'Save AI configuration' }}
          </UiButton>
        </div>
      </div>

      <!-- Usage -->
      <div class="card">
        <h3 class="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
          <BarChart3 class="w-5 h-5 text-brand-500" /> Usage this month
        </h3>

        <template v-if="usage && usage.totalRequests > 0">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3">
              <p class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ usage.totalRequests }}</p>
              <p class="text-xs text-slate-500">Requests</p>
            </div>
            <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3">
              <p class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ usage.totalTokens.toLocaleString() }}</p>
              <p class="text-xs text-slate-500">Tokens</p>
            </div>
            <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3">
              <p class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ usage.cachedRequests }}</p>
              <p class="text-xs text-slate-500">From cache</p>
            </div>
            <div class="rounded-lg border border-slate-100 dark:border-dark-border p-3">
              <p class="text-xl font-bold text-slate-800 dark:text-slate-100">${{ (usage.estimatedCostUsd ?? 0).toFixed(2) }}</p>
              <p class="text-xs text-slate-500">Est. cost</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">By feature</h4>
              <ul class="space-y-1.5">
                <li v-for="row in usage.byFeature" :key="row.feature" class="flex items-center justify-between text-sm">
                  <span class="text-slate-600 dark:text-slate-300">{{ AIFeatureTypeLabels[row.feature] ?? row.feature }}</span>
                  <span class="text-slate-400 text-xs">{{ row.requests }} req · {{ row.tokens.toLocaleString() }} tok</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">By day</h4>
              <ul class="space-y-1">
                <li v-for="day in usage.byDay.slice(0, 10)" :key="day.date" class="flex items-center gap-2 text-xs">
                  <span class="w-14 text-slate-400 flex-shrink-0">{{ formatDay(day.date) }}</span>
                  <div class="flex-1 h-2 rounded bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <div class="h-full bg-brand-500/70 rounded" :style="{ width: `${Math.max(4, (day.tokens / maxDayTokens) * 100)}%` }" />
                  </div>
                  <span class="w-20 text-right text-slate-400 flex-shrink-0">{{ day.tokens.toLocaleString() }} tok</span>
                </li>
              </ul>
            </div>
          </div>
        </template>
        <p v-else class="text-sm text-slate-400">No AI usage recorded this month.</p>
      </div>
    </template>
  </div>
</template>
