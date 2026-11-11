<script setup lang="ts">
import { onMounted, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import { MessageSquare, Send, Loader2 } from 'lucide-vue-next'
import { getJobNotes, addJobNote, type JobNote } from '@/api/jobs.api'
import { NoteSource } from '@/types/generated/enums/job'
import { useCrudPermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/**
 * Sprint 26 — job notes feed (office side). Field engineers and technicians post from the
 * field app; the office replies here. Append-only: nothing is edited or deleted.
 */
const props = defineProps<{ jobId: string }>()
const { canUpdate } = useCrudPermissions('workshop', 'jobs')

const loading = ref(true)
const notes = ref<JobNote[]>([])
const draft = ref('')
const posting = ref(false)

async function load() {
  loading.value = true
  try {
    notes.value = await getJobNotes(props.jobId)
  } catch {
    ToastService.error('Failed to load job notes')
  } finally {
    loading.value = false
  }
}

async function post() {
  const body = draft.value.trim()
  if (!body || posting.value) return
  posting.value = true
  try {
    const note = await addJobNote(props.jobId, body)
    notes.value.push(note)
    draft.value = ''
  } catch (e: any) {
    ToastService.error(e?.response?.data?.message ?? 'Failed to add the note')
  } finally {
    posting.value = false
  }
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <MessageSquare class="w-4 h-4 text-brand-500" />
        <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Job notes</h2>
        <span v-if="notes.length" class="text-xs text-slate-400">{{ notes.length }}</span>
      </div>
    </div>

    <div v-if="loading" class="h-16 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <template v-else>
      <p v-if="!notes.length" class="text-sm text-slate-400 mb-3">No notes yet. Field notes from the engineer appear here as they are written.</p>
      <ul v-else class="space-y-2 mb-3 max-h-80 overflow-y-auto pr-1">
        <li v-for="n in notes" :key="n.id" class="rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-white/5">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="font-medium text-slate-700 dark:text-slate-200">{{ n.authorName }}</span>
            <span
              :class="['px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                n.source === NoteSource.FIELD ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' : 'bg-slate-200/70 text-slate-600 dark:bg-white/10 dark:text-slate-300']"
            >{{ n.source === NoteSource.FIELD ? 'Field' : 'Office' }}</span>
            <span class="ml-auto text-xs text-slate-400">{{ when(n.createdAt) }}</span>
          </div>
          <p class="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{{ n.body }}</p>
        </li>
      </ul>

      <div v-if="canUpdate" class="flex gap-2">
        <textarea
          v-model="draft"
          rows="2"
          maxlength="2000"
          placeholder="Add a note for the team…"
          class="flex-1 text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
          @keydown.ctrl.enter.prevent="post"
          @keydown.meta.enter.prevent="post"
        />
        <UiButton :disabled="!draft.trim() || posting" @click="post">
          <Loader2 v-if="posting" class="w-4 h-4 animate-spin" />
          <Send v-else class="w-4 h-4" />
        </UiButton>
      </div>
    </template>
  </div>
</template>
