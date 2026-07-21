<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { Building2, CheckCircle, XCircle, Eye, Settings, Power, Plus, RefreshCw } from 'lucide-vue-next'
import { useCompaniesStore } from '@/stores/companies.store'
import { ToastService } from '@/services/toast.service'

const router = useRouter()
const store = useCompaniesStore()

const searchQuery = ref('')
const statusFilter = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
]

function load() {
  store.fetchCompanies({
    search: searchQuery.value || undefined,
    isActive: statusFilter.value === '' ? undefined : statusFilter.value === 'true',
    page: 1,
    limit: 20,
  })
}

function onSearch(val: string) {
  searchQuery.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 350)
}

function onStatusChange(val: string) {
  statusFilter.value = val
  load()
}

async function toggleStatus(company: { id: string; name: string; isActive: boolean }, e: Event) {
  e.stopPropagation()
  const action = company.isActive ? 'deactivate' : 'activate'
  if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${company.name}?`)) return
  try {
    await store.toggleStatus(company.id, !company.isActive)
    ToastService.success(`Company ${action}d`)
  } catch {
    ToastService.error(`Failed to ${action} company`)
  }
}

function openDetails(id: string) {
  router.push(`/admin/companies/${id}`)
}

function openEdit(id: string, e: Event) {
  e.stopPropagation()
  router.push(`/admin/companies/${id}`)
}

onMounted(load)
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Companies" subtitle="Manage all garage client companies">
      <UiButton @click="router.push('/admin/companies/create')">
        <Plus class="w-4 h-4 mr-1" />
        Add Company
      </UiButton>
    </UiPageHeader>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="rounded-xl border border-slate-100 dark:border-dark-border bg-white dark:bg-dark-surface p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 font-medium uppercase tracking-wide">Total</p>
          <p class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{{ store.companyStats.total }}</p>
        </div>
        <Building2 class="w-8 h-8 text-brand-500" />
      </div>
      <div class="rounded-xl border border-slate-100 dark:border-dark-border bg-white dark:bg-dark-surface p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 font-medium uppercase tracking-wide">Active</p>
          <p class="text-2xl font-bold text-green-600 mt-1">{{ store.companyStats.active }}</p>
        </div>
        <CheckCircle class="w-8 h-8 text-green-500" />
      </div>
      <div class="rounded-xl border border-slate-100 dark:border-dark-border bg-white dark:bg-dark-surface p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 font-medium uppercase tracking-wide">Inactive</p>
          <p class="text-2xl font-bold text-red-500 mt-1">{{ store.companyStats.inactive }}</p>
        </div>
        <XCircle class="w-8 h-8 text-red-400" />
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 mb-4">
      <UiSearchInput
        :modelValue="searchQuery"
        placeholder="Search by name or subdomain..."
        class="flex-1 max-w-sm"
        @update:modelValue="onSearch"
      />
      <UiSelect
        :modelValue="statusFilter"
        :options="statusOptions"
        class="w-40"
        @update:modelValue="onStatusChange"
      />
      <button
        @click="load"
        class="p-2 rounded-lg border border-slate-200 dark:border-dark-border text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        title="Refresh"
      >
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <!-- Table -->
    <UiTable
      :headers="['Company', 'Subdomain', 'Status', 'Created', 'Actions']"
      :loading="store.loading"
      empty="No companies found."
    >
      <tr
        v-for="c in store.companies"
        :key="c.id"
        class="hover:bg-slate-50 dark:hover:bg-dark-hover cursor-pointer transition-colors"
        @click="openDetails(c.id)"
      >
        <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{{ c.name }}</td>
        <td class="px-4 py-3 text-slate-500 font-mono text-xs">{{ c.subdomain }}</td>
        <td class="px-4 py-3">
          <UiBadge :variant="c.isActive ? 'done' : 'cancelled'">
            {{ c.isActive ? 'Active' : 'Inactive' }}
          </UiBadge>
        </td>
        <td class="px-4 py-3 text-slate-500 text-xs">
          {{ new Date(c.createdAt).toLocaleDateString('en-GB') }}
        </td>
        <td class="px-4 py-3">
          <div class="flex items-center gap-2">
            <button @click="openEdit(c.id, $event)" title="View / Configure" class="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-dark-hover text-slate-500 hover:text-brand-500 transition-colors">
              <Settings class="w-4 h-4" />
            </button>
            <button
              @click="toggleStatus(c, $event)"
              :title="c.isActive ? 'Deactivate' : 'Activate'"
              :class="['p-1.5 rounded transition-colors', c.isActive ? 'hover:bg-red-50 text-slate-400 hover:text-red-500' : 'hover:bg-green-50 text-slate-400 hover:text-green-600']"
            >
              <Power class="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    </UiTable>
  </DefaultLayout>
</template>
