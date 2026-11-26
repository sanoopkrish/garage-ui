<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import { MessageSquare, Send, Loader2, Globe, CheckCheck, ChevronUp } from 'lucide-vue-next'
import { getJobNotesWithMeta, addJobNote, markJobNoteAnswered, type JobNote } from '@/api/jobs.api'
import { NoteSource } from '@/types/generated/enums/job'
import { NoteVisibility } from '@/types/generated/enums/portal'
import { useCrudPermissions, usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/**
 * Sprint 26 — job notes feed (office side). Field engineers and technicians post from the
 * field app; the office replies here. Append-only: nothing is edited or deleted.
 *
 * Sprint 29 — the customer portal's message thread lives in the same feed: customer
 * messages are highlighted, a reply can be made visible to the customer, and an unanswered
 * message can be marked as answered.
 */
const props = defineProps<{ jobId: string }>()
const { canUpdate } = useCrudPermissions('workshop', 'jobs')
const { hasPermission: canPortal } = usePermissions('menus.crm.portal.update')

const loading = ref(true)
const notes = ref<JobNote[]>([])
const unanswered = ref(0)
const draft = ref('')
const toCustomer = ref(false)
const posting = ref(false)
const answeringId = ref<string | null>(null)

// The feed is capped in height: open on the newest entry and say when there is more above
const list = ref<HTMLElement | null>(null)
const hiddenAbove = ref(0)

function updateHidden() {
  const el = list.value
  if (!el) { hiddenAbove.value = 0; return }
  const rows = Array.from(el.children) as HTMLElement[]
  hiddenAbove.value = rows.filter((r) => r.offsetTop + r.offsetHeight <= el.scrollTop + 4).length
}

async function scrollToLatest() {
  await nextTick()
  const el = list.value
  if (el) el.scrollTop = el.scrollHeight
  updateHidden()
}

const fromCustomer = (n: JobNote) => !!n.authorContactId
const customerVisible = (n: JobNote) => n.visibility === NoteVisibility.CUSTOMER
const hasCustomerThread = computed(() => notes.value.some(customerVisible))

async function load() {
  loading.value = true
  try {
    const res = await getJobNotesWithMeta(props.jobId)
    notes.value = res.items
    unanswered.value = res.unanswered
    // Replying to an open customer message defaults to a customer-visible reply
    if (res.unanswered > 0 && canPortal.value) toCustomer.value = true
  } catch {
    ToastService.error('Failed to load job notes')
  } finally {
    loading.value = false
  }
  // the list only exists once loading is false
  await scrollToLatest()
}

async function post() {
  const body = draft.value.trim()
  if (!body || posting.value) return
  posting.value = true
  try {
    const note = await addJobNote(props.jobId, body, toCustomer.value && canPortal.value ? NoteVisibility.CUSTOMER : undefined)
    notes.value.push(note)
    draft.value = ''
    await scrollToLatest()
    if (note.visibility === NoteVisibility.CUSTOMER) {
      // the API marks every open customer message answered when the office replies visibly
      const now = new Date().toISOString()
      notes.value = notes.value.map((n) => (fromCustomer(n) && !n.answeredAt ? { ...n, answeredAt: now } : n))
      unanswered.value = 0
      ToastService.success('Reply sent to the customer')
    }
  } catch (e: any) {
    ToastService.error(e?.response?.data?.message ?? 'Failed to add the note')
  } finally {
    posting.value = false
  }
}

async function markAnswered(n: JobNote) {
  answeringId.value = n.id
  try {
    const updated = await markJobNoteAnswered(props.jobId, n.id)
    notes.value = notes.value.map((x) => (x.id === updated.id ? updated : x))
    unanswered.value = Math.max(0, unanswered.value - 1)
  } catch (e: any) {
    ToastService.error(e?.response?.data?.message ?? 'Could not mark as answered')
  } finally {
    answeringId.value = null
  }
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function badge(n: JobNote): { label: string; cls: string } {
  if (fromCustomer(n)) return { label: 'Customer', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' }
  if (customerVisible(n)) return { label: 'Reply to customer', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' }
  if (n.source === NoteSource.FIELD) return { label: 'Field', cls: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' }
  return { label: 'Office', cls: 'bg-slate-200/70 text-slate-600 dark:bg-white/10 dark:text-slate-300' }
}

onMounted(load)
</script>

<template>
  <div class="card" data-help="job-notes">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <MessageSquare class="w-4 h-4 text-brand-500" />
        <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Job notes<template v-if="hasCustomerThread"> &amp; messages</template></h2>
        <span v-if="notes.length" class="text-xs text-slate-400">{{ notes.length }}</span>
      </div>
      <span v-if="unanswered" class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        {{ unanswered }} customer message{{ unanswered === 1 ? '' : 's' }} waiting
      </span>
    </div>

    <div v-if="loading" class="h-16 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <template v-else>
      <p v-if="!notes.length" class="text-sm text-slate-400 mb-3">No notes yet. Field notes from the engineer and customer messages from the portal appear here as they arrive.</p>
      <div v-else class="relative mb-3">
        <button
          v-if="hiddenAbove > 0"
          type="button"
          class="absolute top-0 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/95 dark:bg-dark-surface/95 border border-slate-200 dark:border-dark-border text-slate-500 shadow-sm hover:text-brand-500"
          title="Scroll up for earlier notes"
          @click="list?.scrollTo({ top: 0, behavior: 'smooth' })"
        >
          <ChevronUp class="w-3 h-3" /> {{ hiddenAbove }} earlier
        </button>
      <ul ref="list" class="space-y-2 max-h-96 overflow-y-auto pr-1 scroll-smooth [scrollbar-gutter:stable]" @scroll.passive="updateHidden">
        <li
          v-for="n in notes"
          :key="n.id"
          :class="['rounded-lg px-3 py-2 text-sm',
            fromCustomer(n) ? 'bg-emerald-50/70 border border-emerald-100 dark:bg-emerald-900/15 dark:border-emerald-900/40' : customerVisible(n) ? 'bg-slate-50 border border-emerald-100/70 dark:bg-white/5 dark:border-emerald-900/30' : 'bg-slate-50 dark:bg-white/5']"
        >
          <div class="flex items-center gap-2 mb-0.5 flex-wrap">
            <span class="font-medium text-slate-700 dark:text-slate-200">{{ n.authorName }}</span>
            <span :class="['px-1.5 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1', badge(n).cls]">
              <Globe v-if="customerVisible(n)" class="w-2.5 h-2.5" />{{ badge(n).label }}
            </span>
            <span v-if="fromCustomer(n) && !n.answeredAt" class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Unanswered</span>
            <span class="ml-auto text-xs text-slate-400">{{ when(n.createdAt) }}</span>
          </div>
          <p class="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{{ n.body }}</p>
          <div v-if="fromCustomer(n) && !n.answeredAt && canPortal" class="mt-1.5">
            <button type="button" class="text-xs text-slate-500 hover:text-brand-500 inline-flex items-center gap-1" :disabled="answeringId === n.id" @click="markAnswered(n)">
              <Loader2 v-if="answeringId === n.id" class="w-3 h-3 animate-spin" /><CheckCheck v-else class="w-3 h-3" /> Mark as answered
            </button>
          </div>
        </li>
      </ul>
      </div>

      <div v-if="canUpdate" class="space-y-2">
        <div class="flex gap-2">
          <textarea
            v-model="draft"
            rows="2"
            maxlength="2000"
            :placeholder="toCustomer ? 'Write a reply the customer will see…' : 'Add a note for the team…'"
            :class="['flex-1 text-sm border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2',
              toCustomer ? 'border-emerald-300 focus:ring-emerald-400 dark:border-emerald-800' : 'border-slate-200 dark:border-dark-border focus:ring-brand-400']"
            @keydown.ctrl.enter.prevent="post"
            @keydown.meta.enter.prevent="post"
          />
          <UiButton :disabled="!draft.trim() || posting" @click="post">
            <Loader2 v-if="posting" class="w-4 h-4 animate-spin" />
            <Send v-else class="w-4 h-4" />
          </UiButton>
        </div>
        <label v-if="canPortal" class="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
          <input v-model="toCustomer" type="checkbox" class="rounded border-slate-300 text-brand-500 focus:ring-brand-400" />
          <Globe class="w-3.5 h-3.5" /> Visible to the customer in the portal
          <span v-if="toCustomer" class="text-emerald-700 dark:text-emerald-300">— they will be notified</span>
        </label>
      </div>
    </template>
  </div>
</template>
