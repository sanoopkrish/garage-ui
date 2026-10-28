<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import DashboardGrid from '@/components/Dashboard/DashboardGrid.vue'
import WidgetAddDrawer from '@/components/Dashboard/WidgetAddDrawer.vue'
import { LayoutDashboard, Plus, RotateCcw, Settings2, Check, RefreshCw } from 'lucide-vue-next'
import { useDashboardStore } from '@/stores/dashboard.store'
import { useAuthStore } from '@/stores/auth'
import { showConfirmDialog } from '@/utils/alert'
import { REFRESH_OPTIONS, relativeTime } from '@/utils/dashboard'

/**
 * Configurable dashboard (Sprint 24). Layout + data come from one call; the
 * user can customise (drag, resize, hide, add), reset to the role/company
 * default, and pick an auto-refresh interval. Admins set the defaults under
 * Settings → Dashboard.
 */
const store = useDashboardStore()
const authStore = useAuthStore()

const showAddDrawer = ref(false)
const addingKey = ref<string | null>(null)

const greeting = computed(() => {
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return `${part}, ${authStore.user?.firstName || 'there'}`
})
const sourceNote = computed(() => {
  if (store.isCustomized) return 'Your own layout'
  return store.source === 'role' ? 'Default layout for your role' : 'Workshop default layout'
})

async function add(widgetKey: string) {
  addingKey.value = widgetKey
  try {
    await store.addWidget(widgetKey)
  } finally {
    addingKey.value = null
  }
}

async function reset() {
  const result = await showConfirmDialog('Reset your dashboard to the default layout? Your own arrangement will be lost.', false, 'Reset', 'Cancel')
  if (result.isConfirmed) await store.resetToDefaults()
}

onMounted(() => store.loadDashboard())
onUnmounted(() => store.dispose())
</script>

<template>
  <DefaultLayout>
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ greeting }}</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {{ sourceNote }}<span v-if="store.fetchedAt"> · updated {{ relativeTime(store.fetchedAt) }}</span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <template v-if="store.isEditing">
          <label class="flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw class="w-3.5 h-3.5" />
            <select
              :value="store.settings.refreshSeconds"
              class="text-xs border border-slate-200 dark:border-dark-border rounded-md px-2 py-1.5 bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-300"
              title="Auto refresh"
              @change="store.setRefreshSeconds(Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="o in REFRESH_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
          <UiButton variant="outline" size="sm" @click="reset"><RotateCcw class="w-4 h-4 mr-1.5" />Reset</UiButton>
          <UiButton variant="secondary" size="sm" @click="showAddDrawer = true"><Plus class="w-4 h-4 mr-1.5" />Add widget</UiButton>
          <UiButton size="sm" @click="store.toggleEditMode()"><Check class="w-4 h-4 mr-1.5" />Done</UiButton>
        </template>
        <template v-else>
          <UiButton variant="ghost" size="sm" :disabled="store.isLoading" title="Refresh all widgets" @click="store.refreshAll(false)">
            <RefreshCw class="w-4 h-4" />
          </UiButton>
          <UiButton variant="outline" size="sm" @click="store.toggleEditMode()"><Settings2 class="w-4 h-4 mr-1.5" />Customise</UiButton>
        </template>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.isLoading && !store.layout.length" class="space-y-4">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="card h-24 animate-pulse bg-slate-100 dark:bg-white/5" />
      </div>
      <div class="card h-72 animate-pulse bg-slate-100 dark:bg-white/5" />
    </div>

    <!-- Error -->
    <div v-else-if="store.error && !store.layout.length" class="card text-center py-12">
      <p class="text-sm text-red-500 mb-3">{{ store.error }}</p>
      <UiButton variant="outline" size="sm" @click="store.loadDashboard()">Try again</UiButton>
    </div>

    <!-- Empty -->
    <div v-else-if="!store.visibleWidgets.length" class="card text-center py-16">
      <LayoutDashboard class="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <h2 class="text-base font-semibold text-slate-700 dark:text-slate-200">No widgets to show</h2>
      <p class="text-sm text-slate-400 mt-1 mb-4">Add the figures you want to keep an eye on.</p>
      <UiButton size="sm" @click="store.isEditing ? (showAddDrawer = true) : store.toggleEditMode().then(() => (showAddDrawer = true))">
        <Plus class="w-4 h-4 mr-1.5" />Add widget
      </UiButton>
    </div>

    <!-- Grid -->
    <DashboardGrid
      v-else
      :widgets="store.visibleWidgets"
      :widget-data="store.widgetData"
      :is-editing="store.isEditing"
      :loading-states="store.widgetLoading"
      :errors="store.widgetErrors"
      @reorder="store.reorderWidgets"
      @remove="store.hideWidget"
      @resize="store.resizeWidget"
      @refresh="(key) => store.refreshWidget(key)"
    />

    <WidgetAddDrawer :open="showAddDrawer" :widgets="store.availableWidgets" :busy-key="addingKey" @add="add" @close="showAddDrawer = false" />
  </DefaultLayout>
</template>
