<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Camera, FileUp, FileText, Loader2, Trash2, ExternalLink, Paperclip } from 'lucide-vue-next'
import {
  uploadTemporary, attachToEntity, listAttachments, getViewUrl, deleteAttachment,
  type Attachment,
} from '@/api/files.api'
import { AttachmentCategory } from '@/types/generated/enums/attachment'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

const props = defineProps<{ jobId: string }>()

const attachments = ref<Attachment[]>([])
const photoUrls = ref<Record<string, string>>({})
const loading = ref(true)
const uploading = ref(false)
const deletingId = ref<string | null>(null)

const photoCategory = ref<AttachmentCategory>(AttachmentCategory.WIP_PHOTO)
const photoCategoryOptions = [
  { value: AttachmentCategory.ARRIVAL_PHOTO, label: 'Arrival' },
  { value: AttachmentCategory.CHECKIN_PHOTO, label: 'Check-in' },
  { value: AttachmentCategory.WIP_PHOTO, label: 'Work in progress' },
  { value: AttachmentCategory.COMPLETION_PHOTO, label: 'Completion' },
]

const categoryLabels: Record<string, string> = {
  arrival_photo: 'Arrival',
  checkin_photo: 'Check-in',
  wip_photo: 'WIP',
  completion_photo: 'Completion',
  diagnostic_report: 'Diagnostic report',
  certificate: 'Certificate',
  supplier_invoice: 'Supplier invoice',
  document: 'Document',
  other: 'Other',
}

const photos = computed(() => attachments.value.filter((a) => a.contentType?.startsWith('image/')))
// Diagnostic reports and certificates have their own card (JobDiagnosticsCard) — don't list them twice
const documents = computed(() =>
  attachments.value.filter(
    (a) => !a.contentType?.startsWith('image/') && !['diagnostic_report', 'certificate'].includes(a.category),
  ),
)

const photoInput = ref<HTMLInputElement | null>(null)
const docInput = ref<HTMLInputElement | null>(null)

async function load() {
  loading.value = true
  try {
    attachments.value = await listAttachments('job', props.jobId)
    for (const p of photos.value) {
      if (!photoUrls.value[p.id]) {
        getViewUrl(p.s3Key, p.contentType).then((u) => { photoUrls.value[p.id] = u }).catch(() => {})
      }
    }
  } catch {
    /* card stays with empty state */
  } finally {
    loading.value = false
  }
}

async function onFilePicked(event: Event, category: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const s3Key = await uploadTemporary(file)
    const attachment = await attachToEntity(s3Key, 'job', props.jobId, category)
    attachments.value.unshift(attachment)
    if (attachment.contentType?.startsWith('image/')) {
      photoUrls.value[attachment.id] = await getViewUrl(attachment.s3Key, attachment.contentType)
    }
    ToastService.success(`${file.name} uploaded`)
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Upload failed — check storage configuration')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function remove(attachment: Attachment) {
  const result = await showConfirmDialog(`"${attachment.fileName}" will be permanently deleted from this job.`)
  if (!result.isConfirmed) return
  deletingId.value = attachment.id
  try {
    await deleteAttachment(attachment.id)
    attachments.value = attachments.value.filter((a) => a.id !== attachment.id)
    delete photoUrls.value[attachment.id]
    ToastService.success('Deleted')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to delete')
  } finally {
    deletingId.value = null
  }
}

async function openDocument(doc: Attachment) {
  window.open(await getViewUrl(doc.s3Key, doc.contentType), '_blank')
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

onMounted(load)
watch(() => props.jobId, load)
</script>

<template>
  <div class="card">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <Paperclip class="w-4 h-4 text-brand-500" /> Photos &amp; Files
      </h2>
      <div class="flex items-center gap-2">
        <select
          v-model="photoCategory"
          class="rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
          title="Category for the next photo upload"
        >
          <option v-for="opt in photoCategoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <label
          :class="[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium cursor-pointer transition-colors',
            uploading ? 'opacity-60 pointer-events-none' : '',
          ]"
        >
          <Camera class="w-3.5 h-3.5" /> Add photo
          <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="onFilePicked($event, photoCategory)" />
        </label>
        <label
          :class="[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-500 text-xs font-medium cursor-pointer transition-colors',
            uploading ? 'opacity-60 pointer-events-none' : '',
          ]"
        >
          <Loader2 v-if="uploading" class="w-3.5 h-3.5 animate-spin" />
          <FileUp v-else class="w-3.5 h-3.5" /> Upload file
          <input ref="docInput" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" class="hidden" @change="onFilePicked($event, 'document')" />
        </label>
      </div>
    </div>

    <div v-if="loading" class="h-20 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <template v-else>
      <!-- Photo grid -->
      <div v-if="photos.length" class="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
        <div v-for="p in photos" :key="p.id" class="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 group">
          <a :href="photoUrls[p.id]" target="_blank" rel="noopener" class="block w-full h-full">
            <img v-if="photoUrls[p.id]" :src="photoUrls[p.id]" :alt="p.fileName" class="w-full h-full object-cover" />
          </a>
          <span class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px] leading-tight">
            {{ categoryLabels[p.category] ?? p.category }}
          </span>
          <button
            type="button"
            :disabled="deletingId === p.id"
            @click.stop.prevent="remove(p)"
            class="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:!bg-red-600 transition-all"
            aria-label="Delete photo"
          >
            <Loader2 v-if="deletingId === p.id" class="w-3 h-3 animate-spin" />
            <Trash2 v-else class="w-3 h-3" />
          </button>
        </div>
      </div>

      <!-- Documents -->
      <ul v-if="documents.length" class="space-y-1.5">
        <li
          v-for="doc in documents"
          :key="doc.id"
          class="flex items-center gap-2 rounded-lg border border-slate-100 dark:border-dark-border px-3 py-2 text-sm"
        >
          <FileText class="w-4 h-4 text-slate-400 flex-shrink-0" />
          <button class="text-slate-700 dark:text-slate-200 hover:text-brand-500 truncate text-left" @click="openDocument(doc)">
            {{ doc.fileName }}
          </button>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 flex-shrink-0">
            {{ categoryLabels[doc.category] ?? doc.category }}
          </span>
          <span class="text-xs text-slate-400 ml-auto flex-shrink-0">{{ formatSize(doc.fileSize) }} · {{ formatDate(doc.createdAt) }}</span>
          <button class="p-1 text-slate-400 hover:text-brand-500 flex-shrink-0" title="Open" @click="openDocument(doc)">
            <ExternalLink class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 text-slate-400 hover:text-red-500 flex-shrink-0"
            :disabled="deletingId === doc.id"
            title="Delete"
            @click="remove(doc)"
          >
            <Loader2 v-if="deletingId === doc.id" class="w-3.5 h-3.5 animate-spin" />
            <Trash2 v-else class="w-3.5 h-3.5" />
          </button>
        </li>
      </ul>

      <p v-if="!photos.length && !documents.length" class="text-sm text-slate-400">
        No photos or files yet — add arrival/work photos or upload documents for this job.
      </p>
    </template>
  </div>
</template>
