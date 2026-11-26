<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Check, MapPin, FileText, Image as ImageIcon, Send, Loader2, Phone, X, Info } from 'lucide-vue-next'
import PortalLayout from '../PortalLayout.vue'
import { usePortalStore } from '../portal.store'
import { portalApi, type PortalFile, type PortalJob, type PortalMessage } from '../portal.api'
import { portalErrorMessage } from '../portal.client'

/**
 * Sprint 29 — one job as the customer sees it: progress stepper in plain words, visits,
 * shared photos and documents, and the message thread with the workshop.
 */
const route = useRoute()
const portal = usePortalStore()
const jobId = String(route.params.id)

const loading = ref(true)
const job = ref<PortalJob | null>(null)
const error = ref('')
const messages = ref<PortalMessage[]>([])
const canMessage = ref(false)
const draft = ref('')
const sending = ref(false)
const sendError = ref('')
const thumbs = ref<Record<string, string>>({})
const lightbox = ref<{ url: string; name: string } | null>(null)
const showHow = ref(false)
const thread = ref<HTMLElement | null>(null)

const title = computed(() => job.value?.vehicle?.registration ?? job.value?.jobNumber ?? 'Job')

function day(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
function when(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function size(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function openFile(f: PortalFile) {
  try {
    const { url } = await portalApi.attachmentUrl(f.id)
    if (f.fileType.startsWith('image/')) lightbox.value = { url, name: f.fileName }
    else window.open(url, '_blank', 'noopener')
  } catch (e: any) {
    error.value = portalErrorMessage(e, 'That file is not available right now.')
  }
}

async function loadThumbs(photos: PortalFile[]) {
  for (const p of photos.slice(0, 12)) {
    portalApi.attachmentUrl(p.id).then(({ url }) => { thumbs.value[p.id] = url }).catch(() => undefined)
  }
}

async function loadMessages() {
  if (!portal.features.messages) return
  try {
    const res = await portalApi.messages(jobId)
    messages.value = res.items
    canMessage.value = res.canMessage
    await nextTick()
    thread.value?.scrollTo({ top: thread.value.scrollHeight })
  } catch { /* thread stays empty */ }
}

async function send() {
  const body = draft.value.trim()
  if (!body || sending.value) return
  sending.value = true
  sendError.value = ''
  try {
    const m = await portalApi.postMessage(jobId, body)
    messages.value.push(m)
    draft.value = ''
    await nextTick()
    thread.value?.scrollTo({ top: thread.value.scrollHeight })
  } catch (e: any) {
    sendError.value = portalErrorMessage(e, 'Your message could not be sent. Please try again.')
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  try {
    job.value = await portalApi.job(jobId)
    loadThumbs(job.value.photos)
    await loadMessages()
  } catch (e: any) {
    error.value = e?.response?.status === 404 ? 'We could not find that job on your account.' : portalErrorMessage(e, 'Could not load this job right now.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <PortalLayout :title="title" back-to="/portal/home">
    <div v-if="loading" class="space-y-3">
      <div class="h-28 rounded-xl animate-pulse bg-slate-200/60 dark:bg-white/5" />
      <div class="h-40 rounded-xl animate-pulse bg-slate-200/60 dark:bg-white/5" />
    </div>
    <p v-else-if="error && !job" class="card text-sm text-red-600">{{ error }}</p>

    <div v-else-if="job" class="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 lg:items-start space-y-5 lg:space-y-0">
     <div class="space-y-5 min-w-0">
      <!-- Status -->
      <section class="card">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-slate-400">{{ job.jobNumber }}<template v-if="job.vehicle?.make"> · {{ job.vehicle.make }} {{ job.vehicle.model }}</template></p>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{{ job.statusPhrase }}</h2>
            <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">{{ job.nextStep }}</p>
          </div>
          <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:text-brand-500" aria-label="How this works" @click="showHow = !showHow"><Info class="w-5 h-5" /></button>
        </div>
        <p v-if="showHow" class="mt-3 text-xs text-slate-500 bg-slate-50 dark:bg-white/5 rounded-lg px-3 py-2">
          Each job moves through the stages below as the workshop records progress. You'll see photos and documents here when the team shares them, and you can send a message at any time — the office is notified and replies on this page.
        </p>
        <p class="text-sm text-slate-500 mt-3">{{ job.description }}</p>

        <!-- Stepper -->
        <ol v-if="portal.features.jobStatus && job.status !== 'cancelled'" class="mt-4 space-y-2">
          <li v-for="s in job.steps" :key="s.status" class="flex items-center gap-3">
            <span
              :class="['w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold',
                s.state === 'done' ? 'bg-brand-500 text-brand-contrast' : s.state === 'current' ? 'bg-white dark:bg-dark-surface ring-2 ring-brand-500 text-brand-500' : 'bg-slate-200 dark:bg-white/10 text-transparent']"
            ><Check v-if="s.state === 'done'" class="w-3 h-3" /><span v-else-if="s.state === 'current'" class="w-2 h-2 rounded-full bg-brand-500" /></span>
            <span :class="['text-sm', s.state === 'current' ? 'font-semibold text-slate-800 dark:text-slate-100' : s.state === 'done' ? 'text-slate-500' : 'text-slate-400']">{{ s.label }}</span>
          </li>
        </ol>

        <div v-if="job.visits.length || job.siteAddress" class="mt-4 pt-3 border-t border-slate-100 dark:border-dark-border space-y-1.5">
          <p v-if="job.siteAddress" class="text-xs text-slate-500 inline-flex items-center gap-1.5"><MapPin class="w-3.5 h-3.5" /> On site at {{ job.siteAddress.street }}, {{ job.siteAddress.city }} {{ job.siteAddress.postcode }}</p>
          <p v-for="v in job.visits" :key="v.date" class="text-xs text-slate-500">
            {{ job.onSite ? 'Engineer visit' : 'Workshop day' }} {{ day(v.date) }}<template v-if="v.technicianFirstName"> with {{ v.technicianFirstName }}</template>
            <span v-if="v.status === 'done'" class="text-emerald-600"> · done</span><span v-else-if="v.status === 'missed'" class="text-amber-600"> · rescheduled</span>
          </p>
        </div>
      </section>

      <!-- Photos & documents -->
      <section v-if="portal.features.documents" class="card">
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Photos &amp; documents</h3>
        <p v-if="!job.photos.length && !job.documents.length" class="text-sm text-slate-400">Nothing shared yet. Certificates and reports appear here when the work is done.</p>
        <div v-if="job.photos.length" class="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          <button v-for="p in job.photos" :key="p.id" type="button" class="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5" @click="openFile(p)">
            <img v-if="thumbs[p.id]" :src="thumbs[p.id]" :alt="p.caption ?? p.fileName" class="w-full h-full object-cover" />
            <ImageIcon v-else class="w-6 h-6 text-slate-300 absolute inset-0 m-auto" />
          </button>
        </div>
        <ul v-if="job.documents.length" class="divide-y divide-slate-100 dark:divide-dark-border">
          <li v-for="d in job.documents" :key="d.id">
            <button type="button" class="w-full flex items-center gap-3 py-2 text-left" @click="openFile(d)">
              <FileText class="w-5 h-5 text-brand-500 flex-shrink-0" />
              <span class="min-w-0 flex-1">
                <span class="block text-sm text-slate-700 dark:text-slate-200 truncate">{{ d.caption || d.fileName }}</span>
                <span class="block text-xs text-slate-400">{{ day(d.createdAt) }} · {{ size(d.fileSize) }}</span>
              </span>
            </button>
          </li>
        </ul>
      </section>

     </div>
     <div class="space-y-5 min-w-0 lg:sticky lg:top-20">
      <!-- Messages -->
      <section v-if="portal.features.messages" class="card">
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Messages</h3>
        <div ref="thread" class="space-y-2 max-h-80 lg:max-h-[60vh] overflow-y-auto pr-1">
          <p v-if="!messages.length" class="text-sm text-slate-400">No messages yet. Ask a question and the workshop will reply here.</p>
          <div v-for="m in messages" :key="m.id" :class="['flex', m.fromCustomer ? 'justify-end' : 'justify-start']">
            <div :class="['max-w-[85%] rounded-2xl px-3.5 py-2 text-sm', m.fromCustomer ? 'bg-brand-500 text-brand-contrast rounded-br-md' : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100 rounded-bl-md']">
              <p class="whitespace-pre-wrap">{{ m.body }}</p>
              <p :class="['text-[10px] mt-1', m.fromCustomer ? 'text-brand-contrast/70' : 'text-slate-400']">{{ m.fromCustomer ? (m.mine ? 'You' : m.authorName) : m.authorName }} · {{ when(m.createdAt) }}</p>
            </div>
          </div>
        </div>
        <form v-if="canMessage" class="mt-3 flex gap-2" @submit.prevent="send">
          <textarea v-model="draft" rows="2" maxlength="2000" placeholder="Write a message to the workshop…" class="flex-1 text-sm rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          <button type="submit" :disabled="!draft.trim() || sending" class="self-end px-3 py-2.5 rounded-xl bg-brand-500 text-brand-contrast disabled:opacity-60" aria-label="Send">
            <Loader2 v-if="sending" class="w-5 h-5 animate-spin" /><Send v-else class="w-5 h-5" />
          </button>
        </form>
        <p v-else class="mt-3 text-xs text-slate-400">This job is closed. Please call the workshop if you need anything.</p>
        <p v-if="sendError" class="mt-2 text-xs text-red-600">{{ sendError }}</p>
      </section>

      <a v-if="portal.me?.workshop.phone" :href="`tel:${portal.me.workshop.phone.replace(/\s+/g, '')}`" class="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-brand-400">
        <Phone class="w-4 h-4 text-brand-500" /> Call {{ portal.me.workshop.name }}
      </a>
     </div>
    </div>

    <!-- Lightbox -->
    <div v-if="lightbox" class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" @click="lightbox = null">
      <button type="button" class="absolute top-4 right-4 p-2 text-white/80 hover:text-white" aria-label="Close"><X class="w-6 h-6" /></button>
      <img :src="lightbox.url" :alt="lightbox.name" class="max-w-full max-h-full object-contain rounded-lg" />
    </div>
  </PortalLayout>
</template>
