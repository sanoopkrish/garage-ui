<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import { ScanBarcode, CheckCircle2 } from 'lucide-vue-next'
import { Html5Qrcode } from 'html5-qrcode'
import { receiveScan } from '@/api/parts-orders.api'
import { ToastService } from '@/services/toast.service'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'received'): void }>()

const manualCode = ref('')
const lastResult = ref<string | null>(null)
const busy = ref(false)
const cameraError = ref(false)
let scanner: Html5Qrcode | null = null
let lastScanned = ''
let lastScanAt = 0

async function handleCode(barcode: string) {
  // debounce repeat frames of the same code
  if (busy.value || (barcode === lastScanned && Date.now() - lastScanAt < 4000)) return
  lastScanned = barcode
  lastScanAt = Date.now()
  busy.value = true
  try {
    const result = await receiveScan(barcode)
    lastResult.value = `${result.matchedLine.description} — ${result.matchedLine.receivedQuantity}/${result.matchedLine.quantity} received${result.matchedLine.shelfLocation ? ` · shelf ${result.matchedLine.shelfLocation}` : ''}${result.orderComplete ? ` · ${result.order.orderNumber} complete` : ''}`
    ToastService.success(lastResult.value)
    emit('received')
  } catch (e: any) {
    lastResult.value = null
    ToastService.error(e.response?.data?.message ?? 'Scan failed')
  } finally {
    busy.value = false
  }
}

async function startCamera() {
  cameraError.value = false
  try {
    scanner = new Html5Qrcode('parts-scanner')
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 8, qrbox: { width: 280, height: 140 } },
      (decoded) => handleCode(decoded),
      () => {},
    )
  } catch {
    cameraError.value = true
  }
}

async function stopCamera() {
  try {
    if (scanner?.isScanning) await scanner.stop()
    scanner?.clear()
  } catch { /* already stopped */ }
  scanner = null
}

function submitManual() {
  const code = manualCode.value.trim()
  if (!code) return
  handleCode(code)
  manualCode.value = ''
}

watch(() => props.open, async (open) => {
  if (open) {
    lastResult.value = null
    // wait for the modal DOM
    setTimeout(startCamera, 150)
  } else {
    await stopCamera()
  }
})

onBeforeUnmount(stopCamera)
</script>

<template>
  <UiModal :open="open" title="Receive Parts — Scan" @close="emit('close')">
    <div class="space-y-4">
      <div id="parts-scanner" class="rounded-lg overflow-hidden bg-slate-900 min-h-[180px]" />
      <p v-if="cameraError" class="text-sm text-slate-400 text-center">
        Camera unavailable — type or scan the barcode into the field below.
      </p>

      <div class="flex gap-2">
        <input
          v-model="manualCode"
          type="text"
          placeholder="Barcode (or use a USB scanner)"
          autofocus
          class="flex-1 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
          @keyup.enter="submitManual"
        />
        <UiButton :disabled="busy" @click="submitManual"><ScanBarcode class="w-4 h-4" /> Receive</UiButton>
      </div>

      <p v-if="lastResult" class="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 class="w-4 h-4 flex-shrink-0" /> {{ lastResult }}
      </p>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Done</UiButton>
    </template>
  </UiModal>
</template>
