<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiSearchSelect from '@/components/Ui/UiSearchSelect.vue'
import { Plus, Eye, Trash2, ChevronLeft, ChevronRight, RotateCcw, FileScan, MapPin } from 'lucide-vue-next'
import DiagnosticInboxPanel from '@/components/Jobs/DiagnosticInboxPanel.vue'
import { useJobsStore } from '@/stores/jobs.store'
import { useRoute } from 'vue-router'
import { getCustomers, getCustomer, type BillingAddress } from '@/api/customers.api'
import { getVehicles } from '@/api/vehicles.api'
import { useCrudPermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { JobStatus, WorkLocation } from '@/types/generated/enums/job'
import { jobStatusLabels, jobStatusBadgeVariant } from '@/utils/jobStatus'
import type { Job } from '@/api/jobs.api'
import { showConfirmDialog } from '@/utils/alert'

const jobsStore = useJobsStore()
const { canCreate, canUpdate, canDelete } = useCrudPermissions('workshop', 'jobs')
const inboxOpen = ref(false)

const statusFilterOptions = [
  { value: '', label: 'All statuses' },
  ...Object.values(JobStatus).map((s) => ({ value: s, label: jobStatusLabels[s] })),
]

// ── Search & filter ───────────────────────────────────────────────────────────
const searchQuery = ref('')
const statusFilter = ref<'' | JobStatus>('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const reworkOnly = ref(false)
/** Sprint 26 — workshop / on-site filter */
const locationFilter = ref<'' | WorkLocation>('')
const locationFilterOptions = [
  { value: '', label: 'Workshop & on-site' },
  { value: WorkLocation.WORKSHOP, label: 'Workshop only' },
  { value: WorkLocation.ON_SITE, label: 'On-site only' },
]

function currentParams() {
  return {
    search: searchQuery.value || undefined,
    status: statusFilter.value || undefined,
    isRework: reworkOnly.value || undefined,
    workLocation: locationFilter.value || undefined,
  }
}

function onLocationFilter() {
  jobsStore.fetchJobs({ ...currentParams(), page: 1 })
}

function toggleReworkFilter() {
  reworkOnly.value = !reworkOnly.value
  jobsStore.fetchJobs({ ...currentParams(), page: 1 })
}

function onSearch(val: string) {
  searchQuery.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    jobsStore.fetchJobs({ ...currentParams(), page: 1 })
  }, 350)
}

function onStatusFilter() {
  jobsStore.fetchJobs({ ...currentParams(), page: 1 })
}

function goToPage(page: number) {
  if (page < 1 || page > jobsStore.totalPages) return
  jobsStore.fetchJobs({ ...currentParams(), page })
}

// ── Create modal ──────────────────────────────────────────────────────────────
const showModal = ref(false)
const submitting = ref(false)

const customerOptions = ref<{ value: string; label: string }[]>([])
const vehicleOptions = ref<{ value: string; label: string }[]>([])
const customersLoading = ref(false)
const vehiclesLoading = ref(false)

const form = reactive({
  customerId: '',
  vehicleId: '',
  description: '',
  status: JobStatus.ENQUIRY as JobStatus,
  dueDate: '',
  // Sprint 26
  workLocation: WorkLocation.WORKSHOP as WorkLocation,
  quoteRequired: 'inherit' as 'inherit' | 'yes' | 'no',
})

const formErrors = reactive({ customerId: '', vehicleId: '', description: '' })

/** Server-side search by customer name / business name (the list can be long). */
let customerSearchSeq = 0
async function loadCustomerOptions(search = '') {
  const seq = ++customerSearchSeq
  customersLoading.value = true
  try {
    const response = await getCustomers({ search: search || undefined, pageSize: 50 })
    if (seq !== customerSearchSeq) return // a newer search has superseded this response
    customerOptions.value = response.items.map((c) => ({
      value: c.id,
      label: c.businessName ? `${c.businessName} (${c.name})` : c.name,
    }))
  } catch {
    if (seq === customerSearchSeq) ToastService.error('Failed to load customers')
  } finally {
    if (seq === customerSearchSeq) customersLoading.value = false
  }
}

/** Only the selected customer's vehicles are offered. */
async function loadVehicleOptions(customerId: string) {
  vehicleOptions.value = []
  if (!customerId) return
  vehiclesLoading.value = true
  try {
    const response = await getVehicles({ customerId, pageSize: 200 })
    vehicleOptions.value = response.items.map((v) => ({
      value: v.id,
      label: `${v.registration} — ${[v.year, v.make, v.model].filter(Boolean).join(' ') || 'Unknown'}`,
    }))
  } catch {
    ToastService.error('Failed to load vehicles')
  } finally {
    vehiclesLoading.value = false
  }
}

// ── Sprint 26: work location, site address, quote requirement ────────────────
const site = reactive({ street: '', street2: '', city: '', postcode: '', contactName: '', contactPhone: '', accessNotes: '' })
const siteErrors = reactive({ street: '', city: '', postcode: '' })
const customerAddress = ref<BillingAddress | null>(null)
const customerContact = ref<{ name: string; phone?: string } | null>(null)
const locationOptions = [
  { value: WorkLocation.WORKSHOP, label: 'In the workshop' },
  { value: WorkLocation.ON_SITE, label: 'On-site (at the customer)' },
]
const quoteOptions = [
  { value: 'inherit', label: 'Customer / company default' },
  { value: 'yes', label: 'Yes — quote first' },
  { value: 'no', label: 'No — approve straight away' },
]

function resetSite() {
  site.street = ''; site.street2 = ''; site.city = ''; site.postcode = ''
  site.contactName = ''; site.contactPhone = ''; site.accessNotes = ''
  siteErrors.street = ''; siteErrors.city = ''; siteErrors.postcode = ''
}

/** Copy the customer's billing address into the site address when it is still empty. */
function prefillSiteFromCustomer() {
  if (form.workLocation !== WorkLocation.ON_SITE) return
  if (site.street || site.city || site.postcode) return
  const a = customerAddress.value
  if (a) {
    site.street = a.street ?? ''
    site.city = a.city ?? ''
    site.postcode = a.postcode ?? ''
  }
  if (customerContact.value) {
    site.contactName = site.contactName || customerContact.value.name
    site.contactPhone = site.contactPhone || (customerContact.value.phone ?? '')
  }
}

watch(() => form.workLocation, () => prefillSiteFromCustomer())

watch(() => form.customerId, async (customerId) => {
  form.vehicleId = ''
  formErrors.vehicleId = ''
  loadVehicleOptions(customerId)
  customerAddress.value = null
  customerContact.value = null
  if (!customerId) return
  try {
    const customer = await getCustomer(customerId)
    customerAddress.value = customer.billingAddress ?? null
    customerContact.value = { name: customer.name, phone: customer.phone }
    prefillSiteFromCustomer()
  } catch {
    /* address prefill is a convenience only */
  }
})

function openCreateModal() {
  form.customerId = ''
  form.vehicleId = ''
  form.description = ''
  form.status = JobStatus.ENQUIRY
  form.dueDate = ''
  form.workLocation = WorkLocation.WORKSHOP
  form.quoteRequired = 'inherit'
  resetSite()
  customerAddress.value = null
  customerContact.value = null
  formErrors.customerId = ''
  formErrors.vehicleId = ''
  formErrors.description = ''
  vehicleOptions.value = []
  showModal.value = true
  loadCustomerOptions()
}

async function submitForm() {
  formErrors.customerId = form.customerId ? '' : 'Customer is required'
  formErrors.vehicleId = form.vehicleId ? '' : 'Vehicle is required'
  formErrors.description = form.description.trim() ? '' : 'Description is required'
  const onSite = form.workLocation === WorkLocation.ON_SITE
  siteErrors.street = onSite && !site.street.trim() ? 'Street is required for on-site work' : ''
  siteErrors.city = onSite && !site.city.trim() ? 'Town is required' : ''
  siteErrors.postcode = onSite && !/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/.test(site.postcode.trim()) ? 'Enter a valid UK postcode' : ''
  if (formErrors.customerId || formErrors.vehicleId || formErrors.description || siteErrors.street || siteErrors.city || siteErrors.postcode) return

  submitting.value = true
  try {
    await jobsStore.createJob({
      customerId: form.customerId,
      vehicleId: form.vehicleId,
      description: form.description.trim(),
      status: form.status,
      dueDate: form.dueDate || undefined,
      workLocation: form.workLocation,
      siteAddress: onSite
        ? {
            street: site.street.trim(), street2: site.street2.trim() || undefined, city: site.city.trim(),
            postcode: site.postcode.trim().toUpperCase(), contactName: site.contactName.trim() || undefined,
            contactPhone: site.contactPhone.trim() || undefined, accessNotes: site.accessNotes.trim() || undefined,
          }
        : undefined,
      quoteRequired: form.quoteRequired === 'inherit' ? undefined : form.quoteRequired === 'yes',
    })
    ToastService.success('Job created')
    showModal.value = false
  } catch (err: any) {
    const message = err?.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to create job'))
  } finally {
    submitting.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function handleDelete(job: Job) {
  const result = await showConfirmDialog(`Delete job ${job.jobNumber}?`, false, 'Delete')
  if (!result.isConfirmed) return
  try {
    await jobsStore.deleteJob(job.id)
    ToastService.success('Job deleted')
  } catch {
    ToastService.error(jobsStore.error ?? 'Failed to delete job')
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isOverdue(job: Job): boolean {
  if (!job.dueDate) return false
  if ([JobStatus.COMPLETE, JobStatus.COLLECTED, JobStatus.CANCELLED].includes(job.status)) return false
  return job.dueDate < new Date().toISOString().slice(0, 10)
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

onMounted(() => {
  const route = useRoute()
  if (route.query.rework === '1') reworkOnly.value = true
  if (typeof route.query.status === 'string') statusFilter.value = route.query.status as any
  jobsStore.fetchJobs({ ...currentParams(), page: 1 })
})
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Jobs" subtitle="Manage all workshop jobs and work orders.">
      <UiButton v-if="canUpdate" variant="secondary" @click="inboxOpen = true"><FileScan class="w-4 h-4" /> Diagnostic Inbox</UiButton>
      <UiButton v-if="canCreate" @click="openCreateModal"><Plus class="w-4 h-4" /> New Job</UiButton>
    </UiPageHeader>

    <DiagnosticInboxPanel v-model="inboxOpen" @attached="jobsStore.fetchJobs({ page: 1 })" />

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <button
        @click="toggleReworkFilter"
        :class="[
          'px-3 py-1.5 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5',
          reworkOnly
            ? 'bg-amber-500 text-white'
            : 'bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-border',
        ]"
      >
        <RotateCcw class="w-3.5 h-3.5" /> Reworks
      </button>
      <UiSearchInput
        :modelValue="searchQuery"
        placeholder="Search job no, customer, reg..."
        @update:modelValue="onSearch"
      />
      <div class="w-52">
        <UiSelect v-model="statusFilter" :options="statusFilterOptions" @update:modelValue="onStatusFilter" />
      </div>
      <div class="w-48">
        <UiSelect v-model="locationFilter" :options="locationFilterOptions" @update:modelValue="onLocationFilter" />
      </div>
      <span class="text-sm text-slate-400 ml-auto">{{ jobsStore.total }} jobs</span>
    </div>

    <UiTable :headers="['Job No', 'Customer', 'Vehicle / Reg', 'Description', 'Technician', 'Due', 'Status', '']">
      <!-- Loading skeleton -->
      <template v-if="jobsStore.loading && jobsStore.jobs.length === 0">
        <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in 8" :key="col" class="px-4 py-3.5">
            <div class="h-3.5 w-24 bg-slate-200 dark:bg-white/10 rounded" />
          </td>
        </tr>
      </template>

      <!-- Empty state -->
      <template v-else-if="!jobsStore.loading && jobsStore.jobs.length === 0">
        <tr>
          <td colspan="8" class="px-4 py-10 text-center text-sm text-slate-400">No jobs found.</td>
        </tr>
      </template>

      <tr
        v-else
        v-for="job in jobsStore.jobs"
        :key="job.id"
        class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
      >
        <td class="px-4 py-3.5 whitespace-nowrap">
          <router-link :to="`/jobs/${job.id}`" class="font-semibold text-brand-600 hover:underline">{{ job.jobNumber }}</router-link>
          <span v-if="job.isRework" class="ml-1.5 inline-flex items-center gap-0.5 text-xs text-amber-600" title="Rework"><RotateCcw class="w-3 h-3" /></span>
          <span
            v-if="job.workLocation === WorkLocation.ON_SITE"
            class="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
            :title="job.siteAddress?.postcode ? `On-site · ${job.siteAddress.postcode}` : 'On-site'"
          ><MapPin class="w-3 h-3" /> On-site</span>
        </td>
        <td class="px-4 py-3.5 text-slate-700 dark:text-slate-200 font-medium">{{ job.customerName ?? '—' }}</td>
        <td class="px-4 py-3.5">
          <p class="text-slate-700 dark:text-slate-200 text-sm">{{ job.vehicleLabel ?? '—' }}</p>
          <p class="text-xs font-mono text-slate-400">{{ job.vehicleRegistration }}</p>
        </td>
        <td class="px-4 py-3.5 text-slate-600 dark:text-slate-300 max-w-[220px] truncate">{{ job.description }}</td>
        <td class="px-4 py-3.5 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {{ job.technicians?.length ? job.technicians.map((t) => t.name.split(' ')[0]).join(', ') : 'Unassigned' }}
        </td>
        <td :class="['px-4 py-3.5 text-sm whitespace-nowrap', isOverdue(job) ? 'text-red-500 font-semibold' : 'text-slate-500 dark:text-slate-400']">
          {{ formatDate(job.dueDate) }}<span v-if="isOverdue(job)" class="block text-[10px] uppercase tracking-wide">Overdue</span>
        </td>
        <td class="px-4 py-3.5">
          <UiBadge :variant="(jobStatusBadgeVariant[job.status] as any)" dot>{{ jobStatusLabels[job.status] }}</UiBadge>
        </td>
        <td class="px-4 py-3.5">
          <div class="flex items-center gap-1">
            <router-link :to="`/jobs/${job.id}`" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors" title="Open job card">
              <Eye class="w-4 h-4" />
            </router-link>
            <button v-if="canDelete" @click="handleDelete(job)" class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    </UiTable>

    <!-- Pagination -->
    <div v-if="jobsStore.totalPages > 1" class="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
      <span>Page {{ jobsStore.currentPage }} of {{ jobsStore.totalPages }}</span>
      <button
        :disabled="jobsStore.currentPage <= 1"
        @click="goToPage(jobsStore.currentPage - 1)"
        class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
      <button
        :disabled="jobsStore.currentPage >= jobsStore.totalPages"
        @click="goToPage(jobsStore.currentPage + 1)"
        class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>

    <!-- New Job Modal -->
    <UiModal :open="showModal" title="New Job" @close="showModal = false">
      <form @submit.prevent="submitForm" class="flex flex-col gap-4">
        <UiSearchSelect
          v-model="form.customerId"
          label="Customer (bill-to)"
          :options="customerOptions"
          :loading="customersLoading"
          remote
          placeholder="Search customer…"
          search-placeholder="Type a name or business…"
          empty-text="No customers match."
          required
          :error="formErrors.customerId"
          @search="loadCustomerOptions"
        />
        <UiSearchSelect
          v-model="form.vehicleId"
          label="Vehicle"
          :options="vehicleOptions"
          :loading="vehiclesLoading"
          :disabled="!form.customerId"
          :placeholder="form.customerId ? 'Select vehicle…' : 'Select a customer first'"
          search-placeholder="Registration, make or model…"
          empty-text="This customer has no vehicles yet."
          required
          :error="formErrors.vehicleId"
        />
        <UiInput v-model="form.description" label="Job Description" placeholder="e.g. Full Service + MOT" required :error="formErrors.description" />
        <div class="grid grid-cols-2 gap-4">
          <UiSelect
            v-model="form.status"
            label="Initial Status"
            :options="[
              { value: JobStatus.ENQUIRY, label: 'Enquiry' },
              { value: JobStatus.BOOKED, label: 'Booked' },
            ]"
          />
          <UiInput v-model="form.dueDate" label="Due Date" type="date" />
        </div>

        <!-- Sprint 26 — where the work happens + quote requirement -->
        <div class="grid grid-cols-2 gap-4">
          <UiSelect v-model="form.workLocation" label="Work location" :options="locationOptions" />
          <UiSelect v-model="form.quoteRequired" label="Needs a quote first?" :options="quoteOptions" />
        </div>
        <div v-if="form.workLocation === WorkLocation.ON_SITE" class="rounded-lg border border-slate-200 dark:border-dark-border p-3 space-y-3 bg-slate-50/60 dark:bg-white/5">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><MapPin class="w-3.5 h-3.5" /> Site address</p>
          <UiInput v-model="site.street" label="Street" placeholder="12 Station Road" required :error="siteErrors.street" />
          <div class="grid grid-cols-2 gap-3">
            <UiInput v-model="site.city" label="Town / City" placeholder="Reading" required :error="siteErrors.city" />
            <UiInput v-model="site.postcode" label="Postcode" placeholder="RG1 1AA" required :error="siteErrors.postcode" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <UiInput v-model="site.contactName" label="On-site contact" placeholder="Who to ask for" />
            <UiInput v-model="site.contactPhone" label="Contact phone" placeholder="+44 7700 000000" />
          </div>
          <UiInput v-model="site.accessNotes" label="Access notes" placeholder="Gate code, parking, where the vehicle is…" />
        </div>
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="showModal = false">Cancel</UiButton>
        <UiButton :loading="submitting" @click="submitForm">Create Job</UiButton>
      </template>
    </UiModal>
  </DefaultLayout>
</template>
