<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { useRolesStore } from '@/stores/roles.store'
import { useUsersStore } from '@/stores/users.store'

interface UserProp {
  id: string
  profile?: { firstName: string; lastName: string }
  systemRoles?: { id: string; name: string }[]
}

const props = defineProps<{
  open: boolean
  user: UserProp | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const rolesStore = useRolesStore()
const usersStore = useUsersStore()

const selectedRoleIds = ref<string[]>([])
const saving = ref(false)

const fullName = computed(() => {
  if (!props.user) return ''
  const { firstName = '', lastName = '' } = props.user.profile ?? {}
  return [firstName, lastName].filter(Boolean).join(' ') || 'User'
})

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    await rolesStore.fetchRoles()
    selectedRoleIds.value = props.user?.systemRoles?.map((r) => r.id) ?? []
  },
)

function isSelected(roleId: string): boolean {
  return selectedRoleIds.value.includes(roleId)
}

function toggleRole(roleId: string): void {
  if (isSelected(roleId)) {
    selectedRoleIds.value = selectedRoleIds.value.filter((id) => id !== roleId)
  } else {
    selectedRoleIds.value = [...selectedRoleIds.value, roleId]
  }
}

async function handleSave(): Promise<void> {
  if (!props.user) return
  saving.value = true
  try {
    await usersStore.updateUser(props.user.id, { systemRoleIds: selectedRoleIds.value } as any)
    emit('saved')
    emit('close')
  } finally {
    saving.value = false
  }
}

function handleCancel(): void {
  emit('close')
}
</script>

<template>
  <UiModal
    :open="open"
    :title="`Assign Roles — ${fullName}`"
    size="sm"
    @close="handleCancel"
  >
    <div class="space-y-2">
      <p v-if="rolesStore.loading && rolesStore.roles.length === 0" class="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
        Loading roles...
      </p>

      <p v-else-if="rolesStore.roles.length === 0" class="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
        No roles available.
      </p>

      <label
        v-for="role in rolesStore.roles"
        :key="role.id"
        :class="[
          'flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors',
          isSelected(role.id)
            ? 'border-brand-200 bg-brand-50/50 dark:bg-brand-900/10'
            : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5',
        ]"
      >
        <input
          type="checkbox"
          :checked="isSelected(role.id)"
          :value="role.id"
          class="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-dark-surface cursor-pointer flex-shrink-0"
          @change="toggleRole(role.id)"
        />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
            {{ role.name }}
          </p>
          <p v-if="role.description" class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {{ role.description }}
          </p>
        </div>
        <UiBadge :variant="role.status === 'active' ? 'done' : 'pending'" dot>
          {{ role.status === 'active' ? 'Active' : 'Inactive' }}
        </UiBadge>
      </label>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="handleCancel">Cancel</UiButton>
      <UiButton
        variant="primary"
        :loading="saving"
        :disabled="saving"
        @click="handleSave"
      >
        Save
      </UiButton>
    </template>
  </UiModal>
</template>
