<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { GripVertical, Lock, Unlock, Eye, EyeOff, X, Plus, RotateCcw, Trash2 } from 'lucide-vue-next'
import UiButton from '@/components/Ui/UiButton.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import {
  fetchDashboardConfig, fetchRoleLayouts, fetchConfigAvailableWidgets, saveDashboardConfig, resetDashboardConfig, deleteRoleLayout,
  type DashboardConfig, type WidgetPlacement, type WidgetSummary, type RoleLayoutSummary,
} from '@/api/dashboard.api'
import { getRoles, type SystemRole } from '@/api/roles.api'
import { WidgetSize } from '@/types/generated/enums/dashboard'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'
import { CATEGORY_LABELS, CATEGORY_ORDER, SIZE_OPTIONS, TYPE_LABELS } from '@/utils/dashboard'

/**
 * Settings → Dashboard (Sprint 24): the default layout every user starts from.
 * "Workshop default" applies to everyone; a role can get its own layout, which
 * takes precedence for users holding that role. Users customise on top of it;
 * locked widgets stay on their dashboards regardless.
 */
const { hasPermission: canUpdate } = usePermissions('menus.administration.settings.dashboard.update')

const loading = ref(true)
const saving = ref(false)
const roles = ref<SystemRole[]>([])
const roleLayouts = ref<RoleLayoutSummary[]>([])
const selectedRoleId = ref<string | null>(null)
const config = ref<DashboardConfig | null>(null)
const widgets = ref<WidgetPlacement[]>([])
const catalogue = ref<WidgetSummary[]>([])
const search = ref('')
const dirty = ref(false)

const byKey = computed(() => new Map(catalogue.value.map((w) => [w.key, w])))
const rolesWithLayout = computed(() => new Set(roleLayouts.value.map((r) => r.roleId)))
const activeRoleName = computed(() => roles.value.find((r) => r.id === selectedRoleId.value)?.name ?? null)

const addable = computed(() => {
  const q = search.value.trim().toLowerCase()
  const used = new Set(widgets.value.map((w) => w.widgetKey))
  const list = catalogue.value.filter((w) => !used.has(w.key) && (!q || w.displayName.toLowerCase().includes(q) || CATEGORY_LABELS[w.category].toLowerCase().includes(q)))
  return CATEGORY_ORDER.map((c) => ({ key: c, label: CATEGORY_LABELS[c], widgets: list.filter((w) => w.category === c) })).filter((g) => g.widgets.length)
})

async function load() {
  loading.value = true
  try {
    const [cfg, cat, layouts] = await Promise.all([fetchDashboardConfig(selectedRoleId.value), fetchConfigAvailableWidgets(), fetchRoleLayouts()])
    config.value = cfg
    catalogue.value = cat
    roleLayouts.value = layouts
    widgets.value = [...cfg.widgets].sort((a, b) => a.order - b.order).map((w) => ({ ...w }))
    dirty.value = false
  } catch {
    ToastService.error('Failed to load the dashboard defaults')
  } finally {
    loading.value = false
  }
}

async function selectRole(roleId: string | null) {
  if (dirty.value) {
    const r = await showConfirmDialog('You have unsaved changes to this layout. Discard them?', false, 'Discard', 'Keep editing')
    if (!r.isConfirmed) return
  }
  selectedRoleId.value = roleId
  await load()
}

function renumber() {
  widgets.value.forEach((w, i) => (w.order = i))
  dirty.value = true
}
function add(key: string) {
  const def = byKey.value.get(key)
  if (!def) return
  widgets.value.push({ widgetKey: key, order: widgets.value.length, size: def.defaultSize, isLocked: false, isVisible: true })
  renumber()
}
function remove(i: number) { widgets.value.splice(i, 1); renumber() }
function toggleLock(w: WidgetPlacement) { w.isLocked = !w.isLocked; if (w.isLocked) w.isVisible = true; dirty.value = true }
function toggleVisible(w: WidgetPlacement) { if (w.isLocked) return; w.isVisible = !w.isVisible; dirty.value = true }
function setSize(w: WidgetPlacement, size: string) { w.size = size as WidgetSize; dirty.value = true }

async function save() {
  saving.value = true
  try {
    config.value = await saveDashboardConfig(widgets.value.map((w, i) => ({ ...w, order: i })), selectedRoleId.value)
    roleLayouts.value = await fetchRoleLayouts()
    dirty.value = false
    ToastService.success(selectedRoleId.value ? `Layout saved for ${activeRoleName.value}` : 'Workshop default layout saved')
  } catch (e: any) {
    const message = e.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to save the layout'))
  } finally {
    saving.value = false
  }
}

async function reset() {
  const text = selectedRoleId.value
    ? `Remove the ${activeRoleName.value} layout? Users with this role will see the workshop default instead.`
    : 'Reset the workshop default layout to the built-in defaults? Role layouts and users\' own layouts are not affected.'
  const r = await showConfirmDialog(text, false, selectedRoleId.value ? 'Remove' : 'Reset', 'Cancel')
  if (!r.isConfirmed) return
  try {
    if (selectedRoleId.value) await deleteRoleLayout(selectedRoleId.value)
    else await resetDashboardConfig(null)
    ToastService.success(selectedRoleId.value ? 'Role layout removed' : 'Default layout reset')
    await load()
  } catch {
    ToastService.error('Failed to reset')
  }
}

onMounted(async () => {
  try { roles.value = (await getRoles()).filter((r) => r.status === 'active' && !r.settings?.isAdmin) } catch { roles.value = [] }
  await load()
})
watch(widgets, () => { /* drag end handled by renumber */ }, { deep: true })

const selectClass = 'text-xs border border-slate-200 dark:border-dark-border rounded-md px-1.5 py-1 bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-300 disabled:opacity-50'
</script>

<template>
  <div>
    <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Dashboard</h2>
    <p class="text-sm text-slate-500 mb-5">
      The layout people start with. Everyone gets the workshop default unless their role has its own. Users can still rearrange, hide and add widgets
      themselves; a <Lock class="inline w-3 h-3 -mt-0.5" /> locked widget stays on their dashboard. Widgets only show for people who can see that part of the system.
    </p>

    <!-- Role tabs -->
    <div class="flex flex-wrap gap-1.5 mb-5">
      <button
        type="button"
        :class="['px-3 py-1.5 rounded-full text-xs font-medium border transition-colors', selectedRoleId === null ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:border-brand-300']"
        @click="selectRole(null)"
      >
        Workshop default
      </button>
      <button
        v-for="r in roles"
        :key="r.id"
        type="button"
        :class="['px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5', selectedRoleId === r.id ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:border-brand-300']"
        @click="selectRole(r.id)"
      >
        {{ r.name }}
        <span v-if="rolesWithLayout.has(r.id)" :class="['w-1.5 h-1.5 rounded-full', selectedRoleId === r.id ? 'bg-white' : 'bg-brand-500']" title="Has its own layout" />
      </button>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-10 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />
    </div>

    <div v-else class="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <!-- Layout -->
      <div class="xl:col-span-3">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ activeRoleName ? `${activeRoleName} layout` : 'Workshop default layout' }}</h3>
            <p v-if="config?.inherited" class="text-xs text-amber-600 mt-0.5">This role has no layout of its own yet — you are looking at a copy of the workshop default. Save to give it one.</p>
            <p v-else-if="activeRoleName" class="text-xs text-slate-400 mt-0.5">Applies to everyone with the {{ activeRoleName }} role instead of the workshop default.</p>
          </div>
          <span class="text-xs text-slate-400">{{ widgets.filter((w) => w.isVisible).length }} visible · {{ widgets.length }} total</span>
        </div>

        <draggable v-if="canUpdate" v-model="widgets" item-key="widgetKey" handle=".drag-handle" ghost-class="opacity-40" class="space-y-1.5" @end="renumber">
          <template #item="{ element: w, index: i }">
            <div :class="['flex items-center gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-dark-surface', w.isVisible ? 'border-slate-200 dark:border-dark-border' : 'border-dashed border-slate-200 dark:border-dark-border opacity-60']">
              <GripVertical class="drag-handle w-4 h-4 text-slate-300 cursor-grab flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{{ byKey.get(w.widgetKey)?.displayName ?? w.widgetKey }}</p>
                <p class="text-[11px] text-slate-400 truncate">
                  {{ byKey.get(w.widgetKey) ? CATEGORY_LABELS[byKey.get(w.widgetKey)!.category] : '' }}
                  <span v-if="byKey.get(w.widgetKey)"> · {{ TYPE_LABELS[byKey.get(w.widgetKey)!.widgetType] }}</span>
                </p>
              </div>
              <select :value="w.size" :class="selectClass" title="Size" @change="setSize(w, ($event.target as HTMLSelectElement).value)">
                <option v-for="o in SIZE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <button type="button" :class="['p-1.5 rounded-md', w.isVisible ? 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10' : 'text-slate-300']" :title="w.isVisible ? 'Shown by default' : 'Hidden by default'" :disabled="w.isLocked" @click="toggleVisible(w)">
                <Eye v-if="w.isVisible" class="w-4 h-4" /><EyeOff v-else class="w-4 h-4" />
              </button>
              <button type="button" :class="['p-1.5 rounded-md', w.isLocked ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10']" :title="w.isLocked ? 'Locked — users cannot hide it' : 'Lock so users cannot hide it'" @click="toggleLock(w)">
                <Lock v-if="w.isLocked" class="w-4 h-4" /><Unlock v-else class="w-4 h-4" />
              </button>
              <button type="button" class="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove from layout" @click="remove(i)">
                <X class="w-4 h-4" />
              </button>
            </div>
          </template>
        </draggable>
        <ul v-else class="space-y-1.5">
          <li v-for="w in widgets" :key="w.widgetKey" class="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-dark-border text-sm">
            <Lock v-if="w.isLocked" class="w-3.5 h-3.5 text-amber-500" />
            <span class="flex-1 text-slate-700 dark:text-slate-200">{{ byKey.get(w.widgetKey)?.displayName ?? w.widgetKey }}</span>
            <span class="text-xs text-slate-400">{{ SIZE_OPTIONS.find((s) => s.value === w.size)?.label }}<span v-if="!w.isVisible"> · hidden</span></span>
          </li>
        </ul>
        <p v-if="!widgets.length" class="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 dark:border-dark-border rounded-lg">No widgets in this layout. Add some from the list.</p>

        <div v-if="canUpdate" class="flex items-center justify-between pt-4 mt-2">
          <UiButton variant="ghost" size="sm" @click="reset">
            <component :is="selectedRoleId ? Trash2 : RotateCcw" class="w-4 h-4 mr-1.5" />{{ selectedRoleId ? 'Remove role layout' : 'Reset to built-in defaults' }}
          </UiButton>
          <UiButton :disabled="saving || (!dirty && !config?.inherited)" :loading="saving" @click="save">Save layout</UiButton>
        </div>
      </div>

      <!-- Catalogue -->
      <div v-if="canUpdate" class="xl:col-span-2">
        <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Available widgets</h3>
        <UiSearchInput v-model="search" placeholder="Search…" class="mb-3" />
        <p v-if="!addable.length" class="text-sm text-slate-400 py-6 text-center">Everything is already in the layout.</p>
        <div v-for="g in addable" :key="g.key" class="mb-4">
          <h4 class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{{ g.label }}</h4>
          <ul class="space-y-1">
            <li v-for="w in g.widgets" :key="w.key">
              <button type="button" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-dark-border hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-900/10 text-left" @click="add(w.key)">
                <Plus class="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                <span class="min-w-0 flex-1">
                  <span class="block text-sm text-slate-700 dark:text-slate-200 truncate">{{ w.displayName }}</span>
                  <span class="block text-[11px] text-slate-400 truncate">{{ w.description }}</span>
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
