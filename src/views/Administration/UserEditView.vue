<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiMultiSelect from '@/components/Ui/UiMultiSelect.vue'
import { UserGender, UserGenderLabels } from '@/types/generated/enums/gender'
import { MaritalStatus, MaritalStatusLabels } from '@/types/generated/enums/marital-status'
import { useUsersStore } from '@/stores/users.store'
import { useRolesStore } from '@/stores/roles.store'
import { useMasterDataStore } from '@/stores/master-data.store'
import { ToastService } from '@/services/toast.service'

const route = useRoute()
const router = useRouter()
const usersStore = useUsersStore()
const rolesStore = useRolesStore()
const masterDataStore = useMasterDataStore()

const userId = route.params.id as string
const activeTab = ref<'profile' | 'account'>('profile')
const isLoading = ref(false)
const isSaving = ref(false)

const form = reactive({
  // Profile fields
  firstName: '',
  lastName: '',
  middleName: '',
  phoneNumber: '',
  gender: '',
  dateOfBirth: '',
  maritalStatus: '',
  departmentId: null as number | null,
  jobTitleId: null as number | null,
  employmentTypeId: null as number | null,
  employeeRoleIds: [] as number[],
  skillIds: [] as number[],
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  },
  // Account fields
  email: '',
  status: 'active' as 'active' | 'inactive',
  systemRoleIds: [] as string[],
})

const errors = reactive({
  firstName: '',
  lastName: '',
  email: '',
})

const genderOptions = [
  { value: '', label: 'Select gender' },
  ...Object.values(UserGender).map(v => ({ value: v, label: UserGenderLabels[v] })),
]

const maritalStatusOptions = [
  { value: '', label: 'Select status' },
  ...Object.values(MaritalStatus).map(v => ({ value: v, label: MaritalStatusLabels[v] })),
]

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const roleOptions = computed(() =>
  rolesStore.roles.map((r) => ({ value: r.id, label: r.name }))
)

const activeEmployeeRoleOptions = computed(() =>
  masterDataStore.employeeRoles
    .filter(r => r.status === 'active')
    .map(r => ({ value: r.id, label: r.name }))
)

const activeSkillOptions = computed(() =>
  masterDataStore.skills
    .filter(r => r.status === 'active')
    .map(r => ({ value: r.id, label: r.name }))
)

function validate(): boolean {
  errors.firstName = form.firstName.trim() ? '' : 'First name is required'
  errors.lastName = form.lastName.trim() ? '' : 'Last name is required'
  errors.email = form.email.trim() ? '' : 'Email is required'
  return !(errors.firstName || errors.lastName || errors.email)
}

async function save() {
  if (!validate()) return
  isSaving.value = true
  try {
    await usersStore.updateUser(userId, {
      email: form.email.trim(),
      status: form.status,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      middleName: form.middleName.trim() || undefined,
      phoneNumber: form.phoneNumber.trim() || undefined,
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      maritalStatus: form.maritalStatus || undefined,
      address: {
        street: form.address.street,
        city: form.address.city,
        state: form.address.state,
        zipCode: form.address.zipCode,
        country: form.address.country,
      },
      departmentId: form.departmentId ?? null,
      jobTitleId: form.jobTitleId ?? null,
      employmentTypeId: form.employmentTypeId ?? null,
      employeeRoleIds: form.employeeRoleIds,
      skillIds: form.skillIds,
      systemRoleIds: form.systemRoleIds,
    })
    ToastService.success('User updated successfully')
    router.push('/admin/users')
  } catch {
    ToastService.error('Failed to update user')
  } finally {
    isSaving.value = false
  }
}

function getUserInitial() {
  return (form.firstName?.charAt(0) || form.email?.charAt(0) || 'U').toUpperCase()
}

onMounted(async () => {
  isLoading.value = true
  try {
    await Promise.all([
      rolesStore.fetchRoles(),
      masterDataStore.fetchDepartments(),
      masterDataStore.fetchJobTitles(),
      masterDataStore.fetchEmploymentTypes(),
      masterDataStore.fetchEmployeeRoles(),
      masterDataStore.fetchSkills(),
      (async () => {
        const user = await usersStore.getUser(userId)
        form.firstName = user.firstName ?? ''
        form.lastName = user.lastName ?? ''
        form.middleName = user.middleName ?? ''
        form.phoneNumber = user.phoneNumber ?? ''
        form.gender = user.gender ?? ''
        form.dateOfBirth = user.dateOfBirth ? user.dateOfBirth.split('T')[0] : ''
        form.maritalStatus = user.maritalStatus ?? ''
        form.address.street = user.address?.street ?? ''
        form.address.city = user.address?.city ?? ''
        form.address.state = user.address?.state ?? ''
        form.address.zipCode = user.address?.zipCode ?? ''
        form.address.country = user.address?.country ?? ''
        form.departmentId = user.departmentId ?? null
        form.jobTitleId = user.jobTitleId ?? null
        form.employmentTypeId = user.employmentTypeId ?? null
        form.employeeRoleIds = user.employeeRoles?.map(r => r.id) ?? []
        form.skillIds = user.skills?.map(r => r.id) ?? []
        form.email = user.email
        form.status = user.status
        form.systemRoleIds = user.systemRoles?.map((r) => r.id) ?? []
      })(),
    ])
  } catch {
    ToastService.error('Failed to load user')
    router.push('/admin/users')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <DefaultLayout>
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <button
        @click="router.push('/admin/users')"
        class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>
      <div>
        <h1 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Edit User</h1>
        <p class="text-sm text-slate-400">Update user profile and account settings.</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else class="max-w-3xl mx-auto">
      <!-- User card -->
      <div class="flex items-center gap-4 bg-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border px-6 py-4 mb-5">
        <div class="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0">
          {{ getUserInitial() }}
        </div>
        <div>
          <p class="font-semibold text-slate-800 dark:text-slate-100">{{ (form.firstName + ' ' + form.lastName).trim() || '—' }}</p>
          <p class="text-sm text-slate-400">{{ form.email }}</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-slate-100 dark:border-dark-border mb-5">
        <nav class="flex gap-1">
          <button
            @click="activeTab = 'profile'"
            :class="[
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'profile'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
            ]"
          >
            Profile
          </button>
          <button
            @click="activeTab = 'account'"
            :class="[
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'account'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
            ]"
          >
            Account
          </button>
        </nav>
      </div>

      <!-- Form -->
      <form @submit.prevent="save" class="bg-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border px-6 py-6">

        <!-- Profile tab -->
        <div v-if="activeTab === 'profile'" class="flex flex-col gap-6">

          <!-- Personal information -->
          <div>
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-dark-border">
              Personal Information
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <UiInput
                v-model="form.firstName"
                label="First Name"
                placeholder="John"
                required
                :error="errors.firstName"
              />
              <UiInput
                v-model="form.lastName"
                label="Last Name"
                placeholder="Doe"
                required
                :error="errors.lastName"
              />
              <UiInput
                v-model="form.middleName"
                label="Middle Name"
                placeholder="Optional"
              />
              <UiInput
                v-model="form.phoneNumber"
                label="Phone Number"
                type="tel"
                placeholder="+1 555 000 0000"
              />
              <UiSelect
                v-model="form.gender"
                label="Gender"
                :options="genderOptions"
              />
              <UiInput
                v-model="form.dateOfBirth"
                label="Date of Birth"
                type="date"
              />
              <UiSelect
                v-model="form.maritalStatus"
                label="Marital Status"
                :options="maritalStatusOptions"
              />
            </div>
          </div>

          <!-- Employment -->
          <div>
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-dark-border">
              Employment
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
                <select
                  :value="form.departmentId ?? ''"
                  @change="form.departmentId = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null"
                  class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">None</option>
                  <option v-for="d in masterDataStore.departments.filter(d => d.status === 'active')" :key="d.id" :value="d.id">{{ d.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Job Title</label>
                <select
                  :value="form.jobTitleId ?? ''"
                  @change="form.jobTitleId = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null"
                  class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">None</option>
                  <option v-for="j in masterDataStore.jobTitles.filter(j => j.status === 'active')" :key="j.id" :value="j.id">{{ j.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employment Type</label>
                <select
                  :value="form.employmentTypeId ?? ''"
                  @change="form.employmentTypeId = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null"
                  class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">None</option>
                  <option v-for="e in masterDataStore.employmentTypes.filter(e => e.status === 'active')" :key="e.id" :value="e.id">{{ e.name }}</option>
                </select>
              </div>
            </div>
            <div class="col-span-2 mt-1">
              <UiMultiSelect
                v-model="form.employeeRoleIds"
                :options="activeEmployeeRoleOptions"
                label="Employee Roles"
                placeholder="Select employee roles…"
              />
            </div>
            <div class="col-span-2 mt-1">
              <UiMultiSelect
                v-model="form.skillIds"
                :options="activeSkillOptions"
                label="Skills"
                placeholder="Select skills…"
              />
            </div>
          </div>

          <!-- Address -->
          <div>
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-dark-border">
              Address
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <UiInput
                  v-model="form.address.street"
                  label="Street Address"
                  placeholder="123 Main St"
                />
              </div>
              <UiInput
                v-model="form.address.city"
                label="City"
                placeholder="London"
              />
              <UiInput
                v-model="form.address.state"
                label="State / Province"
                placeholder="England"
              />
              <UiInput
                v-model="form.address.zipCode"
                label="Postcode / ZIP"
                placeholder="SW1A 1AA"
              />
              <UiInput
                v-model="form.address.country"
                label="Country"
                placeholder="United Kingdom"
              />
            </div>
          </div>
        </div>

        <!-- Account tab -->
        <div v-if="activeTab === 'account'" class="flex flex-col gap-6">

          <!-- Account information -->
          <div>
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-dark-border">
              Account Information
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <UiInput
                  v-model="form.email"
                  label="Email"
                  type="email"
                  placeholder="john.doe@example.com"
                  required
                  :error="errors.email"
                />
              </div>
              <UiSelect
                v-model="form.status"
                label="Status"
                :options="statusOptions"
                required
              />
            </div>
          </div>

          <!-- System roles -->
          <div>
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-dark-border">
              System Roles
            </h3>
            <UiMultiSelect
              v-model="form.systemRoleIds"
              :options="roleOptions"
              placeholder="Select system roles…"
            />
          </div>
        </div>

        <!-- Footer actions -->
        <div class="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-slate-100 dark:border-dark-border">
          <UiButton variant="secondary" type="button" @click="router.push('/admin/users')">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="isSaving">
            Save Changes
          </UiButton>
        </div>
      </form>
    </div>
  </DefaultLayout>
</template>
