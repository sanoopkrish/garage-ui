<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import PermissionMenuItem from './PermissionMenuItem.vue'
import { useRolesStore } from '@/stores/roles.store'

const props = defineProps<{
  open: boolean
  role: { id: string; name: string; settings?: Record<string, any> } | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const rolesStore = useRolesStore()

const workingPermissions = ref<Record<string, any>>({})
const searchTerm = ref('')
const allExpanded = ref(false)
const saving = ref(false)

// On open: deep-clone role.settings and fetch permission tree if needed
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      workingPermissions.value = props.role?.settings
        ? JSON.parse(JSON.stringify(props.role.settings))
        : {}

      if (!rolesStore.permissionTree) {
        await rolesStore.fetchPermissionTree()
      }
    }
  },
  { immediate: true },
)

const permissionTree = computed(() => rolesStore.permissionTree)

const isAdmin = computed({
  get: () => !!workingPermissions.value?.isAdmin,
  set: (val: boolean) => {
    workingPermissions.value = { ...workingPermissions.value, isAdmin: val }
  },
})

function expandAll() {
  allExpanded.value = true
}

function collapseAll() {
  allExpanded.value = false
}

async function save() {
  if (!props.role) return
  saving.value = true
  try {
    await rolesStore.updateRolePermissions(props.role.id, workingPermissions.value)
    emit('saved')
    emit('close')
  } finally {
    saving.value = false
  }
}

function cancel() {
  emit('close')
}
</script>

<template>
  <UiModal
    :open="open"
    :title="role ? `Permissions — ${role.name}` : 'Permissions'"
    size="xl"
    @close="cancel"
  >
    <!-- Body -->
    <div class="space-y-4">
      <!-- Admin override toggle -->
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            :aria-checked="isAdmin"
            @click="isAdmin = !isAdmin"
            :class="[
              'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-1',
              isAdmin ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-600',
            ]"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform',
                isAdmin ? 'translate-x-4' : 'translate-x-0',
              ]"
            />
          </button>
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200">Admin override</span>
        </label>
      </div>

      <!-- Admin banner -->
      <div
        v-if="isAdmin"
        class="flex items-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300"
      >
        <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clip-rule="evenodd"
          />
        </svg>
        This role has full admin access — all permission checks are bypassed
      </div>

      <!-- Search + expand/collapse toolbar -->
      <div class="flex items-center gap-3 flex-wrap">
        <UiSearchInput
          v-model="searchTerm"
          placeholder="Search permissions..."
        />
        <div class="flex items-center gap-2 ml-auto">
          <UiButton variant="ghost" size="sm" @click="expandAll">Expand all</UiButton>
          <UiButton variant="ghost" size="sm" @click="collapseAll">Collapse all</UiButton>
        </div>
      </div>

      <!-- Permission tree -->
      <div class="space-y-1">
        <template v-if="permissionTree && permissionTree.menus">
          <PermissionMenuItem
            v-for="(val, key) in permissionTree.menus"
            :key="String(key)"
            :menuKey="String(key)"
            :menuValue="val"
            :path="['menus', String(key)]"
            :permissions="workingPermissions"
            :searchTerm="searchTerm"
            :level="0"
            :forceExpand="allExpanded"
            @changed="() => {}"
          />
        </template>
        <div
          v-else-if="rolesStore.loading"
          class="flex items-center justify-center py-10 text-slate-400 text-sm"
        >
          <svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading permissions...
        </div>
        <div
          v-else
          class="py-10 text-center text-sm text-slate-400"
        >
          No permissions available.
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <UiButton variant="secondary" @click="cancel">Cancel</UiButton>
      <UiButton variant="primary" :loading="saving" @click="save">Save Permissions</UiButton>
    </template>
  </UiModal>
</template>
