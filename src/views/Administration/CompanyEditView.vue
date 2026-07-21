<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { ArrowLeft, Building2, Phone, LayoutGrid, Mail, Database, Loader2 } from 'lucide-vue-next'
import EmailProviderSettings from '@/components/Settings/EmailProviderSettings.vue'
import { useCompaniesStore } from '@/stores/companies.store'
import { ToastService } from '@/services/toast.service'
import {
  CONFIGURABLE_MODULE_KEYS,
  MODULE_SUBMODULES,
  PERMISSION_LABELS,
  getDefaultEnabledModules,
  type ModuleKey,
  type EnabledModules,
} from '@/types/generated/constants/module-configuration'

const route = useRoute()
const router = useRouter()
const store = useCompaniesStore()

const activeTab = ref<'general' | 'contact' | 'modules' | 'email'>('general')
const loading = ref(true)
const saving = ref(false)
const seedingData = ref(false)

const tabs = [
  { key: 'general', label: 'General', icon: Building2 },
  { key: 'contact', label: 'Contact', icon: Phone },
  { key: 'modules', label: 'Modules', icon: LayoutGrid },
  { key: 'email', label: 'Email', icon: Mail },
]

const company = computed(() => store.currentCompany)

// ── Forms ─────────────────────────────────────────────────────────────────────
const generalForm = reactive({ name: '', description: '', website: '' })
const contactForm = reactive({ companyAddress: '', companyEmail: '', companyPhone: '' })
const moduleConfig = reactive<{ enabledModules: EnabledModules }>({
  enabledModules: JSON.parse(JSON.stringify(getDefaultEnabledModules())) as EnabledModules,
})

// ── Module helpers ────────────────────────────────────────────────────────────
function isModuleEnabled(key: string) {
  return moduleConfig.enabledModules[key as ModuleKey]?.enabled ?? false
}
function isSubEnabled(mod: string, sub: string) {
  return moduleConfig.enabledModules[mod as ModuleKey]?.submodules?.[sub] ?? false
}
function toggleModule(key: string) {
  const k = key as ModuleKey
  const cfg = moduleConfig.enabledModules
  if (!cfg[k]) cfg[k] = { enabled: false, submodules: {} }
  cfg[k]!.enabled = !cfg[k]!.enabled
}
function toggleSubmodule(mod: string, sub: string) {
  const k = mod as ModuleKey
  const cfg = moduleConfig.enabledModules[k]
  if (!cfg) return
  if (!cfg.submodules) cfg.submodules = {}
  cfg.submodules[sub] = !cfg.submodules[sub]
}

const moduleList = computed(() =>
  CONFIGURABLE_MODULE_KEYS.map(key => ({
    key,
    label: PERMISSION_LABELS[key]?.label ?? key,
    description: PERMISSION_LABELS[key]?.description ?? '',
    submodules: MODULE_SUBMODULES[key].map(sub => ({
      key: sub,
      label: PERMISSION_LABELS[sub]?.label ?? sub,
    })),
  }))
)

function populateForms(data: typeof company.value) {
  if (!data) return
  generalForm.name = data.name ?? ''
  generalForm.description = data.description ?? ''
  generalForm.website = data.website ?? ''
  contactForm.companyAddress = data.companyAddress ?? ''
  contactForm.companyEmail = data.companyEmail ?? ''
  contactForm.companyPhone = data.companyPhone ?? ''

  const savedModules = data.moduleConfiguration?.enabledModules
  const defaults = getDefaultEnabledModules()

  for (const key of CONFIGURABLE_MODULE_KEYS) {
    const saved = savedModules?.[key]
    const def = defaults[key]
    const mergedSubs: Record<string, boolean> = {}

    for (const sub of MODULE_SUBMODULES[key]) {
      mergedSubs[sub] = saved?.submodules?.[sub] ?? false
    }

    moduleConfig.enabledModules[key] = {
      enabled: saved?.enabled ?? false,
      submodules: mergedSubs,
    }
  }
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    await store.fetchCompanyDetails(route.params.id as string)
    populateForms(store.currentCompany)
  } catch {
    ToastService.error('Failed to load company')
  } finally {
    loading.value = false
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function saveGeneral() {
  if (!company.value) return
  saving.value = true
  try {
    await store.saveProfile(company.value.id, {
      name: generalForm.name,
      description: generalForm.description,
      website: generalForm.website,
    })
    ToastService.success('General info saved')
  } catch {
    ToastService.error('Failed to save')
  } finally {
    saving.value = false
  }
}

async function saveContact() {
  if (!company.value) return
  saving.value = true
  try {
    await store.saveProfile(company.value.id, {
      companyAddress: contactForm.companyAddress,
      companyEmail: contactForm.companyEmail,
      companyPhone: contactForm.companyPhone,
    })
    ToastService.success('Contact info saved')
  } catch {
    ToastService.error('Failed to save')
  } finally {
    saving.value = false
  }
}

async function saveModules() {
  if (!company.value) return
  saving.value = true
  try {
    await store.saveConfiguration(company.value.id, moduleConfig.enabledModules)
    ToastService.success('Module configuration saved')
  } catch {
    ToastService.error('Failed to save')
  } finally {
    saving.value = false
  }
}

async function seedMasterData() {
  if (!company.value) return
  if (!confirm('This will populate default master data. Existing records will not be duplicated. Continue?')) return
  seedingData.value = true
  try {
    const result = await store.seedDefaultMasterData(company.value.id)
    const created = result.departments.created + result.jobTitles.created + result.employmentTypes.created + result.employeeRoles.created
    const skipped = result.departments.skipped + result.jobTitles.skipped + result.employmentTypes.skipped + result.employeeRoles.skipped
    const msg = skipped > 0 ? `Created ${created} records. ${skipped} skipped (already exist).` : `Created ${created} records.`
    ToastService.success(msg)
  } catch {
    ToastService.error('Failed to seed master data')
  } finally {
    seedingData.value = false
  }
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<template>
  <DefaultLayout>
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <button @click="router.push('/admin/companies')" class="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors">
          <ArrowLeft class="w-4 h-4" />
          Back to Companies
        </button>
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">
              {{ company?.name ?? 'Company' }}
            </h1>
            <p class="text-sm text-slate-500 mt-0.5 font-mono">{{ company?.subdomain }}</p>
          </div>
          <UiBadge v-if="company" :variant="company.isActive ? 'done' : 'cancelled'">
            {{ company.isActive ? 'Active' : 'Inactive' }}
          </UiBadge>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <Loader2 class="w-8 h-8 animate-spin text-brand-500" />
      </div>

      <div v-else-if="company" class="rounded-xl border border-slate-100 dark:border-dark-border bg-white dark:bg-dark-surface">
        <!-- Tabs -->
        <div class="border-b border-slate-100 dark:border-dark-border px-4 flex gap-1">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key as any"
            :class="[
              'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            ]"
          >
            <component :is="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </button>
        </div>

        <div class="p-6">
          <!-- General tab -->
          <div v-show="activeTab === 'general'" class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
                <UiInput v-model="generalForm.name" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subdomain</label>
                <input
                  :value="company.subdomain"
                  disabled
                  class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                />
                <p class="text-xs text-slate-400 mt-1">Cannot be changed after creation</p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea
                v-model="generalForm.description"
                rows="2"
                class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-slate-100"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website</label>
              <UiInput v-model="generalForm.website" type="url" placeholder="https://www.company.com" />
            </div>

            <div class="flex justify-end">
              <UiButton :disabled="saving" @click="saveGeneral">
                <Loader2 v-if="saving" class="w-4 h-4 mr-1 animate-spin" />
                Save Changes
              </UiButton>
            </div>

            <!-- Seed master data -->
            <div class="border-t border-slate-100 dark:border-dark-border pt-5 flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-800 dark:text-slate-100 text-sm">Seed Default Master Data</p>
                <p class="text-xs text-slate-500 mt-0.5">Creates default departments, job titles, employment types, and employee roles. Existing records are not duplicated.</p>
              </div>
              <UiButton variant="secondary" :disabled="seedingData" @click="seedMasterData">
                <Loader2 v-if="seedingData" class="w-4 h-4 mr-1 animate-spin" />
                <Database v-else class="w-4 h-4 mr-1" />
                Seed Data
              </UiButton>
            </div>
          </div>

          <!-- Contact tab -->
          <div v-show="activeTab === 'contact'" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
              <textarea
                v-model="contactForm.companyAddress"
                rows="3"
                class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-slate-100"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <UiInput v-model="contactForm.companyEmail" type="email" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <UiInput v-model="contactForm.companyPhone" type="tel" />
              </div>
            </div>
            <div class="flex justify-end">
              <UiButton :disabled="saving" @click="saveContact">
                <Loader2 v-if="saving" class="w-4 h-4 mr-1 animate-spin" />
                Save Changes
              </UiButton>
            </div>
          </div>

          <!-- Modules tab -->
          <div v-show="activeTab === 'modules'" class="space-y-5">
            <p class="text-sm text-slate-500">Enable or disable modules for this company. Changes take effect immediately for all users of this company.</p>

            <div class="space-y-3">
              <div
                v-for="mod in moduleList"
                :key="mod.key"
                class="rounded-lg border border-slate-100 dark:border-dark-border p-4"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-slate-800 dark:text-slate-100 text-sm">{{ mod.label }}</p>
                    <p class="text-xs text-slate-500 mt-0.5">{{ mod.description }}</p>
                  </div>
                  <label class="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" :checked="isModuleEnabled(mod.key)" @change="toggleModule(mod.key)" class="peer sr-only" />
                    <div class="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-brand-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4 dark:bg-slate-700"></div>
                  </label>
                </div>
                <div v-if="isModuleEnabled(mod.key) && mod.submodules.length > 0" class="ml-4 mt-3 space-y-2 border-t border-slate-100 dark:border-dark-border pt-3">
                  <div v-for="sub in mod.submodules" :key="sub.key" class="flex items-center justify-between">
                    <span class="text-xs text-slate-600 dark:text-slate-400">{{ sub.label }}</span>
                    <label class="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" :checked="isSubEnabled(mod.key, sub.key)" @change="toggleSubmodule(mod.key, sub.key)" class="peer sr-only" />
                      <div class="h-4 w-7 rounded-full bg-slate-200 peer-checked:bg-brand-500 after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-3 dark:bg-slate-700"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end">
              <UiButton :disabled="saving" @click="saveModules">
                <Loader2 v-if="saving" class="w-4 h-4 mr-1 animate-spin" />
                Save Module Configuration
              </UiButton>
            </div>
          </div>

          <!-- Email tab -->
          <div v-if="activeTab === 'email'">
            <EmailProviderSettings :company-id="company.id" />
          </div>
        </div>
      </div>

      <!-- Not found -->
      <div v-else class="rounded-xl border border-slate-100 dark:border-dark-border bg-white dark:bg-dark-surface p-10 text-center">
        <p class="text-slate-400">Company not found</p>
        <UiButton class="mt-4" @click="router.push('/admin/companies')">Back to Companies</UiButton>
      </div>
    </div>
  </DefaultLayout>
</template>
