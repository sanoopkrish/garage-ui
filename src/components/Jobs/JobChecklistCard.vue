<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import { ClipboardCheck, Plus, Trash2, CheckCircle2 } from 'lucide-vue-next'
import {
  getChecklist, addChecklistItem, updateChecklistItem, deleteChecklistItem,
  type ChecklistItem,
} from '@/api/jobs.api'
import { useCrudPermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

const props = defineProps<{ jobId: string; jobStatus?: string }>()

const { canUpdate } = useCrudPermissions('workshop', 'jobs')

const items = ref<ChecklistItem[]>([])
const loading = ref(true)
const newLabel = ref('')

const doneCount = computed(() => items.value.filter((i) => i.done).length)

const groups = computed(() => {
  const field = items.value.filter((i) => i.type !== 'qc')
  const qc = items.value.filter((i) => i.type === 'qc')
  return [
    { key: 'field', label: 'Field work', items: field },
    { key: 'qc', label: 'Quality check (required before Complete)', items: qc },
  ].filter((g) => g.items.length)
})

async function load() {
  loading.value = true
  try {
    items.value = await getChecklist(props.jobId)
  } finally {
    loading.value = false
  }
}

async function toggle(item: ChecklistItem) {
  try {
    const updated = await updateChecklistItem(props.jobId, item.id, { done: !item.done })
    Object.assign(item, updated)
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not update the item')
  }
}

async function add() {
  const label = newLabel.value.trim()
  if (!label) return
  try {
    items.value.push(await addChecklistItem(props.jobId, label))
    newLabel.value = ''
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not add the item')
  }
}

async function remove(item: ChecklistItem) {
  const result = await showConfirmDialog(`"${item.label}" will be removed from the checklist.`)
  if (!result.isConfirmed) return
  await deleteChecklistItem(props.jobId, item.id)
  items.value = items.value.filter((i) => i.id !== item.id)
}

// Status transitions create items server-side (QC auto-seed on entering Quality Check)
watch(() => props.jobStatus, () => load())

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
        <ClipboardCheck class="w-5 h-5 text-brand-500" />
        Checklist
      </h3>
      <span v-if="items.length" class="text-sm text-slate-400">{{ doneCount }}/{{ items.length }} done</span>
    </div>

    <div v-if="loading" class="space-y-2 animate-pulse">
      <div v-for="i in 3" :key="i" class="h-8 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
    </div>

    <template v-else>
      <div v-for="g in groups" :key="g.key" class="mb-3">
        <h4 v-if="groups.length > 1" class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{{ g.label }}</h4>
      <ul class="space-y-1">
        <li v-for="item in g.items" :key="item.id" class="group flex items-start gap-3 py-1.5">
          <button
            @click="canUpdate && toggle(item)"
            :disabled="!canUpdate"
            :class="[
              'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
              item.done
                ? 'bg-brand-500 border-brand-500 text-white'
                : 'border-slate-300 dark:border-slate-600 text-transparent',
              !canUpdate ? 'cursor-default opacity-60' : '',
            ]"
          >
            <CheckCircle2 class="w-3.5 h-3.5" />
          </button>
          <div class="flex-1 min-w-0">
            <p :class="['text-sm', item.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200']">
              {{ item.label }}
            </p>
            <p v-if="item.note" class="text-xs text-slate-400">{{ item.note }}</p>
            <p v-if="item.done && item.doneBy" class="text-[11px] text-slate-400">
              {{ item.doneBy }}<span v-if="item.doneAt"> · {{ new Date(item.doneAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }}</span>
            </p>
          </div>
          <button
            v-if="canUpdate"
            @click="remove(item)"
            class="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove item"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </li>
      </ul>
      </div>
      <p v-if="!items.length" class="text-sm text-slate-400 mb-3">No checklist items — add the field work list here.</p>

      <div v-if="canUpdate" class="flex gap-2 pt-3 border-t border-slate-100 dark:border-dark-border">
        <input
          v-model="newLabel"
          type="text"
          maxlength="300"
          placeholder="Add checklist item…"
          class="flex-1 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          @keyup.enter="add"
        />
        <UiButton size="sm" @click="add"><Plus class="w-4 h-4" /></UiButton>
      </div>
    </template>
  </div>
</template>
