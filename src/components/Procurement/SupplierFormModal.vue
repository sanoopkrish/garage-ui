<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import { createSupplier, getSupplier, updateSupplier, type Supplier } from '@/api/procurement/suppliers.api'
import { SupplierCategory, SupplierStatus } from '@/types/generated/enums/procurement'
import { apiMessage, supplierCategoryLabels, supplierStatusLabels } from '@/utils/procurement'
import { ToastService } from '@/services/toast.service'

/** Supplier create / edit — fields follow psa-ui SupplierFormModal, plus address, terms and categories */
const props = defineProps<{ open: boolean; supplier?: Supplier | null }>()
const emit = defineEmits<{ close: []; saved: [supplier: Supplier] }>()

const isEdit = computed(() => !!props.supplier)
const saving = ref(false)
const errors = reactive({ name: '', email: '' })
const blank = () => ({
  name: '', contactPerson: '', email: '', phone: '', street: '', city: '', postcode: '', accountRef: '',
  paymentTermsDays: '' as string | number, taxId: '', bankDetails: '', categories: [] as SupplierCategory[],
  preferred: false, status: SupplierStatus.ACTIVE as SupplierStatus, notes: '',
})
const form = reactive(blank())
const statusOptions = Object.values(SupplierStatus).map((s) => ({ value: s, label: supplierStatusLabels[s] }))

watch(() => props.open, async (open) => {
  if (!open) return
  Object.assign(form, blank())
  errors.name = ''; errors.email = ''
  if (!props.supplier) return
  // the list rows never carry bank details — fetch the full record for editing
  let s = props.supplier
  try { s = await getSupplier(props.supplier.id) } catch { /* fall back to the row */ }
  Object.assign(form, {
    name: s.name, contactPerson: s.contactPerson ?? '', email: s.email ?? '', phone: s.phone ?? '',
    street: s.address?.street ?? '', city: s.address?.city ?? '', postcode: s.address?.postcode ?? '',
    accountRef: s.accountRef ?? '', paymentTermsDays: s.paymentTermsDays ?? '', taxId: s.taxId ?? '',
    bankDetails: s.bankDetails ?? '', categories: [...(s.categories ?? [])], preferred: s.preferred, status: s.status, notes: s.notes ?? '',
  })
})

function toggleCategory(category: SupplierCategory) {
  form.categories = form.categories.includes(category) ? form.categories.filter((c) => c !== category) : [...form.categories, category]
}

async function save() {
  errors.name = form.name.trim() ? '' : 'Enter the supplier name'
  errors.email = !form.email || /^\S+@\S+\.\S+$/.test(form.email) ? '' : 'Enter a valid email address'
  if (errors.name || errors.email) return
  const address = { street: form.street.trim(), city: form.city.trim(), postcode: form.postcode.trim() }
  const payload = {
    name: form.name.trim(),
    contactPerson: form.contactPerson.trim(),
    email: form.email.trim() || undefined,
    phone: form.phone.trim(),
    address: Object.values(address).some(Boolean) ? address : undefined,
    accountRef: form.accountRef.trim(),
    paymentTermsDays: form.paymentTermsDays === '' ? undefined : Number(form.paymentTermsDays),
    taxId: form.taxId.trim(),
    bankDetails: form.bankDetails.trim(),
    categories: form.categories,
    preferred: form.preferred,
    status: form.status,
    notes: form.notes.trim(),
  }
  saving.value = true
  try {
    const saved = props.supplier ? await updateSupplier(props.supplier.id, payload) : await createSupplier(payload)
    ToastService.success(props.supplier ? 'Supplier updated' : 'Supplier added')
    emit('saved', saved)
    emit('close')
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to save the supplier'))
  } finally {
    saving.value = false
  }
}

const textareaClass = 'w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
const labelClass = 'block text-xs font-medium text-slate-500 mb-1'
</script>

<template>
  <UiModal :open="open" :title="isEdit ? `Edit ${supplier?.name}` : 'New supplier'" size="lg" @close="emit('close')">
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiInput v-model="form.name" label="Supplier name" required :error="errors.name" />
        <UiInput v-model="form.contactPerson" label="Contact name" />
        <UiInput v-model="form.email" label="Email (purchase orders are sent here)" type="email" :error="errors.email" />
        <UiInput v-model="form.phone" label="Phone" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UiInput v-model="form.street" label="Street" />
        <UiInput v-model="form.city" label="Town / city" />
        <UiInput v-model="form.postcode" label="Postcode" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UiInput v-model="form.accountRef" label="Our account number" />
        <UiInput v-model="form.paymentTermsDays" label="Payment terms (days)" type="number" placeholder="e.g. 30" />
        <UiInput v-model="form.taxId" label="VAT number" />
      </div>

      <div>
        <label :class="labelClass">What they supply</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="category in Object.values(SupplierCategory)" :key="category" type="button"
            :class="['px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              form.categories.includes(category) ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-200 dark:border-dark-border text-slate-500']"
            @click="toggleCategory(category)"
          >{{ supplierCategoryLabels[category] }}</button>
        </div>
      </div>

      <div>
        <label :class="labelClass">Bank details (stored encrypted; only shown to people who can edit suppliers)</label>
        <textarea v-model="form.bankDetails" rows="2" placeholder="Account name, sort code, account number" :class="textareaClass" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <UiSelect v-model="form.status" label="Status" :options="statusOptions" />
        <UiToggle v-model="form.preferred" label="Preferred supplier" description="Shown with a star in pickers" />
      </div>

      <div>
        <label :class="labelClass">Notes</label>
        <textarea v-model="form.notes" rows="2" :class="textareaClass" />
      </div>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Cancel</UiButton>
      <UiButton :loading="saving" @click="save">{{ isEdit ? 'Save changes' : 'Add supplier' }}</UiButton>
    </template>
  </UiModal>
</template>
