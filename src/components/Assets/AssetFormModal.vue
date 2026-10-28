<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import { createAsset, updateAsset, type Asset, type AssetArea } from '@/api/assets.api'
import { AssetCategory, AssetCondition, AssetLocationType } from '@/types/generated/enums/asset'
import { apiMessage, assetCategoryLabels, assetConditionLabels } from '@/utils/assets'
import { ToastService } from '@/services/toast.service'

/** Add / edit an item on the register. The location is one select grouped "Staff" / "Workshop". */
const props = defineProps<{ open: boolean; asset?: Asset | null; staff: { id: string; name: string }[]; areas: AssetArea[]; supplierOptions: { value: string; label: string }[] }>()
const emit = defineEmits<{ close: []; saved: [asset: Asset] }>()

const isEdit = computed(() => !!props.asset)
const saving = ref(false)
const errors = reactive({ name: '', location: '' })
const blank = () => ({
  name: '', category: AssetCategory.DIAGNOSTIC_TOOL as AssetCategory, make: '', model: '', serialNumber: '',
  purchaseDate: '', purchaseCost: '' as string | number, supplierId: '', warrantyExpiresAt: '', usefulLifeYears: '' as string | number,
  calibrationIntervalMonths: '' as string | number, lastCalibratedAt: '', condition: AssetCondition.GOOD as AssetCondition,
  location: '', notes: '',
})
const form = reactive(blank())

const categoryOptions = Object.values(AssetCategory).map((c) => ({ value: c, label: assetCategoryLabels[c] }))
const conditionOptions = Object.values(AssetCondition).map((c) => ({ value: c, label: assetConditionLabels[c] }))
/** one value per choice: "staff:<userId>" or "area:<id>" */
const locationGroups = computed(() => [
  { label: 'Staff', options: props.staff.map((s) => ({ value: `staff:${s.id}`, label: s.name })) },
  { label: 'Workshop', options: props.areas.filter((a) => a.isActive).map((a) => ({ value: `area:${a.id}`, label: a.name })) },
])

watch(() => props.open, (open) => {
  if (!open) return
  errors.name = ''; errors.location = ''
  const a = props.asset
  Object.assign(form, a ? {
    name: a.name, category: a.category, make: a.make ?? '', model: a.model ?? '', serialNumber: a.serialNumber ?? '',
    purchaseDate: a.purchaseDate ?? '', purchaseCost: a.purchaseCost ?? '', supplierId: a.supplierId ?? '', warrantyExpiresAt: a.warrantyExpiresAt ?? '',
    usefulLifeYears: a.usefulLifeYears ?? '', calibrationIntervalMonths: a.calibrationIntervalMonths ?? '', lastCalibratedAt: a.lastCalibratedAt ?? '',
    condition: a.condition, location: a.locationType === AssetLocationType.STAFF ? `staff:${a.locationUserId}` : `area:${a.locationId}`, notes: a.notes ?? '',
  } : blank())
})

async function save() {
  errors.name = form.name.trim() ? '' : 'Enter a name'
  errors.location = form.location ? '' : 'Choose where it is'
  if (errors.name || errors.location) return
  const [kind, id] = form.location.split(':')
  const num = (v: string | number) => (v === '' || v === null ? null : Number(v))
  const payload = {
    name: form.name.trim(), category: form.category, make: form.make.trim() || null, model: form.model.trim() || null, serialNumber: form.serialNumber.trim() || null,
    purchaseDate: form.purchaseDate || null, purchaseCost: num(form.purchaseCost), supplierId: form.supplierId || null, warrantyExpiresAt: form.warrantyExpiresAt || null,
    usefulLifeYears: num(form.usefulLifeYears), calibrationIntervalMonths: num(form.calibrationIntervalMonths), lastCalibratedAt: form.lastCalibratedAt || null,
    condition: form.condition, notes: form.notes.trim() || null,
    locationType: kind === 'staff' ? AssetLocationType.STAFF : AssetLocationType.WORKSHOP_LOCATION,
    ...(kind === 'staff' ? { locationUserId: id } : { locationId: id }),
  }
  saving.value = true
  try {
    const saved = props.asset ? await updateAsset(props.asset.id, payload) : await createAsset(payload)
    ToastService.success(props.asset ? 'Item updated' : `${saved.assetTag} added to the register`)
    emit('saved', saved)
    emit('close')
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to save the item'))
  } finally {
    saving.value = false
  }
}

const selectClass = 'w-full rounded-lg border border-slate-200 dark:border-dark-border px-3 py-2 text-sm bg-white dark:bg-dark-surface text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-400'
const labelClass = 'text-sm font-medium text-slate-700 dark:text-slate-300'
</script>

<template>
  <UiModal :open="open" :title="isEdit ? `Edit ${asset?.assetTag} — ${asset?.name}` : 'Add to the register'" size="lg" @close="emit('close')">
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiInput v-model="form.name" label="Name" required :error="errors.name" placeholder="e.g. Autel MaxiSys Ultra" />
        <UiSelect v-model="form.category" label="Category" :options="categoryOptions" required />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UiInput v-model="form.make" label="Make" />
        <UiInput v-model="form.model" label="Model" />
        <UiInput v-model="form.serialNumber" label="Serial number" />
      </div>

      <div class="flex flex-col gap-1">
        <label :class="labelClass">Where is it? <span class="text-red-500">*</span></label>
        <select v-model="form.location" :class="[selectClass, errors.location ? 'border-red-400' : '']">
          <option value="" disabled>Choose a member of staff or a workshop area</option>
          <optgroup v-for="group in locationGroups" :key="group.label" :label="group.label">
            <option v-for="opt in group.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </optgroup>
        </select>
        <p v-if="errors.location" class="text-xs text-red-500">{{ errors.location }}</p>
      </div>

      <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-1">Purchase</p>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UiInput v-model="form.purchaseDate" label="Bought on" type="date" />
        <UiInput v-model="form.purchaseCost" label="Cost £ (net)" type="number" />
        <UiSelect v-model="form.supplierId" label="Bought from" :options="[{ value: '', label: '—' }, ...supplierOptions]" />
        <UiInput v-model="form.usefulLifeYears" label="Useful life (years)" type="number" placeholder="3" />
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UiInput v-model="form.warrantyExpiresAt" label="Warranty ends" type="date" />
        <UiInput v-model="form.calibrationIntervalMonths" label="Calibrate every (months)" type="number" />
        <UiInput v-model="form.lastCalibratedAt" label="Last calibrated" type="date" />
        <UiSelect v-model="form.condition" label="Condition" :options="conditionOptions" />
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-500 mb-1">Notes</label>
        <textarea v-model="form.notes" rows="2" class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
      </div>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Cancel</UiButton>
      <UiButton :loading="saving" @click="save">{{ isEdit ? 'Save changes' : 'Add item' }}</UiButton>
    </template>
  </UiModal>
</template>
