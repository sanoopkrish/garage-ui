<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { useRolesStore } from '@/stores/roles.store'
import { Plus, Pencil, Copy, Trash2, Shield } from 'lucide-vue-next'
import type { SystemRole } from '@/api/roles.api'
import PermissionsEditor from '@/components/Roles/PermissionsEditor.vue'
import { NotificationRecipientTag } from '@/types/generated/enums/notification'
import { usePermissions } from '@/composables/usePermissions'

const rolesStore = useRolesStore()
const { hasPermission: canEditTags } = usePermissions('menus.administration.settings.notifications.roleNotificationTags.update')

/** Which internal alerts each role receives (panic, parts delayed/received, field-job completed…) */
const tagOptions: { value: string; label: string }[] = [
  { value: NotificationRecipientTag.MANAGEMENT, label: 'Management' },
  { value: NotificationRecipientTag.WORKSHOP_MANAGER, label: 'Workshop Manager' },
  { value: NotificationRecipientTag.RECEPTIONIST, label: 'Receptionist' },
  { value: NotificationRecipientTag.ACCOUNTS, label: 'Accounts' },
  { value: NotificationRecipientTag.TECHNICIAN, label: 'Technician' },
  { value: NotificationRecipientTag.FIELD_ENGINEER, label: 'Field Engineer' },
]

function toggleTag(tag: string) {
  const i = form.value.notificationTags.indexOf(tag)
  if (i >= 0) form.value.notificationTags.splice(i, 1)
  else form.value.notificationTags.push(tag)
}

// ─── Modal state ────────────────────────────────────────────────────────────

type ModalMode = 'create' | 'edit'

const showModal = ref(false)
const modalMode = ref<ModalMode>('create')
const editingRole = ref<SystemRole | null>(null)

const form = ref({
  name: '',
  description: '',
  status: 'active' as 'active' | 'inactive',
  notificationTags: [] as string[],
})

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

// ─── Permissions editor state ────────────────────────────────────────────────

const permissionsOpen = ref(false)
const selectedRole = ref<SystemRole | null>(null)

// ─── Delete confirm state ────────────────────────────────────────────────────

const showDeleteDialog = ref(false)
const deletingRole = ref<SystemRole | null>(null)

// ─── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(() => {
  rolesStore.fetchRoles()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetForm() {
  form.value = { name: '', description: '', status: 'active', notificationTags: [] }
  editingRole.value = null
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function openCreateModal() {
  resetForm()
  modalMode.value = 'create'
  showModal.value = true
}

function openEditModal(role: SystemRole) {
  editingRole.value = role
  form.value = {
    name: role.name,
    description: role.description ?? '',
    status: role.status,
    notificationTags: [...(role.notificationTags ?? [])],
  }
  modalMode.value = 'edit'
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  resetForm()
}

async function submitModal() {
  if (!form.value.name.trim()) return

  if (modalMode.value === 'create') {
    await rolesStore.createRole({
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      ...(canEditTags.value ? { notificationTags: form.value.notificationTags } : {}),
    })
  } else if (editingRole.value) {
    await rolesStore.updateRole(editingRole.value.id, {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      status: form.value.status,
      ...(canEditTags.value ? { notificationTags: form.value.notificationTags } : {}),
    })
  }

  closeModal()
}

function openPermissions(role: SystemRole) {
  selectedRole.value = role
  permissionsOpen.value = true
}

async function handleClone(role: SystemRole) {
  await rolesStore.cloneRole(role.id, `${role.name} (copy)`)
}

function openDeleteDialog(role: SystemRole) {
  deletingRole.value = role
  showDeleteDialog.value = true
}

function closeDeleteDialog() {
  showDeleteDialog.value = false
  deletingRole.value = null
}

async function confirmDelete() {
  if (!deletingRole.value) return
  await rolesStore.deleteRole(deletingRole.value.id)
  closeDeleteDialog()
}
</script>

<template>
  <DefaultLayout>
    <!-- Page Header -->
    <UiPageHeader
      title="Roles"
      subtitle="Manage system roles and their permissions."
    >
      <UiButton @click="openCreateModal">
        <Plus class="w-4 h-4" />
        Add Role
      </UiButton>
    </UiPageHeader>

    <!-- Loading skeleton -->
    <div v-if="rolesStore.loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="n in 6"
        :key="n"
        class="bg-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border p-5 shadow-sm animate-pulse"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32" />
          <div class="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-16" />
        </div>
        <div class="space-y-2 mb-4">
          <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
          <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        </div>
        <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-4" />
        <div class="flex gap-2 pt-4 border-t border-slate-100 dark:border-dark-border">
          <div class="h-7 bg-slate-200 dark:bg-slate-700 rounded-lg w-14" />
          <div class="h-7 bg-slate-200 dark:bg-slate-700 rounded-lg w-14" />
          <div class="h-7 bg-slate-200 dark:bg-slate-700 rounded-lg w-16" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!rolesStore.loading && rolesStore.roles.length === 0"
      class="flex flex-col items-center justify-center py-20 text-center"
    >
      <div class="w-14 h-14 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center mb-4">
        <Plus class="w-6 h-6 text-slate-400" />
      </div>
      <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">
        No roles yet — create your first role
      </p>
    </div>

    <!-- Roles grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="role in rolesStore.roles"
        :key="role.id"
        class="bg-white dark:bg-dark-surface rounded-xl border border-slate-100 dark:border-dark-border p-5 shadow-sm flex flex-col"
      >
        <!-- Card header -->
        <div class="flex items-start justify-between gap-2 mb-2">
          <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
            {{ role.name }}
          </h3>
          <UiBadge :variant="role.status === 'active' ? 'done' : 'pending'" dot class="flex-shrink-0">
            {{ role.status === 'active' ? 'Active' : 'Inactive' }}
          </UiBadge>
        </div>

        <!-- Description -->
        <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 flex-1 min-h-[2.5rem]">
          {{ role.description || '—' }}
        </p>

        <!-- User count -->
        <p class="text-xs text-slate-400 dark:text-slate-500 mb-4">
          <span class="font-medium text-slate-600 dark:text-slate-300">
            {{ (role.settings as any)?.userCount ?? '—' }}
          </span>
          {{ (role.settings as any)?.userCount === 1 ? ' user' : ' users' }}
        </p>

        <!-- Card footer actions -->
        <div class="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-dark-border">
          <UiButton variant="ghost" size="sm" @click="openEditModal(role)">
            <Pencil class="w-3.5 h-3.5" />
            Edit
          </UiButton>
          <UiButton variant="ghost" size="sm" :loading="rolesStore.loading" @click="handleClone(role)">
            <Copy class="w-3.5 h-3.5" />
            Clone
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="openPermissions(role)">
            <Shield class="w-4 h-4" /> Permissions
          </UiButton>
          <UiButton variant="ghost" size="sm" class="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto" @click="openDeleteDialog(role)">
            <Trash2 class="w-3.5 h-3.5" />
            Delete
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <UiModal
      :open="showModal"
      :title="modalMode === 'create' ? 'Add Role' : 'Edit Role'"
      size="sm"
      @close="closeModal"
    >
      <div class="flex flex-col gap-4">
        <UiInput
          v-model="form.name"
          label="Name"
          placeholder="e.g. Service Manager"
          required
        />
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
            Description
          </label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Briefly describe what this role can do..."
            class="w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-dark-surface text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-colors resize-none border-slate-200 dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
          />
        </div>
        <UiSelect
          v-if="modalMode === 'edit'"
          v-model="form.status"
          label="Status"
          :options="statusOptions"
        />

        <div v-if="canEditTags" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Notification tags</label>
          <p class="text-xs text-slate-400 -mt-0.5">
            Internal alerts (panic button, parts delayed/received, field job completed…) go to roles carrying the matching tag.
          </p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="opt in tagOptions"
              :key="opt.value"
              type="button"
              @click="toggleTag(opt.value)"
              :class="[
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                form.notificationTags.includes(opt.value)
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'border-slate-200 dark:border-dark-border text-slate-500 dark:text-slate-400 hover:border-brand-400',
              ]"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton variant="secondary" @click="closeModal">Cancel</UiButton>
        <UiButton
          :loading="rolesStore.loading"
          :disabled="!form.name.trim()"
          @click="submitModal"
        >
          {{ modalMode === 'create' ? 'Create Role' : 'Save Changes' }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Delete Confirm Dialog -->
    <UiModal
      :open="showDeleteDialog"
      title="Delete Role"
      size="sm"
      @close="closeDeleteDialog"
    >
      <p class="text-sm text-slate-600 dark:text-slate-400">
        Are you sure you want to delete
        <span class="font-semibold text-slate-800 dark:text-slate-100">{{ deletingRole?.name }}</span>?
        This action cannot be undone.
      </p>

      <template #footer>
        <UiButton variant="secondary" @click="closeDeleteDialog">Cancel</UiButton>
        <UiButton variant="danger" :loading="rolesStore.loading" @click="confirmDelete">
          Delete
        </UiButton>
      </template>
    </UiModal>
    <!-- Permissions Editor -->
    <PermissionsEditor
      :open="permissionsOpen"
      :role="selectedRole"
      @close="permissionsOpen = false"
      @saved="rolesStore.fetchRoles()"
    />
  </DefaultLayout>
</template>
