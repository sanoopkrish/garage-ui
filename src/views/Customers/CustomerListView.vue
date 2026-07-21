<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { Plus, Eye, Pencil, Trash2, Car, Phone, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useCustomersStore } from '@/stores/customers.store'
import { useCrudPermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'
import { CustomerType } from '@/types/generated/enums/customer'
import type { Customer, CreateCustomerDto } from '@/api/customers.api'

const customersStore = useCustomersStore()
const { canCreate, canUpdate, canDelete } = useCrudPermissions('crm', 'customers')

const typeLabels: Record<CustomerType, string> = {
  [CustomerType.B2B]: 'B2B Account',
  [CustomerType.B2C]: 'Private',
}

const typeFilterOptions = [
  { value: '', label: 'All types' },
  { value: CustomerType.B2B, label: 'B2B Account' },
  { value: CustomerType.B2C, label: 'Private' },
]

// ── Search & filter ───────────────────────────────────────────────────────────
const searchQuery = ref('')
const typeFilter = ref<'' | CustomerType>('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

function currentParams() {
  return {
    search: searchQuery.value || undefined,
    type: typeFilter.value || undefined,
  }
}

function onSearch(val: string) {
  searchQuery.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    customersStore.fetchCustomers({ ...currentParams(), page: 1 })
  }, 350)
}

function onTypeFilter() {
  customersStore.fetchCustomers({ ...currentParams(), page: 1 })
}

// ── Pagination ────────────────────────────────────────────────────────────────
function goToPage(page: number) {
  if (page < 1 || page > customersStore.totalPages) return
  customersStore.fetchCustomers({ ...currentParams(), page })
}

// ── Create / edit modal ───────────────────────────────────────────────────────
const showModal = ref(false)
const submitting = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  type: CustomerType.B2C as CustomerType,
  name: '',
  email: '',
  phone: '',
  businessName: '',
  vatNumber: '',
  labourRate: '',
  paymentTermsDays: '',
  poRequired: false,
  notes: '',
})

const formErrors = reactive({ name: '' })

function resetForm() {
  form.type = CustomerType.B2C
  form.name = ''
  form.email = ''
  form.phone = ''
  form.businessName = ''
  form.vatNumber = ''
  form.labourRate = ''
  form.paymentTermsDays = ''
  form.poRequired = false
  form.notes = ''
  formErrors.name = ''
}

function openCreateModal() {
  resetForm()
  editingId.value = null
  showModal.value = true
}

function openEditModal(customer: Customer) {
  resetForm()
  editingId.value = customer.id
  form.type = customer.type
  form.name = customer.name
  form.email = customer.email ?? ''
  form.phone = customer.phone ?? ''
  form.businessName = customer.businessName ?? ''
  form.vatNumber = customer.vatNumber ?? ''
  form.labourRate = customer.labourRate != null ? String(customer.labourRate) : ''
  form.paymentTermsDays = customer.paymentTermsDays != null ? String(customer.paymentTermsDays) : ''
  form.poRequired = customer.poRequired
  form.notes = customer.notes ?? ''
  showModal.value = true
}

function buildDto(): CreateCustomerDto {
  const isB2b = form.type === CustomerType.B2B
  return {
    type: form.type,
    name: form.name.trim(),
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    businessName: isB2b ? form.businessName.trim() || undefined : undefined,
    vatNumber: isB2b ? form.vatNumber.trim() || undefined : undefined,
    labourRate: isB2b && form.labourRate !== '' ? Number(form.labourRate) : undefined,
    paymentTermsDays: isB2b && form.paymentTermsDays !== '' ? Number(form.paymentTermsDays) : undefined,
    poRequired: isB2b ? form.poRequired : undefined,
    notes: form.notes.trim() || undefined,
  }
}

async function submitForm() {
  formErrors.name = form.name.trim() ? '' : 'Name is required'
  if (formErrors.name) return

  submitting.value = true
  try {
    if (editingId.value) {
      await customersStore.updateCustomer(editingId.value, buildDto())
      ToastService.success('Customer updated')
    } else {
      await customersStore.createCustomer(buildDto())
      ToastService.success('Customer created')
    }
    showModal.value = false
  } catch {
    ToastService.error(customersStore.error ?? 'Something went wrong')
  } finally {
    submitting.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function handleDelete(customer: Customer) {
  const label = customer.businessName || customer.name
  const result = await showConfirmDialog(`Delete customer "${label}"?`, false, 'Delete')
  if (!result.isConfirmed) return
  try {
    await customersStore.deleteCustomer(customer.id)
    ToastService.success('Customer deleted')
  } catch {
    ToastService.error(customersStore.error ?? 'Failed to delete customer')
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

onMounted(() => {
  customersStore.fetchCustomers({ page: 1 })
})
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Customers" subtitle="Manage your customer database.">
      <UiButton v-if="canCreate" @click="openCreateModal"><Plus class="w-4 h-4" /> New Customer</UiButton>
    </UiPageHeader>

    <div class="flex items-center gap-3 mb-5">
      <UiSearchInput
        :modelValue="searchQuery"
        placeholder="Search name, business, email, phone..."
        @update:modelValue="onSearch"
      />
      <div class="w-40">
        <UiSelect v-model="typeFilter" :options="typeFilterOptions" @update:modelValue="onTypeFilter" />
      </div>
      <span class="text-sm text-slate-400 ml-auto">{{ customersStore.total }} customers</span>
    </div>

    <UiTable :headers="['Name', 'Type', 'Contact', 'Vehicles', 'Terms', 'Added', '']">
      <!-- Loading skeleton -->
      <template v-if="customersStore.loading && customersStore.customers.length === 0">
        <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in 7" :key="col" class="px-4 py-3.5">
            <div class="h-3.5 w-24 bg-slate-200 dark:bg-white/10 rounded" />
          </td>
        </tr>
      </template>

      <!-- Empty state -->
      <template v-else-if="!customersStore.loading && customersStore.customers.length === 0">
        <tr>
          <td colspan="7" class="px-4 py-10 text-center text-sm text-slate-400">No customers found.</td>
        </tr>
      </template>

      <tr
        v-else
        v-for="c in customersStore.customers"
        :key="c.id"
        class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
      >
        <td class="px-4 py-3.5">
          <p class="font-medium text-slate-800 dark:text-slate-100">{{ c.businessName || c.name }}</p>
          <p v-if="c.businessName" class="text-xs text-slate-400">Contact: {{ c.name }}</p>
        </td>
        <td class="px-4 py-3.5">
          <UiBadge :variant="c.type === CustomerType.B2B ? 'progress' : 'open'" dot>{{ typeLabels[c.type] }}</UiBadge>
        </td>
        <td class="px-4 py-3.5">
          <p class="text-sm text-slate-600 dark:text-slate-300">{{ c.email || '—' }}</p>
          <p v-if="c.phone" class="text-xs text-slate-400 flex items-center gap-1"><Phone class="w-3 h-3" />{{ c.phone }}</p>
        </td>
        <td class="px-4 py-3.5 text-center">
          <span class="flex items-center gap-1 text-slate-600 dark:text-slate-300 text-sm"><Car class="w-3.5 h-3.5 text-brand-500" />{{ c.vehicleCount }}</span>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-500 dark:text-slate-400">
          <template v-if="c.type === CustomerType.B2B">
            <p v-if="c.labourRate != null">£{{ c.labourRate }}/hr</p>
            <p v-if="c.paymentTermsDays != null" class="text-xs text-slate-400">{{ c.paymentTermsDays }} days</p>
            <p v-if="c.labourRate == null && c.paymentTermsDays == null">—</p>
          </template>
          <template v-else>—</template>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-400">{{ formatDate(c.createdAt) }}</td>
        <td class="px-4 py-3.5">
          <div class="flex items-center gap-1">
            <router-link :to="`/customers/${c.id}`" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors" title="View">
              <Eye class="w-4 h-4" />
            </router-link>
            <button v-if="canUpdate" @click="openEditModal(c)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors" title="Edit">
              <Pencil class="w-4 h-4" />
            </button>
            <button v-if="canDelete" @click="handleDelete(c)" class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    </UiTable>

    <!-- Pagination -->
    <div v-if="customersStore.totalPages > 1" class="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
      <span>Page {{ customersStore.currentPage }} of {{ customersStore.totalPages }}</span>
      <button
        :disabled="customersStore.currentPage <= 1"
        @click="goToPage(customersStore.currentPage - 1)"
        class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
      <button
        :disabled="customersStore.currentPage >= customersStore.totalPages"
        @click="goToPage(customersStore.currentPage + 1)"
        class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>

    <!-- Create / Edit Modal -->
    <UiModal :open="showModal" :title="editingId ? 'Edit Customer' : 'New Customer'" @close="showModal = false">
      <form @submit.prevent="submitForm" class="flex flex-col gap-4">
        <UiSelect
          v-model="form.type"
          label="Customer Type"
          :options="[
            { value: CustomerType.B2C, label: 'Private (B2C)' },
            { value: CustomerType.B2B, label: 'Business / Insurance (B2B)' },
          ]"
          required
        />
        <UiInput v-model="form.name" :label="form.type === CustomerType.B2B ? 'Contact Name' : 'Full Name'" placeholder="e.g. James Mitchell" required :error="formErrors.name" />
        <template v-if="form.type === CustomerType.B2B">
          <UiInput v-model="form.businessName" label="Business Name" placeholder="e.g. FMG Insurance" />
          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="form.vatNumber" label="VAT Number" placeholder="GB123456789" />
            <UiInput v-model="form.labourRate" label="Agreed Labour Rate (£/hr)" type="number" placeholder="140" />
          </div>
          <div class="grid grid-cols-2 gap-4 items-end">
            <UiInput v-model="form.paymentTermsDays" label="Payment Terms (days)" type="number" placeholder="30" />
            <label class="flex items-center gap-2 pb-2.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
              <input v-model="form.poRequired" type="checkbox" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              PO required
            </label>
          </div>
        </template>
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="form.email" label="Email" type="email" placeholder="customer@email.com" />
          <UiInput v-model="form.phone" label="Phone" placeholder="+44 7700 000000" />
        </div>
        <UiInput v-model="form.notes" label="Notes" placeholder="Optional notes" />
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="showModal = false">Cancel</UiButton>
        <UiButton :loading="submitting" @click="submitForm">{{ editingId ? 'Save Changes' : 'Add Customer' }}</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
