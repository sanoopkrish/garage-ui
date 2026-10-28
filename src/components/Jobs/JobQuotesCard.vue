<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { FileText, Plus, Send, Trash2, CheckCircle2, XCircle, Download, Sparkles, Loader2 } from 'lucide-vue-next'
import { suggestQuoteLines } from '@/api/ai.api'
import { AIFeatureType, useAiFeatures } from '@/composables/useAiFeatures'
import { getQuotesForJob, createQuote, sendQuote, respondQuote, deleteQuote, downloadQuotePdf } from '@/api/quotes.api'
import type { Quote, QuoteLineInput } from '@/api/quotes.api'
import { QuoteStatus, QuoteLineType, QuoteLineStatus } from '@/types/generated/enums/quote'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

const props = defineProps<{ jobId: string }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const { hasPermission: canCreateQuote } = usePermissions('menus.workshop.jobs.createQuote')
const { hasPermission: canSendQuote } = usePermissions('menus.workshop.jobs.sendQuote')
const { hasPermission: canRespondQuote } = usePermissions('menus.workshop.jobs.respondQuote')
// Proposal Module 7: pricing hidden from technicians — card only renders for staff with quote or finance access
const { hasAnyPermission: canViewPricing } = usePermissions([
  'menus.workshop.jobs.createQuote',
  'menus.workshop.jobs.sendQuote',
  'menus.workshop.jobs.respondQuote',
  'menus.finance.invoices.read',
])

const quotes = ref<Quote[]>([])
const loading = ref(true)

const statusLabels: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: 'Draft',
  [QuoteStatus.SENT]: 'Sent',
  [QuoteStatus.PARTIALLY_APPROVED]: 'Partially Approved',
  [QuoteStatus.APPROVED]: 'Approved',
  [QuoteStatus.REJECTED]: 'Rejected',
  [QuoteStatus.EXPIRED]: 'Expired',
}
const statusVariant: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: 'pending',
  [QuoteStatus.SENT]: 'open',
  [QuoteStatus.PARTIALLY_APPROVED]: 'progress',
  [QuoteStatus.APPROVED]: 'done',
  [QuoteStatus.REJECTED]: 'cancelled',
  [QuoteStatus.EXPIRED]: 'cancelled',
}

const gbp = (v: number) => `£${Number(v).toFixed(2)}`

async function load() {
  if (!canViewPricing.value) return
  loading.value = true
  try {
    quotes.value = await getQuotesForJob(props.jobId)
  } catch {
    ToastService.error('Failed to load quotes')
  } finally {
    loading.value = false
  }
}

// ── Builder modal ─────────────────────────────────────────────────────────────
const showBuilder = ref(false)
const submitting = ref(false)

interface DraftLine {
  lineType: QuoteLineType
  description: string
  hours: string
  rate: string
  quantity: string
  costPrice: string
  markupPercent: string
}

const draftLines = ref<DraftLine[]>([])
const draftNotes = ref('')

function emptyLine(type: QuoteLineType): DraftLine {
  return { lineType: type, description: '', hours: '', rate: '', quantity: '1', costPrice: '', markupPercent: '' }
}

function openBuilder() {
  draftLines.value = [emptyLine(QuoteLineType.LABOUR)]
  draftNotes.value = ''
  showBuilder.value = true
}

// ── AI line suggestions (draft only — user edits/removes before saving) ──────
const { hasFeature } = useAiFeatures()
const suggesting = ref(false)

async function suggestLines() {
  suggesting.value = true
  try {
    const suggestion = await suggestQuoteLines(props.jobId)
    const mapped: DraftLine[] = suggestion.lines.map((l) => ({
      lineType: l.lineType === 'part' ? QuoteLineType.PART : QuoteLineType.LABOUR,
      description: l.description,
      hours: l.hours != null ? String(l.hours) : '',
      rate: '',
      quantity: l.quantity != null ? String(l.quantity) : '1',
      costPrice: l.costPrice != null ? String(l.costPrice) : '',
      markupPercent: '',
    }))
    const existing = draftLines.value.filter((dl) => dl.description.trim())
    draftLines.value = [...existing, ...mapped]
    ToastService.success(suggestion.reasoning || 'Suggested lines added — review and adjust before saving')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'AI suggestion failed')
  } finally {
    suggesting.value = false
  }
}

async function submitQuote() {
  const lines: QuoteLineInput[] = []
  for (const dl of draftLines.value) {
    if (!dl.description.trim()) {
      ToastService.warning('Every line needs a description')
      return
    }
    lines.push({
      lineType: dl.lineType,
      description: dl.description.trim(),
      hours: dl.lineType === QuoteLineType.LABOUR && dl.hours !== '' ? Number(dl.hours) : undefined,
      rate: dl.lineType === QuoteLineType.LABOUR && dl.rate !== '' ? Number(dl.rate) : undefined,
      quantity: dl.lineType === QuoteLineType.PART && dl.quantity !== '' ? Number(dl.quantity) : undefined,
      costPrice: dl.lineType === QuoteLineType.PART && dl.costPrice !== '' ? Number(dl.costPrice) : undefined,
      markupPercent: dl.lineType === QuoteLineType.PART && dl.markupPercent !== '' ? Number(dl.markupPercent) : undefined,
    })
  }
  submitting.value = true
  try {
    await createQuote(props.jobId, lines, draftNotes.value.trim() || undefined)
    ToastService.success('Draft quote created')
    showBuilder.value = false
    await load()
  } catch (err: any) {
    const message = err?.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to create quote'))
  } finally {
    submitting.value = false
  }
}

// ── Send / delete ─────────────────────────────────────────────────────────────
async function handleSend(quote: Quote) {
  const result = await showConfirmDialog(`Send ${quote.quoteNumber} to the customer? The job moves to Awaiting Authorisation.`, false, 'Send')
  if (!result.isConfirmed) return
  try {
    await sendQuote(quote.id)
    ToastService.success('Quote sent')
    await load()
    emit('changed')
  } catch (err: any) {
    const message = err?.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to send quote'))
  }
}

async function handlePdf(quote: Quote) {
  try {
    await downloadQuotePdf(quote.id, quote.quoteNumber)
  } catch {
    ToastService.error('Failed to download PDF')
  }
}

async function handleDelete(quote: Quote) {
  const result = await showConfirmDialog(`Delete draft ${quote.quoteNumber}?`, false, 'Delete')
  if (!result.isConfirmed) return
  try {
    await deleteQuote(quote.id)
    ToastService.success('Draft deleted')
    await load()
  } catch {
    ToastService.error('Failed to delete quote')
  }
}

// ── Respond modal ─────────────────────────────────────────────────────────────
const respondingQuote = ref<Quote | null>(null)
const lineDecisions = reactive<Record<string, QuoteLineStatus>>({})
const respondNote = ref('')
const respondSubmitting = ref(false)

function openRespond(quote: Quote) {
  respondingQuote.value = quote
  respondNote.value = ''
  for (const line of quote.lines) {
    lineDecisions[line.id] = line.lineStatus === QuoteLineStatus.PENDING ? QuoteLineStatus.APPROVED : line.lineStatus
  }
}

const respondTotals = computed(() => {
  const q = respondingQuote.value
  if (!q) return { net: 0 }
  const net = q.lines.filter((l) => lineDecisions[l.id] === QuoteLineStatus.APPROVED).reduce((s, l) => s + Number(l.lineTotal), 0)
  return { net: Math.round(net * 100) / 100 }
})

async function submitRespond() {
  const q = respondingQuote.value
  if (!q) return
  respondSubmitting.value = true
  try {
    await respondQuote(
      q.id,
      q.lines.map((l) => ({ lineId: l.id, status: lineDecisions[l.id] })),
      respondNote.value.trim() || undefined,
    )
    ToastService.success('Customer response recorded')
    respondingQuote.value = null
    await load()
    emit('changed')
  } catch (err: any) {
    const message = err?.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to record response'))
  } finally {
    respondSubmitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="canViewPricing" class="card">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <FileText class="w-4 h-4 text-brand-500" />
        <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Quotes</h2>
      </div>
      <UiButton v-if="canCreateQuote" variant="secondary" @click="openBuilder"><Plus class="w-4 h-4" /> New Quote</UiButton>
    </div>

    <p v-if="loading" class="text-sm text-slate-400 animate-pulse">Loading quotes…</p>
    <p v-else-if="quotes.length === 0" class="text-sm text-slate-400">No quotes yet.</p>

    <div v-else class="space-y-4">
      <div v-for="q in quotes" :key="q.id" class="border border-slate-100 dark:border-dark-border rounded-lg p-3.5">
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <span class="font-semibold text-brand-600">{{ q.quoteNumber }}</span>
          <UiBadge :variant="(statusVariant[q.status] as any)" dot>{{ statusLabels[q.status] }}</UiBadge>
          <span class="ml-auto text-sm font-semibold text-slate-700 dark:text-slate-200">
            {{ gbp(q.grossTotal) }} <span class="text-xs font-normal text-slate-400">inc VAT</span>
          </span>
        </div>

        <table class="w-full text-sm mb-2">
          <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
            <tr v-for="line in q.lines" :key="line.id">
              <td class="py-1.5 pr-2">
                <span :class="line.lineStatus === QuoteLineStatus.REJECTED ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'">{{ line.description }}</span>
                <span class="text-xs text-slate-400 ml-1">
                  <template v-if="line.lineType === QuoteLineType.LABOUR">{{ line.hours }}h × {{ gbp(line.rate ?? 0) }}</template>
                  <template v-else>{{ line.quantity }} × {{ gbp(line.sellPrice ?? 0) }}</template>
                </span>
              </td>
              <td class="py-1.5 text-right whitespace-nowrap">
                <CheckCircle2 v-if="line.lineStatus === QuoteLineStatus.APPROVED" class="w-3.5 h-3.5 text-green-500 inline mr-1" />
                <XCircle v-else-if="line.lineStatus === QuoteLineStatus.REJECTED" class="w-3.5 h-3.5 text-red-400 inline mr-1" />
                <span class="text-slate-600 dark:text-slate-300">{{ gbp(line.lineTotal) }}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="flex items-center justify-between text-xs text-slate-400">
          <span>Net {{ gbp(q.netTotal) }} · VAT {{ gbp(q.vatAmount) }}<template v-if="q.status === QuoteStatus.PARTIALLY_APPROVED"> · Approved {{ gbp(q.approvedNetTotal) }} net</template></span>
          <div class="flex items-center gap-1.5">
            <button @click="handlePdf(q)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600" title="Download PDF">
              <Download class="w-3.5 h-3.5" />
            </button>
            <UiButton v-if="q.status === QuoteStatus.DRAFT && canSendQuote" @click="handleSend(q)"><Send class="w-3.5 h-3.5" /> Send</UiButton>
            <UiButton v-if="[QuoteStatus.SENT, QuoteStatus.PARTIALLY_APPROVED].includes(q.status) && canRespondQuote" variant="secondary" @click="openRespond(q)">Record Response</UiButton>
            <button v-if="q.status === QuoteStatus.DRAFT && canCreateQuote" @click="handleDelete(q)" class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500" title="Delete draft">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quote builder modal -->
    <UiModal :open="showBuilder" title="New Quote" @close="showBuilder = false">
      <div class="space-y-4">
        <div v-for="(line, i) in draftLines" :key="i" class="border border-slate-100 dark:border-dark-border rounded-lg p-3 space-y-3">
          <div class="flex items-center gap-2">
            <div class="w-32">
              <UiSelect v-model="line.lineType" :options="[
                { value: QuoteLineType.LABOUR, label: 'Labour' },
                { value: QuoteLineType.PART, label: 'Part' },
              ]" />
            </div>
            <div class="flex-1"><UiInput v-model="line.description" placeholder="Description" /></div>
            <button v-if="draftLines.length > 1" @click="draftLines.splice(i, 1)" class="p-1.5 text-slate-400 hover:text-red-500"><Trash2 class="w-4 h-4" /></button>
          </div>
          <div v-if="line.lineType === QuoteLineType.LABOUR" class="grid grid-cols-2 gap-3">
            <UiInput v-model="line.hours" label="Hours" type="number" placeholder="2" />
            <UiInput v-model="line.rate" label="Rate £/hr (blank = agreed/default)" type="number" placeholder="auto" />
          </div>
          <div v-else class="grid grid-cols-3 gap-3">
            <UiInput v-model="line.quantity" label="Qty" type="number" placeholder="1" />
            <UiInput v-model="line.costPrice" label="Cost £" type="number" placeholder="85" />
            <UiInput v-model="line.markupPercent" label="Markup % (blank = default)" type="number" placeholder="auto" />
          </div>
        </div>
        <div class="flex gap-2">
          <UiButton variant="secondary" @click="draftLines.push(emptyLine(QuoteLineType.LABOUR))"><Plus class="w-3.5 h-3.5" /> Labour</UiButton>
          <UiButton variant="secondary" @click="draftLines.push(emptyLine(QuoteLineType.PART))"><Plus class="w-3.5 h-3.5" /> Part</UiButton>
          <UiButton
            v-if="hasFeature(AIFeatureType.QUOTE_SUGGESTIONS)"
            variant="secondary"
            :disabled="suggesting"
            @click="suggestLines"
          >
            <Loader2 v-if="suggesting" class="w-3.5 h-3.5 animate-spin" />
            <Sparkles v-else class="w-3.5 h-3.5" />
            {{ suggesting ? 'Suggesting…' : 'Suggest with AI' }}
          </UiButton>
        </div>
        <UiInput v-model="draftNotes" label="Notes (optional)" placeholder="Shown on the quote" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showBuilder = false">Cancel</UiButton>
        <UiButton :loading="submitting" @click="submitQuote">Create Draft</UiButton>
      </template>
    </UiModal>

    <!-- Respond modal -->
    <UiModal :open="!!respondingQuote" :title="`Record Response — ${respondingQuote?.quoteNumber ?? ''}`" @close="respondingQuote = null">
      <div v-if="respondingQuote" class="space-y-3">
        <div v-for="line in respondingQuote.lines" :key="line.id" class="flex items-center gap-3 text-sm">
          <span class="flex-1 text-slate-700 dark:text-slate-200 truncate">{{ line.description }} <span class="text-xs text-slate-400">{{ gbp(line.lineTotal) }}</span></span>
          <div class="flex rounded-lg overflow-hidden border border-slate-200 dark:border-dark-border">
            <button
              :class="['px-3 py-1 text-xs font-medium', lineDecisions[line.id] === QuoteLineStatus.APPROVED ? 'bg-green-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5']"
              @click="lineDecisions[line.id] = QuoteLineStatus.APPROVED"
            >Approve</button>
            <button
              :class="['px-3 py-1 text-xs font-medium', lineDecisions[line.id] === QuoteLineStatus.REJECTED ? 'bg-red-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5']"
              @click="lineDecisions[line.id] = QuoteLineStatus.REJECTED"
            >Reject</button>
          </div>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-dark-border">
          Approved total: <span class="font-semibold text-slate-700 dark:text-slate-200">{{ gbp(respondTotals.net) }} net</span>
        </p>
        <UiInput v-model="respondNote" label="Note (optional)" placeholder="e.g. Confirmed by phone with Mrs Clarke" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="respondingQuote = null">Cancel</UiButton>
        <UiButton :loading="respondSubmitting" @click="submitRespond">Record Response</UiButton>
      </template>
    </UiModal>
  </div>
</template>
