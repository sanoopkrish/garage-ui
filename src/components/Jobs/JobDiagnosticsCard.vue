<script setup lang="ts">
import { onMounted, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { Activity, Plus, Trash2, FileText, Download, Award, Upload, Loader2 } from 'lucide-vue-next'
import {
  getFaultCodes, addFaultCode, updateFaultCode, deleteFaultCode,
  downloadAdasCertificate, attachAdasCertificate,
  type FaultCode,
} from '@/api/jobs.api'
import { uploadTemporary, attachToEntity, listAttachments, getViewUrl, type Attachment } from '@/api/files.api'
import { useCrudPermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

const props = defineProps<{ jobId: string; jobNumber?: string; showCertificate?: boolean }>()

const { canUpdate } = useCrudPermissions('workshop', 'jobs')

const faultCodes = ref<FaultCode[]>([])
const reports = ref<Attachment[]>([])
const loading = ref(true)
const newCode = ref('')
const newDescription = ref('')
const uploading = ref(false)
const certBusy = ref(false)

async function load() {
  loading.value = true
  try {
    const [codes, files] = await Promise.all([
      getFaultCodes(props.jobId),
      listAttachments('job', props.jobId, 'diagnostic_report').catch(() => []),
    ])
    faultCodes.value = codes
    reports.value = files
  } finally {
    loading.value = false
  }
}

async function add() {
  const code = newCode.value.trim()
  if (!code) return
  try {
    faultCodes.value.push(await addFaultCode(props.jobId, code, newDescription.value.trim() || undefined))
    newCode.value = ''
    newDescription.value = ''
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not add the fault code')
  }
}

async function toggleAuthorised(fc: FaultCode) {
  const updated = await updateFaultCode(props.jobId, fc.id, { authorised: !fc.authorised })
  Object.assign(fc, updated)
}

async function remove(fc: FaultCode) {
  const result = await showConfirmDialog(`Fault code ${fc.code} will be removed from the job.`)
  if (!result.isConfirmed) return
  await deleteFaultCode(props.jobId, fc.id)
  faultCodes.value = faultCodes.value.filter((f) => f.id !== fc.id)
}

async function onReportPicked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const s3Key = await uploadTemporary(file)
    const attachment = await attachToEntity(s3Key, 'job', props.jobId, 'diagnostic_report')
    reports.value.unshift(attachment)
    ToastService.success('Report attached')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Upload failed')
  } finally {
    uploading.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}

async function openReport(report: Attachment) {
  try {
    window.open(await getViewUrl(report.s3Key, report.contentType), '_blank')
  } catch {
    ToastService.error('Could not open the report')
  }
}

async function downloadCertificate() {
  certBusy.value = true
  try {
    const blob = await downloadAdasCertificate(props.jobId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ADAS-Certificate-${props.jobNumber ?? props.jobId}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    ToastService.error('Could not generate the certificate')
  } finally {
    certBusy.value = false
  }
}

async function attachCertificate() {
  certBusy.value = true
  try {
    await attachAdasCertificate(props.jobId)
    ToastService.success('Certificate saved to the job records — it will be included with the invoice email')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not save the certificate')
  } finally {
    certBusy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
        <Activity class="w-5 h-5 text-brand-500" /> Diagnostics
      </h3>
    </div>

    <div v-if="loading" class="h-20 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <template v-else>
      <!-- Fault codes -->
      <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Fault codes</h4>
      <ul v-if="faultCodes.length" class="space-y-1.5 mb-3">
        <li v-for="fc in faultCodes" :key="fc.id" class="group flex items-center gap-3 text-sm">
          <span class="font-mono font-semibold text-slate-700 dark:text-slate-200 w-16">{{ fc.code }}</span>
          <span class="flex-1 text-slate-500 truncate">{{ fc.description ?? '—' }}</span>
          <UiBadge :variant="fc.source === 'report' ? 'info' : 'pending'">{{ fc.source === 'report' ? 'Report' : 'Manual' }}</UiBadge>
          <button
            @click="canUpdate && toggleAuthorised(fc)"
            :disabled="!canUpdate"
            :class="[
              'text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
              fc.authorised
                ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400',
              canUpdate ? 'hover:opacity-80' : 'cursor-default',
            ]"
          >
            {{ fc.authorised ? 'Authorised' : 'Not authorised' }}
          </button>
          <button
            v-if="canUpdate"
            @click="remove(fc)"
            class="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </li>
      </ul>
      <p v-else class="text-sm text-slate-400 mb-3">No fault codes recorded.</p>

      <div v-if="canUpdate" class="flex gap-2 mb-5">
        <input
          v-model="newCode"
          type="text"
          maxlength="20"
          placeholder="Code (e.g. C1095)"
          class="w-36 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
          @keyup.enter="add"
        />
        <input
          v-model="newDescription"
          type="text"
          maxlength="500"
          placeholder="Description (optional)"
          class="flex-1 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          @keyup.enter="add"
        />
        <UiButton size="sm" @click="add"><Plus class="w-4 h-4" /></UiButton>
      </div>

      <!-- Diagnostic reports -->
      <div class="flex items-center justify-between mb-2 pt-3 border-t border-slate-100 dark:border-dark-border">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Diagnostic reports</h4>
        <label
          v-if="canUpdate"
          :class="['inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 cursor-pointer hover:underline', uploading ? 'opacity-60 pointer-events-none' : '']"
        >
          <Loader2 v-if="uploading" class="w-3.5 h-3.5 animate-spin" />
          <Upload v-else class="w-3.5 h-3.5" />
          {{ uploading ? 'Uploading…' : 'Upload report' }}
          <input type="file" accept="application/pdf" class="hidden" @change="onReportPicked" />
        </label>
      </div>
      <ul v-if="reports.length" class="space-y-1">
        <li v-for="r in reports" :key="r.id">
          <button @click="openReport(r)" class="flex items-center gap-2 text-sm text-brand-600 hover:underline">
            <FileText class="w-4 h-4 flex-shrink-0" /> {{ r.fileName }}
          </button>
        </li>
      </ul>
      <p v-else class="text-sm text-slate-400">No reports attached — upload here or use the Diagnostic Inbox on the jobs list.</p>

      <!-- ADAS compliance certificate -->
      <div v-if="showCertificate" class="mt-5 pt-4 border-t border-slate-100 dark:border-dark-border">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5 mb-1">
              <Award class="w-3.5 h-3.5 text-brand-500" /> ADAS Compliance Certificate
            </h4>
            <p class="text-xs text-slate-400">
              Generated from this job's details. Saving files it on the job and includes it with the invoice email.
            </p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <UiButton variant="secondary" size="sm" :disabled="certBusy" @click="downloadCertificate">
              <Download class="w-3.5 h-3.5" /> Download
            </UiButton>
            <UiButton v-if="canUpdate" size="sm" :disabled="certBusy" @click="attachCertificate">
              <Award class="w-3.5 h-3.5" /> Save to job records
            </UiButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
