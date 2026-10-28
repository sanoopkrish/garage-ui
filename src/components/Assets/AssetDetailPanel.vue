<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import GeneralSliderPanel from '@/components/Ui/GeneralSliderPanel.vue'
import AssetLocateMap from '@/components/Assets/AssetLocateMap.vue'
import { MapPin, Pencil, Wrench, Check, AlertTriangle, Search, Trash2, Tag, Upload, FileText, Camera, ArrowRightLeft } from 'lucide-vue-next'
import {
  assetAction, attachAssetDocument, deleteAsset, disposeAsset, downloadAssetLabel, getAsset, getAssetHistory, locateAsset, markAssetCalibrated,
  moveAsset, setAssetCondition, setAssetStatus, type Asset, type AssetArea, type AssetHistoryRow, type LocateResult,
} from '@/api/assets.api'
import { getViewUrl, uploadTemporary } from '@/api/files.api'
import { AssetCondition, AssetLocationType, AssetStatus } from '@/types/generated/enums/asset'
import {
  apiMessage, assetCategoryLabels, assetConditionLabels, assetConditionVariant, assetStatusLabels, assetStatusVariant, formatDate, gbp, todayIso,
} from '@/utils/assets'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/** One item: photos / documents, dates and value, location with Locate, status actions, history from the audit log */
const props = defineProps<{ modelValue: boolean; assetId: string | null; staff: { id: string; name: string }[]; areas: AssetArea[] }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean]; changed: []; edit: [asset: Asset] }>()

const { hasPermission: canUpdate } = usePermissions('menus.assets.register.update')
const { hasPermission: canDelete } = usePermissions('menus.assets.register.delete')
const open = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })
const asset = ref<Asset | null>(null)
const history = ref<AssetHistoryRow[]>([])
const located = ref<LocateResult | null>(null)
const loading = ref(false)
const busy = ref('')
const S = AssetStatus
const live = computed(() => !!asset.value && asset.value.status !== S.DISPOSED)
const photos = computed(() => asset.value?.documents.filter((d) => d.category === 'asset_photo') ?? [])
const documents = computed(() => asset.value?.documents.filter((d) => d.category !== 'asset_photo') ?? [])

async function load() {
  if (!props.assetId) return
  loading.value = true
  try {
    asset.value = await getAsset(props.assetId)
    history.value = await getAssetHistory(props.assetId).catch(() => [])
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to load the item'))
    open.value = false
  } finally {
    loading.value = false
  }
}
watch(() => [props.modelValue, props.assetId], ([isOpen]) => {
  if (!isOpen) return
  asset.value = null
  located.value = null
  history.value = []
  load()
}, { immediate: true })

function apply(updated: Asset) {
  asset.value = updated
  located.value = null
  emit('changed')
  // the audit row behind the history is written just after the response — give it a moment
  setTimeout(() => getAssetHistory(updated.id).then((h) => { history.value = h }).catch(() => {}), 800)
}

async function handleLocate() {
  if (!asset.value) return
  busy.value = 'locate'
  try { located.value = await locateAsset(asset.value.id) } catch (err) { ToastService.error(apiMessage(err, 'Could not work out where it is')) } finally { busy.value = '' }
}

// Move
const showMove = ref(false)
const moveTo = ref('')
const locationGroups = computed(() => [
  { label: 'Staff', options: props.staff.map((s) => ({ value: `staff:${s.id}`, label: s.name })) },
  { label: 'Workshop', options: props.areas.filter((a) => a.isActive).map((a) => ({ value: `area:${a.id}`, label: a.name })) },
])
function openMove() {
  if (!asset.value) return
  moveTo.value = asset.value.locationType === AssetLocationType.STAFF ? `staff:${asset.value.locationUserId}` : `area:${asset.value.locationId}`
  showMove.value = true
}
async function submitMove() {
  if (!asset.value || !moveTo.value) return
  const [kind, id] = moveTo.value.split(':')
  busy.value = 'move'
  try {
    apply(await moveAsset(asset.value.id, kind === 'staff' ? { locationType: AssetLocationType.STAFF, locationUserId: id } : { locationType: AssetLocationType.WORKSHOP_LOCATION, locationId: id }))
    ToastService.success('Location updated')
    showMove.value = false
  } catch (err) { ToastService.error(apiMessage(err, 'Failed to move the item')) } finally { busy.value = '' }
}

// Calibrated
const showCalibrate = ref(false)
const calibrate = reactive({ date: todayIso(), file: null as File | null })
const certInput = ref<HTMLInputElement | null>(null)
async function submitCalibrate() {
  if (!asset.value) return
  busy.value = 'calibrate'
  try {
    const s3Key = calibrate.file ? await uploadTemporary(calibrate.file) : undefined
    apply(await markAssetCalibrated(asset.value.id, { date: calibrate.date || undefined, s3Key }))
    ToastService.success('Marked as calibrated')
    showCalibrate.value = false
  } catch (err) { ToastService.error(apiMessage(err, 'Failed to record the calibration')) } finally { busy.value = '' }
}

// Uploads
const fileInput = ref<HTMLInputElement | null>(null)
const uploadCategory = ref<'asset_photo' | 'asset_document'>('asset_photo')
function pickUpload(category: 'asset_photo' | 'asset_document') { uploadCategory.value = category; fileInput.value?.click() }
async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !asset.value) return
  if (file.size > 10 * 1024 * 1024) { ToastService.error('The file is larger than 10 MB'); return }
  busy.value = 'upload'
  try {
    apply(await attachAssetDocument(asset.value.id, { s3Key: await uploadTemporary(file), category: uploadCategory.value }))
    ToastService.success(uploadCategory.value === 'asset_photo' ? 'Photo added' : 'Document added')
  } catch (err) { ToastService.error(apiMessage(err, 'Failed to upload')) } finally { busy.value = '' }
}
async function openDocument(s3Key: string, fileType: string) {
  try { window.open(await getViewUrl(s3Key, fileType), '_blank', 'noopener') } catch { ToastService.error('Failed to open the file') }
}

// Status
async function run(label: string, confirmText: string | null, fn: () => Promise<Asset>, done: string) {
  if (confirmText) {
    const result = await showConfirmDialog(confirmText, label === 'lost', 'Yes')
    if (!result.isConfirmed) return
  }
  busy.value = label
  try { apply(await fn()); ToastService.success(done) } catch (err) { ToastService.error(apiMessage(err, 'That did not work')) } finally { busy.value = '' }
}
const showDispose = ref(false)
const dispose = reactive({ note: '', date: todayIso() })
async function submitDispose() {
  if (!asset.value || dispose.note.trim().length < 3) return
  await run('dispose', null, () => disposeAsset(asset.value!.id, dispose.note.trim(), dispose.date || undefined), 'Marked as disposed')
  showDispose.value = false
}
const conditionOptions = Object.values(AssetCondition).map((c) => ({ value: c, label: assetConditionLabels[c] }))
async function onCondition(value: string) {
  if (!asset.value || value === asset.value.condition) return
  await run('condition', null, () => setAssetCondition(asset.value!.id, value as AssetCondition), 'Condition updated')
}
async function handleDelete() {
  if (!asset.value) return
  const result = await showConfirmDialog(`Remove ${asset.value.assetTag} ${asset.value.name} from the register? Only for items added by mistake — dispose of kit you no longer have instead.`, true, 'Remove')
  if (!result.isConfirmed) return
  try {
    await deleteAsset(asset.value.id)
    ToastService.success('Removed from the register')
    open.value = false
    emit('changed')
  } catch (err) { ToastService.error(apiMessage(err, 'Failed to remove')) }
}
async function handleLabel() {
  if (!asset.value) return
  try { await downloadAssetLabel(asset.value) } catch { ToastService.error('Failed to download the label') }
}
const selectClass = 'w-full rounded-lg border border-slate-200 dark:border-dark-border px-3 py-2 text-sm bg-white dark:bg-dark-surface text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-400'
</script>

<template>
  <GeneralSliderPanel v-model="open" :title="asset ? `${asset.assetTag} — ${asset.name}` : 'Asset'" :subtitle="asset ? [assetCategoryLabels[asset.category], asset.make, asset.model].filter(Boolean).join(' · ') : ''" size="lg">
    <div v-if="loading && !asset" class="h-40 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />
    <div v-else-if="asset" class="space-y-5">
      <div class="flex flex-wrap items-center gap-2">
        <UiBadge :variant="(assetStatusVariant[asset.status] as any)" dot>{{ assetStatusLabels[asset.status] }}</UiBadge>
        <UiBadge :variant="(assetConditionVariant[asset.condition] as any)">{{ assetConditionLabels[asset.condition] }}</UiBadge>
        <UiBadge v-if="asset.calibrationOverdue" variant="cancelled">Calibration overdue</UiBadge>
        <span class="ml-auto text-xs text-slate-400">Added {{ formatDate(asset.createdAt) }}</span>
      </div>
      <p v-if="asset.status === S.DISPOSED" class="rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">Disposed {{ formatDate(asset.disposedAt) }}: {{ asset.disposalNote }}</p>

      <!-- Location -->
      <div class="rounded-lg border border-slate-200 dark:border-dark-border p-3">
        <div class="flex items-center gap-2">
          <MapPin class="w-4 h-4 text-brand-500" />
          <span class="font-semibold text-slate-800 dark:text-slate-100">{{ asset.locationLabel }}</span>
          <span v-if="asset.locationChangedAt" class="text-xs text-slate-400">since {{ formatDate(asset.locationChangedAt) }}</span>
          <div class="ml-auto flex gap-1.5">
            <UiButton v-if="canUpdate && live" variant="secondary" size="sm" @click="openMove"><ArrowRightLeft class="w-3.5 h-3.5" /> Move</UiButton>
            <UiButton v-if="live" size="sm" :loading="busy === 'locate'" @click="handleLocate"><Search class="w-3.5 h-3.5" /> Locate</UiButton>
          </div>
        </div>
        <div v-if="located" class="mt-3">
          <p class="text-sm text-slate-600 dark:text-slate-300">{{ located.detail || located.label }}<span v-if="located.at" class="text-xs text-slate-400"> · {{ new Date(located.at).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) }}</span></p>
          <AssetLocateMap v-if="located.lat !== null && located.lng !== null" class="mt-2" :lat="located.lat" :lng="located.lng" :label="asset.assetTag" />
        </div>
      </div>

      <!-- Actions -->
      <div v-if="canUpdate || canDelete" class="flex flex-wrap gap-2">
        <template v-if="canUpdate && live">
          <UiButton variant="secondary" size="sm" @click="emit('edit', asset)"><Pencil class="w-3.5 h-3.5" /> Edit</UiButton>
          <UiButton v-if="asset.calibrationIntervalMonths" variant="secondary" size="sm" @click="calibrate.date = todayIso(); calibrate.file = null; showCalibrate = true"><Check class="w-3.5 h-3.5" /> Mark calibrated</UiButton>
          <UiButton v-if="asset.status === S.ACTIVE" variant="secondary" size="sm" :loading="busy === 'repair'" @click="run('repair', null, () => setAssetStatus(asset!.id, S.IN_REPAIR), 'Marked as in repair')"><Wrench class="w-3.5 h-3.5" /> In repair</UiButton>
          <UiButton v-if="asset.status === S.IN_REPAIR" size="sm" :loading="busy === 'back'" @click="run('back', null, () => setAssetStatus(asset!.id, S.ACTIVE), 'Back in service')"><Check class="w-3.5 h-3.5" /> Back in service</UiButton>
          <UiButton v-if="asset.status !== S.LOST" variant="secondary" size="sm" :loading="busy === 'lost'" @click="run('lost', `Mark ${asset.assetTag} ${asset.name} as lost? Management will be told.`, () => assetAction(asset!.id, 'lost'), 'Marked as lost')"><AlertTriangle class="w-3.5 h-3.5" /> Lost</UiButton>
          <UiButton v-else size="sm" :loading="busy === 'found'" @click="run('found', null, () => assetAction(asset!.id, 'found'), 'Welcome back')"><Check class="w-3.5 h-3.5" /> Found</UiButton>
          <UiButton variant="secondary" size="sm" @click="dispose.note = ''; dispose.date = todayIso(); showDispose = true"><Trash2 class="w-3.5 h-3.5" /> Dispose</UiButton>
        </template>
        <UiButton variant="secondary" size="sm" @click="handleLabel"><Tag class="w-3.5 h-3.5" /> Label</UiButton>
        <UiButton v-if="canDelete && live && !asset.documents.length" variant="danger" size="sm" @click="handleDelete"><Trash2 class="w-3.5 h-3.5" /> Remove</UiButton>
      </div>
      <div v-if="canUpdate && live" class="w-56"><UiSelect :modelValue="asset.condition" label="Condition" :options="conditionOptions" @update:modelValue="onCondition" /></div>

      <div class="grid grid-cols-2 gap-3 text-sm">
        <div><p class="text-xs text-slate-400">Serial number</p><p class="text-slate-700 dark:text-slate-200">{{ asset.serialNumber || '—' }}</p></div>
        <div><p class="text-xs text-slate-400">Bought</p><p class="text-slate-700 dark:text-slate-200">{{ formatDate(asset.purchaseDate) }}{{ asset.supplierName ? ` · ${asset.supplierName}` : '' }}</p></div>
        <div><p class="text-xs text-slate-400">Cost</p><p class="text-slate-700 dark:text-slate-200">{{ gbp(asset.purchaseCost) }}</p></div>
        <div><p class="text-xs text-slate-400">Book value{{ asset.usefulLifeYears ? ` (${asset.usefulLifeYears} yr straight line)` : '' }}</p><p class="text-slate-700 dark:text-slate-200">{{ gbp(asset.bookValue) }}</p></div>
        <div><p class="text-xs text-slate-400">Warranty ends</p><p class="text-slate-700 dark:text-slate-200">{{ formatDate(asset.warrantyExpiresAt) }}</p></div>
        <div><p class="text-xs text-slate-400">Calibration</p>
          <p :class="asset.calibrationOverdue ? 'text-red-600 font-medium' : 'text-slate-700 dark:text-slate-200'">
            {{ asset.calibrationIntervalMonths ? `Every ${asset.calibrationIntervalMonths} months · next ${formatDate(asset.nextCalibrationDue)}` : 'Not required' }}
          </p></div>
      </div>
      <p v-if="asset.notes" class="text-sm text-slate-500 whitespace-pre-line">{{ asset.notes }}</p>

      <!-- Photos + documents -->
      <div>
        <div class="flex items-center mb-2">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Photos & documents</p>
          <div v-if="canUpdate && live" class="ml-auto flex gap-1.5">
            <UiButton variant="secondary" size="sm" :loading="busy === 'upload'" @click="pickUpload('asset_photo')"><Camera class="w-3.5 h-3.5" /> Photo</UiButton>
            <UiButton variant="secondary" size="sm" :loading="busy === 'upload'" @click="pickUpload('asset_document')"><Upload class="w-3.5 h-3.5" /> Document</UiButton>
          </div>
          <input ref="fileInput" type="file" class="hidden" :accept="uploadCategory === 'asset_photo' ? 'image/*' : 'application/pdf,image/*'" @change="onFile" />
        </div>
        <div v-if="photos.length" class="flex flex-wrap gap-2 mb-2">
          <button v-for="p in photos" :key="p.id" class="w-20 h-20 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs text-slate-500 hover:ring-2 hover:ring-brand-400" :title="p.fileName" @click="openDocument(p.s3Key, p.fileType)">
            <Camera class="w-5 h-5" />
          </button>
        </div>
        <ul v-if="documents.length" class="space-y-1.5">
          <li v-for="d in documents" :key="d.id">
            <button class="flex items-center gap-2 w-full rounded-lg border border-slate-100 dark:border-dark-border px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-white/5" @click="openDocument(d.s3Key, d.fileType)">
              <FileText class="w-4 h-4 text-brand-500" /><span class="text-slate-700 dark:text-slate-200 truncate">{{ d.fileName }}</span><span class="ml-auto text-xs text-slate-400">{{ formatDate(d.uploadedAt) }}</span>
            </button>
          </li>
        </ul>
        <p v-if="!asset.documents.length" class="text-sm text-slate-400">Nothing uploaded yet.</p>
      </div>

      <!-- History -->
      <div v-if="history.length">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Where it has been</p>
        <ul class="divide-y divide-slate-50 dark:divide-dark-border text-sm">
          <li v-for="(h, i) in history" :key="i" class="flex items-center gap-3 py-2">
            <span class="text-slate-700 dark:text-slate-200">{{ h.to }}</span>
            <span class="ml-auto text-xs text-slate-400">{{ h.by }} · {{ new Date(h.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <UiModal :open="showMove" title="Move this item" @close="showMove = false">
      <select v-model="moveTo" :class="selectClass">
        <optgroup v-for="group in locationGroups" :key="group.label" :label="group.label">
          <option v-for="opt in group.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </optgroup>
      </select>
      <template #footer>
        <UiButton variant="ghost" @click="showMove = false">Cancel</UiButton>
        <UiButton :loading="busy === 'move'" :disabled="!moveTo" @click="submitMove">Move</UiButton>
      </template>
    </UiModal>

    <UiModal :open="showCalibrate" title="Mark as calibrated" @close="showCalibrate = false">
      <div class="space-y-4">
        <UiInput v-model="calibrate.date" label="Calibrated on" type="date" />
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Certificate (optional)</label>
          <button type="button" class="w-full rounded-lg border border-dashed border-slate-300 dark:border-dark-border px-3 py-3 text-sm text-slate-500 hover:border-brand-300" @click="certInput?.click()">{{ calibrate.file ? calibrate.file.name : 'Choose a PDF or photo' }}</button>
          <input ref="certInput" type="file" class="hidden" accept="application/pdf,image/*" @change="calibrate.file = ($event.target as HTMLInputElement).files?.[0] ?? null" />
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showCalibrate = false">Cancel</UiButton>
        <UiButton :loading="busy === 'calibrate'" @click="submitCalibrate">Save</UiButton>
      </template>
    </UiModal>

    <UiModal :open="showDispose" title="Dispose of this item" @close="showDispose = false">
      <div class="space-y-4">
        <p class="text-sm text-slate-500">It stays on the register under "Disposed" with a book value of zero.</p>
        <UiInput v-model="dispose.date" label="Date" type="date" />
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Why? (required)</label>
          <textarea v-model="dispose.note" rows="3" placeholder="e.g. Sold, scrapped, traded in…" class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showDispose = false">Cancel</UiButton>
        <UiButton variant="danger" :loading="busy === 'dispose'" :disabled="dispose.note.trim().length < 3" @click="submitDispose">Dispose</UiButton>
      </template>
    </UiModal>
  </GeneralSliderPanel>
</template>
