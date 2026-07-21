<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Pencil, Trash2, Plus } from 'lucide-vue-next'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import { useMasterDataStore } from '@/stores/master-data.store'
import { ToastService } from '@/services/toast.service'

type Tab = 'departments' | 'job-titles' | 'employment-types' | 'employee-roles' | 'skills'

const store = useMasterDataStore()
const activeTab = ref<Tab>('departments')

const tabs: { key: Tab; label: string }[] = [
  { key: 'departments', label: 'Departments' },
  { key: 'job-titles', label: 'Job Titles' },
  { key: 'employment-types', label: 'Employment Types' },
  { key: 'employee-roles', label: 'Employee Roles' },
  { key: 'skills', label: 'Skills' },
]

// Modal state
const modalOpen = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const editingId = ref<number | null>(null)
const isSaving = ref(false)
const isDeleting = ref<number | null>(null)

const form = reactive({
  name: '',
  description: '',
  status: 'active' as 'active' | 'inactive',
  annualBudget: '' as string | number,
  billingRate: '' as string | number,
})
const nameError = ref('')

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const modalTitle = computed(() => {
  const tabLabel = tabs.find(t => t.key === activeTab.value)?.label ?? ''
  return modalMode.value === 'add' ? `Add ${tabLabel.slice(0, -1)}` : `Edit ${tabLabel.slice(0, -1)}`
})

function openAdd() {
  modalMode.value = 'add'
  editingId.value = null
  form.name = ''
  form.description = ''
  form.status = 'active'
  form.annualBudget = ''
  form.billingRate = ''
  nameError.value = ''
  modalOpen.value = true
}

function openEdit(item: any) {
  modalMode.value = 'edit'
  editingId.value = item.id
  form.name = item.name
  form.description = item.description ?? ''
  form.status = item.status ?? 'active'
  form.annualBudget = item.annualBudget ?? ''
  form.billingRate = item.billingRate ?? ''
  nameError.value = ''
  modalOpen.value = true
}

async function switchTab(tab: Tab) {
  activeTab.value = tab
  await loadCurrentTab()
}

async function loadCurrentTab() {
  try {
    if (activeTab.value === 'departments') await store.fetchDepartments()
    else if (activeTab.value === 'job-titles') await store.fetchJobTitles()
    else if (activeTab.value === 'employment-types') await store.fetchEmploymentTypes()
    else if (activeTab.value === 'employee-roles') await store.fetchEmployeeRoles()
    else if (activeTab.value === 'skills') await store.fetchSkills()
  } catch {
    ToastService.error('Failed to load data')
  }
}

async function save() {
  nameError.value = form.name.trim() ? '' : 'Name is required'
  if (nameError.value) return

  isSaving.value = true
  try {
    const base = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
    }

    if (activeTab.value === 'departments') {
      const dto = { ...base, annualBudget: form.annualBudget !== '' ? Number(form.annualBudget) : undefined }
      modalMode.value === 'add'
        ? await store.createDepartment(dto)
        : await store.updateDepartment(editingId.value!, dto)
    } else if (activeTab.value === 'job-titles') {
      modalMode.value === 'add'
        ? await store.createJobTitle(base)
        : await store.updateJobTitle(editingId.value!, base)
    } else if (activeTab.value === 'employment-types') {
      modalMode.value === 'add'
        ? await store.createEmploymentType(base)
        : await store.updateEmploymentType(editingId.value!, base)
    } else if (activeTab.value === 'employee-roles') {
      const dto = { ...base, billingRate: form.billingRate !== '' ? Number(form.billingRate) : undefined }
      modalMode.value === 'add'
        ? await store.createEmployeeRole(dto)
        : await store.updateEmployeeRole(editingId.value!, dto)
    } else if (activeTab.value === 'skills') {
      modalMode.value === 'add'
        ? await store.createSkill(base)
        : await store.updateSkill(editingId.value!, base)
    }

    ToastService.success(modalMode.value === 'add' ? 'Created successfully' : 'Updated successfully')
    modalOpen.value = false
  } catch {
    ToastService.error('Failed to save')
  } finally {
    isSaving.value = false
  }
}

async function remove(id: number) {
  if (!confirm('Are you sure you want to delete this item?')) return
  isDeleting.value = id
  try {
    if (activeTab.value === 'departments') await store.deleteDepartment(id)
    else if (activeTab.value === 'job-titles') await store.deleteJobTitle(id)
    else if (activeTab.value === 'employment-types') await store.deleteEmploymentType(id)
    else if (activeTab.value === 'employee-roles') await store.deleteEmployeeRole(id)
    else if (activeTab.value === 'skills') await store.deleteSkill(id)
    ToastService.success('Deleted successfully')
  } catch {
    ToastService.error('Failed to delete')
  } finally {
    isDeleting.value = null
  }
}

const currentItems = computed(() => {
  if (activeTab.value === 'departments') return store.departments
  if (activeTab.value === 'job-titles') return store.jobTitles
  if (activeTab.value === 'employment-types') return store.employmentTypes
  if (activeTab.value === 'skills') return store.skills
  return store.employeeRoles
})

onMounted(() => loadCurrentTab())
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Master Data" subtitle="Manage departments, job titles, employment types, employee roles and skills." />

    <!-- Tabs -->
    <div class="border-b border-slate-100 dark:border-dark-border mb-6">
      <nav class="flex gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="switchTab(tab.key)"
          :class="[
            'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === tab.key
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
          ]"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Content -->
    <div class="bg-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border">

      <!-- Table header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-dark-border">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ currentItems.length }} {{ tabs.find(t => t.key === activeTab)?.label.toLowerCase() }}
        </p>
        <UiButton size="sm" @click="openAdd">
          <Plus class="w-4 h-4 mr-1.5" />
          Add
        </UiButton>
      </div>

      <!-- Loading -->
      <div v-if="store.isLoading" class="flex items-center justify-center py-16">
        <div class="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <!-- Empty -->
      <div v-else-if="currentItems.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <p class="text-slate-400 text-sm">No items yet. Click Add to create the first one.</p>
      </div>

      <!-- Table -->
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 dark:border-dark-border">
            <th class="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Name</th>
            <th class="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3 hidden md:table-cell">Description</th>
            <th v-if="activeTab === 'departments'" class="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">Annual Budget</th>
            <th v-if="activeTab === 'employee-roles'" class="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">Billing Rate</th>
            <th class="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Status</th>
            <th class="px-5 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
          <tr
            v-for="item in currentItems"
            :key="item.id"
            class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <td class="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-100">{{ item.name }}</td>
            <td class="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden md:table-cell max-w-xs truncate">
              {{ (item as any).description || '—' }}
            </td>
            <td v-if="activeTab === 'departments'" class="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden lg:table-cell">
              {{ (item as any).annualBudget != null ? `£${(item as any).annualBudget.toLocaleString()}` : '—' }}
            </td>
            <td v-if="activeTab === 'employee-roles'" class="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden lg:table-cell">
              {{ (item as any).billingRate != null ? `£${(item as any).billingRate}/hr` : '—' }}
            </td>
            <td class="px-5 py-3.5">
              <UiBadge :variant="item.status === 'active' ? 'done' : 'cancelled'">
                {{ item.status === 'active' ? 'Active' : 'Inactive' }}
              </UiBadge>
            </td>
            <td class="px-5 py-3.5">
              <div class="flex items-center justify-end gap-1">
                <button
                  @click="openEdit(item)"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="remove(item.id)"
                  :disabled="isDeleting === item.id"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add / Edit Modal -->
    <UiModal :open="modalOpen" :title="modalTitle" size="sm" @close="modalOpen = false">
      <form @submit.prevent="save" class="flex flex-col gap-4 px-6 py-5">
        <UiInput
          v-model="form.name"
          label="Name"
          placeholder="Enter name"
          required
          :error="nameError"
        />
        <UiInput
          v-model="form.description"
          label="Description"
          placeholder="Optional description"
        />
        <UiSelect
          v-model="form.status"
          label="Status"
          :options="statusOptions"
        />
        <UiInput
          v-if="activeTab === 'departments'"
          v-model="form.annualBudget"
          label="Annual Budget (£)"
          type="number"
          placeholder="0"
        />
        <UiInput
          v-if="activeTab === 'employee-roles'"
          v-model="form.billingRate"
          label="Billing Rate (£/hr)"
          type="number"
          placeholder="0"
        />
        <div class="flex items-center justify-end gap-3 pt-2">
          <UiButton variant="secondary" type="button" @click="modalOpen = false">Cancel</UiButton>
          <UiButton type="submit" :loading="isSaving">
            {{ modalMode === 'add' ? 'Create' : 'Save Changes' }}
          </UiButton>
        </div>
      </form>
    </UiModal>
  </DefaultLayout>
</template>
