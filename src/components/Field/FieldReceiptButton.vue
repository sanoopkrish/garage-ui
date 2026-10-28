<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import { Camera, Receipt } from 'lucide-vue-next'
import { isFieldReceiptEnabled, sendFieldReceipt } from '@/api/procurement/reports.api'
import { uploadTemporary } from '@/api/files.api'
import { ToastService } from '@/services/toast.service'

/**
 * Field app — "Bought something?" (Sprint 23, the field receipts switch). The engineer photographs
 * the receipt; it lands in Supplier invoices for Accounts to complete. Hidden when switched off.
 */
const enabled = ref(false)
const open = ref(false)
const sending = ref(false)
const photo = ref<File | null>(null)
const preview = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const form = reactive({ supplierName: '', amount: '' as string | number, note: '' })

function start() {
  Object.assign(form, { supplierName: '', amount: '', note: '' })
  photo.value = null
  preview.value = ''
  open.value = true
}
function onPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 10 * 1024 * 1024) { ToastService.error('The photo is larger than 10 MB'); return }
  photo.value = file
  preview.value = URL.createObjectURL(file)
}
async function send() {
  if (!photo.value) { ToastService.error('Take a photo of the receipt first'); return }
  sending.value = true
  try {
    const s3Key = await uploadTemporary(photo.value)
    await sendFieldReceipt({
      s3Key, supplierName: form.supplierName.trim() || undefined,
      amount: Number(form.amount) > 0 ? Number(form.amount) : undefined, note: form.note.trim() || undefined,
    })
    ToastService.success('Receipt sent to the office')
    open.value = false
  } catch (e: any) {
    const message = e.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'The receipt could not be sent — try again'))
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  try { enabled.value = await isFieldReceiptEnabled() } catch { enabled.value = false }
})
</script>

<template>
  <button
    v-if="enabled"
    class="w-full flex items-center justify-center gap-2 mb-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-sm font-semibold text-slate-700 dark:text-slate-200"
    @click="start"
  >
    <Receipt class="w-4 h-4 text-brand-500" /> Bought something? Send the receipt
  </button>

  <UiModal :open="open" title="Send a receipt" @close="open = false">
    <div class="space-y-4">
      <button
        type="button"
        class="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-dark-border py-6 text-sm text-slate-500"
        @click="fileInput?.click()"
      >
        <img v-if="preview" :src="preview" alt="Receipt" class="max-h-48 rounded-lg" />
        <template v-else><Camera class="w-6 h-6 text-slate-400" /> Take a photo of the receipt</template>
        <span v-if="preview" class="text-xs text-brand-600">Tap to retake</span>
      </button>
      <input ref="fileInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onPhoto" />
      <UiInput v-model="form.supplierName" label="Where did you buy it?" placeholder="e.g. Screwfix" />
      <UiInput v-model="form.amount" label="Total paid £" type="number" />
      <UiInput v-model="form.note" label="What was it for?" placeholder="e.g. Fuses for JOB-00012" />
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="open = false">Cancel</UiButton>
      <UiButton :loading="sending" :disabled="!photo" @click="send">Send to the office</UiButton>
    </template>
  </UiModal>
</template>
