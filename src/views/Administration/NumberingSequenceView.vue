<template>
    <DefaultLayout>
  <div>
    <router-link
      to="/admin/settings"
      class="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
    >
      ← Back to Settings
    </router-link>

    <!-- Page Header -->
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">
          Document Numbering Configuration
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure automatic numbering for jobs, quotes, invoices and parts orders
        </p>
      </div>
      <div class="flex gap-3">
        <button
          @click="initializeDefaults"
          :disabled="settingsStore.loading"
          class="inline-flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-200 transition-all disabled:opacity-50"
        >
          {{ settingsStore.loading ? 'Initializing...' : 'Initialize Defaults' }}
        </button>
        <button
          @click="refreshAll"
          :disabled="settingsStore.loading"
          class="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-dark-border px-4 py-2 text-center text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
        >
          {{ settingsStore.loading ? 'Refreshing...' : 'Refresh All' }}
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="settingsStore.error" class="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-600 dark:bg-red-900">
      <div class="flex">
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
            Error
          </h3>
          <div class="mt-2 text-sm text-red-700 dark:text-red-300">
            {{ settingsStore.error }}
          </div>
          <div class="mt-4">
            <button
              @click="settingsStore.clearError"
              class="text-sm bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Last Updated Info -->
    <div v-if="settingsStore.lastUpdated" class="mb-6 text-sm text-slate-400 dark:text-slate-500">
      Last updated: {{ formatDate(settingsStore.lastUpdated) }}
    </div>

    <!-- Loading State -->
    <div v-if="settingsStore.loading && !settingsStore.numberingSequences.length" class="flex justify-center items-center p-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
    </div>

    <!-- Module Cards Grid -->
    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <!-- Card for each module -->
      <DefaultCard
        v-for="module in availableModules"
        :key="module"
        :cardTitle="getModuleDisplayName(module)"
      >
        <template #header-right>
          <div class="flex items-center">
            <span v-if="getSequence(module)?.isActive" class="text-xs text-green-600 dark:text-green-400 mr-2">
              Active
            </span>
            <span v-else class="text-xs text-red-600 dark:text-red-400 mr-2">
              Inactive
            </span>
            <button
              @click="toggleModuleStatus(module)"
              :disabled="isSaving(module)"
              class="text-xs px-2 py-1 rounded transition-colors"
              :class="{
                'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300': getSequence(module)?.isActive,
                'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300': !getSequence(module)?.isActive
              }"
            >
              {{ getSequence(module)?.isActive ? 'Disable' : 'Enable' }}
            </button>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Status indicator -->
          <div class="text-center p-3 rounded-lg transition-colors"
               :class="{
                 'bg-green-50 border border-green-200 dark:bg-green-900 dark:border-green-700': getSequence(module)?.isActive,
                 'bg-slate-50 border border-slate-200 dark:bg-white/5 dark:border-dark-border': !getSequence(module)?.isActive
               }">
            <div class="text-sm font-medium"
                 :class="{
                   'text-green-800 dark:text-green-200': getSequence(module)?.isActive,
                   'text-slate-400 dark:text-slate-500': !getSequence(module)?.isActive
                 }">
              Current: {{ getCurrentNumber(module) }}
            </div>
            <div class="text-xs mt-1"
                 :class="{
                   'text-green-600 dark:text-green-300': getSequence(module)?.isActive,
                   'text-slate-400 dark:text-slate-500': !getSequence(module)?.isActive
                 }">
              Next: {{ getNextNumberPreview(module) }}
            </div>
          </div>

          <!-- Configuration Form -->
          <div class="space-y-3" :class="{ 'opacity-50': !getSequence(module)?.isActive }">
            <!-- Prefix -->
            <div>
              <label class="block text-sm font-medium text-slate-800 dark:text-slate-100 mb-1">
                Prefix
              </label>
              <input
                type="text"
                v-model="localSequences[module].prefix"
                :disabled="!getSequence(module)?.isActive || isSaving(module)"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-black focus:border-brand-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 dark:border-dark-border dark:bg-dark-surface dark:text-white dark:disabled:bg-white/5"
                placeholder="e.g., INV-"
                @input="markAsChanged(module)"
              />
            </div>

            <!-- Current Number -->
            <div>
              <label class="block text-sm font-medium text-slate-800 dark:text-slate-100 mb-1">
                Current Number
              </label>
              <input
                type="number"
                v-model.number="localSequences[module].currentNumber"
                :disabled="!getSequence(module)?.isActive || isSaving(module)"
                min="0"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-black focus:border-brand-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 dark:border-dark-border dark:bg-dark-surface dark:text-white dark:disabled:bg-white/5"
                @input="markAsChanged(module)"
              />
            </div>

            <!-- Padding Length -->
            <div>
              <label class="block text-sm font-medium text-slate-800 dark:text-slate-100 mb-1">
                Number Length
              </label>
              <select
                v-model.number="localSequences[module].paddingLength"
                :disabled="!getSequence(module)?.isActive || isSaving(module)"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-black focus:border-brand-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 dark:border-dark-border dark:bg-dark-surface dark:text-white dark:disabled:bg-white/5"
                @change="markAsChanged(module)"
              >
                <option value="3">3 digits (001)</option>
                <option value="4">4 digits (0001)</option>
                <option value="5">5 digits (00001)</option>
                <option value="6">6 digits (000001)</option>
                <option value="7">7 digits (0000001)</option>
              </select>
            </div>

            <!-- Include Year -->
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-slate-800 dark:text-slate-100">
                Include Year
              </label>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localSequences[module].includeYear"
                  :disabled="!getSequence(module)?.isActive || isSaving(module)"
                  class="sr-only peer"
                  @change="markAsChanged(module)"
                />
                <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>

            <!-- Include Month (only shown when year is enabled) -->
            <div v-if="localSequences[module].includeYear" class="flex items-center justify-between">
              <label class="text-sm font-medium text-slate-800 dark:text-slate-100">
                Include Month
              </label>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="localSequences[module].includeMonth"
                  :disabled="!getSequence(module)?.isActive || isSaving(module)"
                  class="sr-only peer"
                  @change="markAsChanged(module)"
                />
                <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2 pt-2">
            <button
              @click="saveSequence(module)"
              :disabled="!hasChanges(module) || isSaving(module) || !getSequence(module)?.isActive"
              class="flex-1 inline-flex items-center justify-center rounded-lg bg-brand-500 px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-600 transition-all disabled:opacity-50 transition-opacity"
            >
              {{ isSaving(module) ? 'Saving...' : 'Save' }}
            </button>
            <button
              @click="resetSequence(module)"
              :disabled="isSaving(module) || !getSequence(module)?.isActive"
              class="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900 transition-colors"
            >
              Reset
            </button>
          </div>

          <!-- Changed indicator -->
          <div v-if="hasChanges(module)" class="text-xs text-amber-600 dark:text-amber-400 text-center">
            * Unsaved changes
          </div>
        </div>
      </DefaultCard>
    </div>

    <!-- Help Text -->
    <div class="mt-8 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900">
      <div class="flex">
        <div class="ml-3">
          <h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Important Notes
          </h3>
          <div class="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <ul class="list-disc space-y-1 pl-5">
              <li>Each module can be configured independently</li>
              <li>Changing the current number will affect the next generated document number</li>
              <li>Disabling a sequence will prevent new documents of that type from being created</li>
              <li>The prefix should be unique across all modules to avoid conflicts</li>
              <li>Number length determines how many digits will be padded with zeros</li>
              <li>When "Include Year" is enabled, the year is added to the number (e.g., INV-2026-00001) and the counter resets automatically each year</li>
              <li>When "Include Month" is also enabled, the month is included (e.g., INV-2026-01-00001)</li>
              <li>Reset will set the current number back to 0</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings.store'
import { showConfirmDialog, showSuccessAlert, showErrorAlert } from '@/utils/alert'
import { NumberingModule, NumberingModuleLabels } from '@/types/generated/enums/numbering-module'
import DefaultCard from '@/components/Ui/DefaultCard.vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'

const settingsStore = useSettingsStore()


// Local state for form data
const defaultLocal = () => ({ prefix: '', currentNumber: 0, paddingLength: 5, includeYear: false, includeMonth: false })
const localSequences = reactive<Record<NumberingModule, any>>(
  Object.fromEntries(Object.values(NumberingModule).map((m) => [m, defaultLocal()])) as Record<NumberingModule, any>,
)

// Track changes and saving state for each module
const changedModules = ref<Set<NumberingModule>>(new Set())
const savingModules = ref<Set<NumberingModule>>(new Set())

const availableModules = computed(() => Object.values(NumberingModule))

onMounted(async () => {
  await loadSequences()
})

const loadSequences = async () => {
  try {
    await settingsStore.fetchNumberingSequences()
    syncLocalSequences()
  } catch (error) {
    console.error('Error loading sequences:', error)
    showErrorAlert('Failed to load numbering sequences')
  }
}

const syncLocalSequences = () => {
  // Sync store data to local form data
  availableModules.value.forEach(module => {
    const sequence = settingsStore.getSequenceByModule(module as NumberingModule)
    if (sequence) {
      localSequences[module] = {
        prefix: sequence.prefix,
        currentNumber: sequence.currentNumber,
        paddingLength: sequence.paddingLength,
        includeYear: sequence.includeYear ?? false,
        includeMonth: sequence.includeMonth ?? false,
      }
    }
  })
  // Clear all changed flags
  changedModules.value.clear()
}

const getSequence = (module: NumberingModule) => {
  return settingsStore.getSequenceByModule(module as NumberingModule)
}

const formatNumber = (prefix: string, num: number, padding: number, includeYear: boolean, includeMonth: boolean): string => {
  const paddedNumber = num.toString().padStart(padding, '0')
  if (includeYear) {
    const year = new Date().getFullYear()
    if (includeMonth) {
      const month = String(new Date().getMonth() + 1).padStart(2, '0')
      return `${prefix}${year}-${month}-${paddedNumber}`
    }
    return `${prefix}${year}-${paddedNumber}`
  }
  return `${prefix}${paddedNumber}`
}

const getCurrentNumber = (module: NumberingModule): string => {
  const sequence = getSequence(module)
  if (!sequence || !sequence.isActive) return 'Not configured'
  return formatNumber(sequence.prefix, sequence.currentNumber, sequence.paddingLength, sequence.includeYear, sequence.includeMonth)
}

const getNextNumberPreview = (module: NumberingModule): string => {
  const sequence = getSequence(module)
  if (!sequence || !sequence.isActive) return 'Disabled'
  const local = localSequences[module]
  return formatNumber(local.prefix, sequence.currentNumber + 1, local.paddingLength, local.includeYear, local.includeMonth)
}

const getModuleDisplayName = (module: NumberingModule): string => {
  const label = NumberingModuleLabels[module] || module
  return label.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
}

const markAsChanged = (module: NumberingModule) => {
  changedModules.value.add(module)
}

const hasChanges = (module: NumberingModule) => {
  return changedModules.value.has(module)
}

const isSaving = (module: NumberingModule) => {
  return savingModules.value.has(module)
}

const saveSequence = async (module: NumberingModule) => {
  try {
    savingModules.value.add(module)

    await settingsStore.updateNumberingSequence(module as NumberingModule, localSequences[module])

    changedModules.value.delete(module)
    showSuccessAlert(`${getModuleDisplayName(module)} numbering updated successfully`)
  } catch (error) {
    console.error(`Error saving sequence for ${module}:`, error)
    showErrorAlert(`Failed to update ${getModuleDisplayName(module)} numbering`)
  } finally {
    savingModules.value.delete(module)
  }
}

const resetSequence = async (module: NumberingModule) => {
  const result = await showConfirmDialog(
    `This will reset the ${getModuleDisplayName(module)} numbering sequence. The current number will be set back to 0.`,
    false,
    'Yes, Reset',
    'Cancel'
  )
  if (!result.isConfirmed) return

  try {
    savingModules.value.add(module)

    await settingsStore.resetNumberingSequence(module as NumberingModule, 0)
    syncLocalSequences()

    showSuccessAlert(`${getModuleDisplayName(module)} numbering sequence reset`)
  } catch (error) {
    console.error(`Error resetting sequence for ${module}:`, error)
    showErrorAlert(`Failed to reset ${getModuleDisplayName(module)} numbering`)
  } finally {
    savingModules.value.delete(module)
  }
}

const toggleModuleStatus = async (module: NumberingModule) => {
  const currentSequence = getSequence(module)
  const newStatus = !currentSequence?.isActive
  const action = newStatus ? 'enable' : 'disable'

  const result = await showConfirmDialog(
    `Do you want to ${action} numbering for ${getModuleDisplayName(module)}?`,
    false,
    `Yes, ${action.charAt(0).toUpperCase() + action.slice(1)}`,
    'Cancel'
  )
  if (!result.isConfirmed) return

  try {
    savingModules.value.add(module)

    await settingsStore.updateNumberingSequence(module as NumberingModule, { isActive: newStatus })

    showSuccessAlert(`${getModuleDisplayName(module)} numbering ${newStatus ? 'enabled' : 'disabled'}`)
  } catch (error) {
    console.error(`Error toggling status for ${module}:`, error)
    showErrorAlert(`Failed to toggle ${getModuleDisplayName(module)} status`)
  } finally {
    savingModules.value.delete(module)
  }
}

const initializeDefaults = async () => {
  const result = await showConfirmDialog(
    'This will initialize default numbering sequences for all modules. Any existing sequences will not be affected.',
    false,
    'Yes, Initialize',
    'Cancel'
  )
  if (!result.isConfirmed) return

  try {
    await settingsStore.initializeDefaultSequences()
    syncLocalSequences()
    showSuccessAlert('Default numbering sequences initialized')
  } catch (error) {
    console.error('Error initializing defaults:', error)
    showErrorAlert('Failed to initialize default sequences')
  }
}

const refreshAll = async () => {
  await loadSequences()
  showSuccessAlert('Numbering sequences refreshed')
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<style scoped>

.bg-slate-500 {
  background-color: #dc3545;
}

</style>