<template>
  <DefaultLayout>
    <div>
      <router-link
        to="/admin/settings"
        class="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft class="w-4 h-4" /> Back to Settings
      </router-link>

      <!-- Page Header -->
      <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">
            Notification Templates
          </h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customer emails and internal alerts — edit the wording your clients receive
          </p>
        </div>
        <div class="flex gap-3">
          <button
            @click="seedDefaults"
            :disabled="store.saving"
            class="inline-flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-200 transition-all disabled:opacity-50"
          >
            {{ store.saving ? 'Initializing...' : 'Initialize Defaults' }}
          </button>
          <button
            @click="loadTemplates"
            :disabled="store.loading"
            class="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-medium text-black hover:bg-slate-100 dark:border-dark-border dark:text-white dark:hover:bg-white/10 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <!-- Error -->
      <div
        v-if="store.error"
        class="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-600 dark:bg-red-900"
      >
        <div class="flex items-center justify-between">
          <p class="text-sm text-red-700 dark:text-red-300">{{ store.error }}</p>
          <button
            @click="store.clearError"
            class="text-sm bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded dark:bg-red-800 dark:text-red-200"
          >
            Dismiss
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.loading && !store.templates.length" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!store.loading && !store.templates.length"
        class="card p-10 text-center"
      >
        <svg class="mx-auto mb-4 h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 class="mb-2 text-lg font-medium text-slate-800 dark:text-slate-100">
          No email templates configured
        </h3>
        <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Click "Initialize Defaults" to create the default email templates
        </p>
        <button
          @click="seedDefaults"
          :disabled="store.saving"
          class="inline-flex items-center justify-center rounded-lg bg-brand-500 px-6 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-600 transition-all"
        >
          Initialize Defaults
        </button>
      </div>

      <!-- Template Cards -->
      <div v-else class="space-y-4">
        <!-- Category group headers -->
        <template v-for="(group, category) in groupedTemplates" :key="category">
          <div>
            <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {{ category }}
            </h3>
            <div class="grid gap-3">
              <div
                v-for="template in group"
                :key="template.id"
                class="card p-0"
              >
                <div class="flex items-center justify-between px-6 py-4">
                  <!-- Left: Icon + Info -->
                  <div class="flex items-center gap-4">
                    <div
                      class="flex h-11 w-11 items-center justify-center rounded-full flex-shrink-0"
                      :class="getTemplateIconBg(template.category)"
                    >
                      <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 class="font-semibold text-slate-800 dark:text-slate-100">
                        {{ template.name }}
                      </h4>
                      <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Subject: {{ template.emailSubject || 'Not configured' }}
                      </p>
                    </div>
                  </div>

                  <!-- Right: Badges + Actions -->
                  <div class="flex items-center gap-3">
                    <span
                      class="inline-flex rounded-full px-3 py-1 text-xs font-medium"
                      :class="template.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'"
                    >
                      {{ template.isActive ? 'Active' : 'Inactive' }}
                    </span>
                    <span
                      v-if="template.isSystem"
                      class="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                    >
                      System
                    </span>
                    <button
                      @click="openPreview(template)"
                      class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:border-dark-border dark:text-slate-400 dark:hover:bg-white/10"
                    >
                      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Preview
                    </button>
                    <button
                      @click="openEdit(template)"
                      class="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-all"
                    >
                      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Edit Slider -->
    <GeneralSliderPanel
      v-model="showEditSlider"
      :title="'Edit Template'"
      :subtitle="editingTemplate?.name || ''"
      size="xl"
    >
      <div v-if="editingTemplate" class="space-y-5">
        <!-- Subject -->
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100">
            Email Subject
          </label>
          <input
            v-model="editForm.emailSubject"
            type="text"
            class="w-full rounded border border-slate-200 bg-transparent px-4 py-2.5 font-medium outline-none transition focus:border-brand-500 dark:border-dark-border dark:bg-dark-surface dark:focus:border-brand-500"
            placeholder="Enter email subject..."
          />
        </div>

        <!-- Available Variables -->
        <div v-if="editingTemplate.availableVariables?.length">
          <label class="mb-2 block text-sm font-medium text-slate-500 dark:text-slate-400">
            Available Variables (click to copy)
          </label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="variable in editingTemplate.availableVariables"
              :key="variable"
              @click="copyVariable(variable)"
              class="inline-flex rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700 hover:bg-brand-500 hover:text-white transition-colors dark:bg-white/5 dark:text-slate-300 dark:hover:bg-brand-500"
            >
              {{ formatVariable(variable) }}
            </button>
          </div>
        </div>

        <!-- Email Body -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-slate-800 dark:text-slate-100">
              Email Body
            </label>
            <div class="flex rounded-lg border border-slate-200 dark:border-dark-border overflow-hidden">
              <button
                @click="editMode = 'visual'"
                class="px-3 py-1 text-xs font-medium transition-colors"
                :class="editMode === 'visual'
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-white/5 dark:text-slate-400'"
              >
                Visual
              </button>
              <button
                @click="editMode = 'html'"
                class="px-3 py-1 text-xs font-medium transition-colors border-l border-slate-200 dark:border-dark-border"
                :class="editMode === 'html'
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-white/5 dark:text-slate-400'"
              >
                HTML
              </button>
            </div>
          </div>

          <!-- Visual Editor -->
          <RichTextEditor
            v-if="editMode === 'visual'"
            v-model="editForm.emailBody"
            minHeight="300px"
            placeholder="Write your email content..."
          />

          <!-- HTML Source Editor -->
          <textarea
            v-else
            v-model="editForm.emailBody"
            rows="20"
            class="w-full rounded border border-slate-200 bg-transparent px-4 py-3 font-mono text-sm outline-none transition focus:border-brand-500 dark:border-dark-border dark:bg-dark-surface dark:focus:border-brand-500"
            placeholder="Enter email body HTML..."
          />
        </div>

        <!-- Active Toggle -->
        <div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              v-model="editForm.isActive"
              class="h-4 w-4 rounded border-slate-200"
            />
            <span class="text-sm text-slate-500 dark:text-slate-400">Active</span>
          </label>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <button
            @click="openPreview(editingTemplate!)"
            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:border-dark-border dark:text-slate-400 dark:hover:bg-white/10"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
          <div class="flex gap-3">
            <button
              @click="showEditSlider = false"
              class="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:border-dark-border dark:text-slate-400 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              @click="saveTemplate"
              :disabled="store.saving"
              class="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-all disabled:opacity-50"
            >
              {{ store.saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </template>
    </GeneralSliderPanel>

    <!-- Preview Slider -->
    <GeneralSliderPanel
      v-model="showPreviewSlider"
      :title="'Email Preview'"
      :subtitle="previewingTemplate?.name || ''"
      size="xl"
      noPadding
    >
      <div v-if="previewingTemplate" class="flex flex-col h-full">
        <!-- Subject Bar -->
        <div class="border-b border-slate-200 dark:border-dark-border px-6 py-3 bg-slate-50 dark:bg-white/5 flex-shrink-0">
          <div class="flex items-center gap-2 text-sm">
            <span class="font-medium text-slate-400 dark:text-slate-500">Subject:</span>
            <span class="text-slate-800 dark:text-slate-100">{{ previewSubject }}</span>
          </div>
        </div>
        <!-- Email Body Preview -->
        <div class="flex-1 overflow-auto">
          <iframe
            ref="previewIframe"
            class="w-full h-full border-0"
            sandbox="allow-same-origin"
            :srcdoc="previewBody"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <p class="text-xs text-slate-400 dark:text-slate-500">
            Preview of the email template with placeholder variables
          </p>
          <button
            @click="openEditFromPreview"
            class="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-all"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Template
          </button>
        </div>
      </template>
    </GeneralSliderPanel>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import GeneralSliderPanel from '@/components/Ui/GeneralSliderPanel.vue'
import RichTextEditor from '@/components/Ui/RichTextEditor.vue'
import { useNotificationTemplateStore } from '@/stores/notification-template.store'
import { ToastService } from '@/services/toast.service'
import type { NotificationTemplateDto } from '@/api/notification-template.api'

const store = useNotificationTemplateStore()

// Edit slider state
const editMode = ref<'visual' | 'html'>('visual')
const showEditSlider = ref(false)
const editingTemplate = ref<NotificationTemplateDto | null>(null)
const editForm = reactive({
  emailSubject: '',
  emailBody: '',
  isActive: true,
})

// Preview slider state
const showPreviewSlider = ref(false)
const previewingTemplate = ref<NotificationTemplateDto | null>(null)
const previewIframe = ref<HTMLIFrameElement | null>(null)

const groupedTemplates = computed(() => {
  const groups: Record<string, NotificationTemplateDto[]> = {}
  for (const t of store.templates) {
    const key = t.category
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }
  return groups
})

const previewSubject = computed(() => {
  if (editingTemplate.value?.id === previewingTemplate.value?.id && showEditSlider.value) {
    return editForm.emailSubject || 'No subject'
  }
  return previewingTemplate.value?.emailSubject || 'No subject'
})

const previewBody = computed(() => {
  if (editingTemplate.value?.id === previewingTemplate.value?.id && showEditSlider.value) {
    return editForm.emailBody || '<p style="padding:20px;color:#666;">No email body configured</p>'
  }
  return previewingTemplate.value?.emailBody || '<p style="padding:20px;color:#666;">No email body configured</p>'
})

onMounted(async () => {
  await loadTemplates()
})

async function loadTemplates() {
  try {
    await store.fetchAll()
  } catch {
    // error in store
  }
}

async function seedDefaults() {
  try {
    const result = await store.seedDefaults()
    ToastService.success(result.message || 'Default templates initialized')
  } catch {
    ToastService.error(store.error || 'Failed to initialize defaults')
  }
}

function openEdit(template: NotificationTemplateDto) {
  editingTemplate.value = template
  editForm.emailSubject = template.emailSubject || ''
  editForm.emailBody = template.emailBody || ''
  editForm.isActive = template.isActive
  editMode.value = 'visual'
  showEditSlider.value = true
}

function openPreview(template: NotificationTemplateDto) {
  previewingTemplate.value = template
  showPreviewSlider.value = true
}

function openEditFromPreview() {
  if (previewingTemplate.value) {
    showPreviewSlider.value = false
    openEdit(previewingTemplate.value)
  }
}

async function saveTemplate() {
  if (!editingTemplate.value) return
  try {
    await store.update(editingTemplate.value.id, {
      emailSubject: editForm.emailSubject,
      emailBody: editForm.emailBody,
      isActive: editForm.isActive,
    })
    ToastService.success('Template saved successfully')
    showEditSlider.value = false
  } catch {
    ToastService.error(store.error || 'Failed to save template')
  }
}

function formatVariable(variable: string): string {
  return '{{' + variable + '}}'
}

function copyVariable(variable: string) {
  const text = formatVariable(variable)
  navigator.clipboard.writeText(text)
  ToastService.success('Copied ' + text + ' to clipboard')
}

function getTemplateIconBg(category: string): string {
  switch (category) {
    case 'finance':
      return 'bg-brand-500'
    case 'system':
      return 'bg-green-600'
    default:
      return 'bg-brand-500'
  }
}
</script>
