<script setup lang="ts">
import { ref } from 'vue'
import GeneralSliderPanel from '@/components/Ui/GeneralSliderPanel.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { FileScan, Loader2, CheckCircle2, Upload } from 'lucide-vue-next'
import { analyseDiagnosticReport, confirmDiagnosticReport, type InboxAnalysis } from '@/api/jobs.api'
import { uploadTemporary } from '@/api/files.api'
import { jobStatusLabels, jobStatusBadgeVariant } from '@/utils/jobStatus'
import { ToastService } from '@/services/toast.service'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'attached'): void }>()

const phase = ref<'idle' | 'analysing' | 'review' | 'confirming'>('idle')
const s3Key = ref('')
const fileName = ref('')
const analysis = ref<InboxAnalysis | null>(null)

async function onFilePicked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  phase.value = 'analysing'
  fileName.value = file.name
  try {
    s3Key.value = await uploadTemporary(file)
    analysis.value = await analyseDiagnosticReport(s3Key.value)
    phase.value = 'review'
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not analyse the report')
    phase.value = 'idle'
  } finally {
    ;(event.target as HTMLInputElement).value = ''
  }
}

async function confirm(jobId: string) {
  phase.value = 'confirming'
  try {
    const result = await confirmDiagnosticReport(s3Key.value, jobId, analysis.value?.faultCodes, {
      summary: analysis.value?.summary,
      faultCodeDescriptions: Object.fromEntries(
        (analysis.value?.faultCodeDetails ?? []).filter((f) => f.description).map((f) => [f.code, f.description]),
      ),
    })
    ToastService.success(
      `Report attached${result.faultCodesCreated ? ` — ${result.faultCodesCreated} fault code${result.faultCodesCreated === 1 ? '' : 's'} recorded` : ''}`,
    )
    reset()
    emit('attached')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not attach the report')
    phase.value = 'review'
  }
}

function reset() {
  phase.value = 'idle'
  s3Key.value = ''
  fileName.value = ''
  analysis.value = null
}
</script>

<template>
  <GeneralSliderPanel :modelValue="modelValue" title="Diagnostic Inbox" @update:modelValue="(v: boolean) => { if (!v) reset(); emit('update:modelValue', v) }">
    <div class="space-y-5">
      <p class="text-sm text-slate-500 dark:text-slate-400">
        Drop in a diagnostic report PDF (e.g. from the Autel tablet) — Cruise reads the registration
        and fault codes and suggests the matching job.
      </p>

      <!-- Upload -->
      <label
        v-if="phase === 'idle' || phase === 'analysing'"
        :class="[
          'flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-dark-border rounded-xl py-12 cursor-pointer hover:border-brand-400 transition-colors',
          phase === 'analysing' ? 'opacity-60 pointer-events-none' : '',
        ]"
      >
        <Loader2 v-if="phase === 'analysing'" class="w-8 h-8 text-brand-500 animate-spin" />
        <FileScan v-else class="w-8 h-8 text-slate-300" />
        <span class="text-sm font-medium text-slate-600 dark:text-slate-300">
          {{ phase === 'analysing' ? `Analysing ${fileName}…` : 'Choose a report PDF' }}
        </span>
        <input type="file" accept="application/pdf" class="hidden" @change="onFilePicked" />
      </label>

      <!-- Review -->
      <template v-if="phase === 'review' || phase === 'confirming'">
        <div class="card !p-4 !shadow-none border border-slate-100 dark:border-dark-border">
          <p class="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{{ fileName }}</p>
          <div class="flex flex-wrap gap-4 text-sm text-slate-500">
            <span>Registrations: <strong>{{ analysis?.registrations.join(', ') || 'none found' }}</strong></span>
            <span v-if="analysis?.reportDate">Date: <strong>{{ analysis.reportDate }}</strong></span>
            <span v-if="analysis?.faultCodes.length">Fault codes: <strong class="font-mono">{{ analysis.faultCodes.join(', ') }}</strong></span>
            <span v-if="analysis?.vehicle?.make">Vehicle: <strong>{{ [analysis.vehicle.make, analysis.vehicle.model].filter(Boolean).join(' ') }}</strong></span>
          </div>
        </div>

        <!-- AI enrichment (shown only when the AI diagnostics feature produced a result) -->
        <div
          v-if="analysis?.aiUsed && (analysis?.summary || analysis?.customerExplanation)"
          class="rounded-lg border border-brand-200 dark:border-brand-500/30 bg-brand-50/50 dark:bg-brand-500/5 p-4 space-y-3"
        >
          <div v-if="analysis?.summary">
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-1">AI summary (saved to internal notes on confirm)</p>
            <p class="text-sm text-slate-700 dark:text-slate-200">{{ analysis.summary }}</p>
          </div>
          <div v-if="analysis?.customerExplanation">
            <p class="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-1">Customer-friendly explanation</p>
            <p class="text-sm text-slate-700 dark:text-slate-200">{{ analysis.customerExplanation }}</p>
          </div>
          <p class="text-[11px] text-slate-400">AI-generated — review before relying on it.</p>
        </div>

        <div v-if="analysis?.suggestions.length">
          <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Suggested jobs</h4>
          <div class="space-y-2">
            <div
              v-for="s in analysis.suggestions"
              :key="s.jobId"
              class="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-dark-border"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {{ s.jobNumber }} · {{ s.registration }}
                  <UiBadge :variant="(jobStatusBadgeVariant[s.status] as any)" class="ml-1">{{ jobStatusLabels[s.status] }}</UiBadge>
                </p>
                <p class="text-xs text-slate-400 truncate">{{ s.description }}<template v-if="s.customerName"> — {{ s.customerName }}</template></p>
              </div>
              <span v-if="s.confidence >= 0.9" class="text-[11px] font-medium text-green-600">Active job</span>
              <UiButton size="sm" :disabled="phase === 'confirming'" @click="confirm(s.jobId)">
                <CheckCircle2 class="w-4 h-4" /> Attach
              </UiButton>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-slate-400 py-4 text-center">
          No matching job found for {{ analysis?.registrations.join(', ') || 'this report' }} —
          open the job directly and use "Upload report" on its Diagnostics card.
        </div>

        <UiButton variant="ghost" @click="reset()"><Upload class="w-4 h-4" /> Analyse a different file</UiButton>
      </template>
    </div>
  </GeneralSliderPanel>
</template>
