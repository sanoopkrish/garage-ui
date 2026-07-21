<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import { Plus, Pencil, Trash2, Shield } from 'lucide-vue-next'
import { useUsersStore } from '@/stores/users.store'
import type { User } from '@/api/users.api'
import AssignRolesModal from '@/components/Users/AssignRolesModal.vue'
import { showConfirmDialog } from '@/utils/alert'

const router = useRouter()

const usersStore = useUsersStore()

// ── Search ────────────────────────────────────────────────────────────────────
const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearch(val: string) {
  searchQuery.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    usersStore.fetchUsers({ search: val || undefined, page: 1 })
  }, 350)
}

// ── Add modal ─────────────────────────────────────────────────────────────────
const showAddModal = ref(false)
const addSubmitting = ref(false)

const addForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  status: 'active' as 'active' | 'inactive',
})

const addErrors = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
})

function resetAddForm() {
  addForm.firstName = ''
  addForm.lastName = ''
  addForm.email = ''
  addForm.password = ''
  addForm.status = 'active'
  addErrors.firstName = ''
  addErrors.lastName = ''
  addErrors.email = ''
  addErrors.password = ''
}

function validateAddForm(): boolean {
  let valid = true
  addErrors.firstName = addForm.firstName.trim() ? '' : 'First name is required'
  addErrors.lastName = addForm.lastName.trim() ? '' : 'Last name is required'
  addErrors.email = addForm.email.trim() ? '' : 'Email is required'
  addErrors.password = addForm.password.trim() ? '' : 'Password is required'
  if (addErrors.firstName || addErrors.lastName || addErrors.email || addErrors.password) valid = false
  return valid
}

async function submitAdd() {
  if (!validateAddForm()) return
  addSubmitting.value = true
  try {
    await usersStore.createUser({
      email: addForm.email.trim(),
      password: addForm.password,
      status: addForm.status,
      firstName: addForm.firstName.trim(),
      lastName: addForm.lastName.trim(),
    })
    showAddModal.value = false
    resetAddForm()
  } catch {
    // error is stored in usersStore.error
  } finally {
    addSubmitting.value = false
  }
}

function openAddModal() {
  resetAddForm()
  showAddModal.value = true
}

// ── Edit ──────────────────────────────────────────────────────────────────────
function openEditPage(user: User) {
  router.push(`/admin/users/${user.id}/edit`)
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function handleDelete(user: User) {
  const fullName = getUserFullName(user)
  const result = await showConfirmDialog(`Delete user "${fullName}"? This action cannot be undone.`, false, 'Delete')
  if (!result.isConfirmed) return
  await usersStore.deleteUser(user.id)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getUserFullName(user: User): string {
  const first = user.firstName ?? ''
  const last = user.lastName ?? ''
  return (first + ' ' + last).trim() || user.email
}

function getUserInitial(user: User): string {
  return (user.firstName?.charAt(0) ?? user.email.charAt(0)).toUpperCase()
}

function getUserRoles(user: User): string {
  const roles = user.systemRoles?.map((r) => r.name)
  return roles && roles.length > 0 ? roles.join(', ') : '—'
}

function formatLastLogin(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

// ── Assign Roles ──────────────────────────────────────────────────────────────
const assignRolesOpen = ref(false)
const assignRolesUser = ref<User | null>(null)

function openAssignRoles(user: User) {
  assignRolesUser.value = user
  assignRolesOpen.value = true
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  usersStore.fetchUsers()
})
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Users" subtitle="Manage user accounts and access.">
      <UiSearchInput
        :modelValue="searchQuery"
        placeholder="Search users..."
        @update:modelValue="onSearch"
      />
      <UiButton @click="openAddModal">
        <Plus class="w-4 h-4" /> Add User
      </UiButton>
    </UiPageHeader>

    <UiTable :headers="['Name', 'Email', 'Roles', 'Status', 'Last Login', '']">
      <!-- Loading skeleton -->
      <template v-if="usersStore.loading && usersStore.users.length === 0">
        <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse">
          <td class="px-4 py-3.5">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-slate-200 dark:bg-white/10 rounded-full" />
              <div class="h-3.5 w-32 bg-slate-200 dark:bg-white/10 rounded" />
            </div>
          </td>
          <td class="px-4 py-3.5"><div class="h-3.5 w-44 bg-slate-200 dark:bg-white/10 rounded" /></td>
          <td class="px-4 py-3.5"><div class="h-3.5 w-24 bg-slate-200 dark:bg-white/10 rounded" /></td>
          <td class="px-4 py-3.5"><div class="h-5 w-16 bg-slate-200 dark:bg-white/10 rounded-full" /></td>
          <td class="px-4 py-3.5"><div class="h-3.5 w-24 bg-slate-200 dark:bg-white/10 rounded" /></td>
          <td class="px-4 py-3.5"><div class="h-7 w-16 bg-slate-200 dark:bg-white/10 rounded" /></td>
        </tr>
      </template>

      <!-- Empty state -->
      <template v-else-if="!usersStore.loading && usersStore.users.length === 0">
        <tr>
          <td colspan="6" class="px-4 py-10 text-center text-sm text-slate-400">No users found.</td>
        </tr>
      </template>

      <!-- User rows -->
      <tr
        v-else
        v-for="user in usersStore.users"
        :key="user.id"
        class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
      >
        <!-- Name -->
        <td class="px-4 py-3.5">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {{ getUserInitial(user) }}
            </div>
            <span class="font-medium text-slate-800 dark:text-slate-100">{{ getUserFullName(user) }}</span>
          </div>
        </td>

        <!-- Email -->
        <td class="px-4 py-3.5 text-sm text-slate-500 dark:text-slate-400">{{ user.email }}</td>

        <!-- Roles -->
        <td class="px-4 py-3.5">
          <div class="flex flex-wrap gap-1">
            <span v-for="r in (user.systemRoles || [])" :key="r.id" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">{{ r.name }}</span>
            <span v-if="!user.systemRoles?.length" class="text-sm text-slate-400">—</span>
          </div>
        </td>

        <!-- Status -->
        <td class="px-4 py-3.5">
          <UiBadge :variant="user.status === 'active' ? 'done' : 'pending'" dot>
            {{ user.status === 'active' ? 'Active' : 'Inactive' }}
          </UiBadge>
        </td>

        <!-- Last Login -->
        <td class="px-4 py-3.5 text-sm text-slate-400">
          {{ formatLastLogin(user.lastLoginAt ?? null) }}
        </td>

        <!-- Actions -->
        <td class="px-4 py-3.5">
          <div class="flex items-center gap-1">
            <button
              @click="openAssignRoles(user)"
              class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-brand-500 transition-colors"
              title="Assign Roles"
            >
              <Shield class="w-4 h-4" />
            </button>
            <button
              @click="openEditPage(user)"
              class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors"
              title="Edit user"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              @click="handleDelete(user)"
              class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
              title="Delete user"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    </UiTable>

    <!-- Add User Modal -->
    <UiModal :open="showAddModal" title="Add User" @close="showAddModal = false">
      <form @submit.prevent="submitAdd" class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-4">
          <UiInput
            v-model="addForm.firstName"
            label="First Name"
            placeholder="John"
            required
            :error="addErrors.firstName"
          />
          <UiInput
            v-model="addForm.lastName"
            label="Last Name"
            placeholder="Doe"
            required
            :error="addErrors.lastName"
          />
        </div>
        <UiInput
          v-model="addForm.email"
          label="Email"
          type="email"
          placeholder="john.doe@example.com"
          required
          :error="addErrors.email"
        />
        <UiInput
          v-model="addForm.password"
          label="Password"
          type="password"
          placeholder="••••••••"
          required
          :error="addErrors.password"
        />
        <UiSelect
          v-model="addForm.status"
          label="Status"
          :options="statusOptions"
          required
        />
        <p v-if="usersStore.error" class="text-xs text-red-500">{{ usersStore.error }}</p>
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="showAddModal = false">Cancel</UiButton>
        <UiButton type="submit" :loading="addSubmitting" @click="submitAdd">Create User</UiButton>
      </template>
    </UiModal>

    <!-- Assign Roles Modal -->
    <AssignRolesModal
      :open="assignRolesOpen"
      :user="assignRolesUser"
      @close="assignRolesOpen = false"
      @saved="usersStore.fetchUsers()"
    />
  </DefaultLayout>
</template>
