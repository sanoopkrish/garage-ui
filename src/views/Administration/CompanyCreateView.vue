<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, ArrowLeft, Copy } from 'lucide-vue-next'
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

const router = useRouter()
const store = useCompaniesStore()

// ── Wizard state ──────────────────────────────────────────────────────────────
const step = ref(0)
const steps = [
  { title: 'Basic Info',   desc: 'Name & subdomain' },
  { title: 'Admin User',  desc: 'Company administrator' },
  { title: 'Contact',     desc: 'Address & contact' },
  { title: 'Modules',     desc: 'Enable features' },
]

// ── Credentials dialog ────────────────────────────────────────────────────────
const showCredentials = ref(false)
const copied = ref(false)
const credentials = reactive({ company: '', url: '', email: '', password: '' })

// ── Form ──────────────────────────────────────────────────────────────────────
const autoPassword = ref(true)
const seedMasterData = ref(true)
const subdomainChecking = ref(false)
const subdomainAvailable = ref<boolean | null>(null)
let subdomainTimer: ReturnType<typeof setTimeout>

const form = reactive({
  name: '',
  subdomain: '',
  description: '',
  website: '',
  companyAddress: '',
  companyEmail: '',
  companyPhone: '',
  adminUser: { email: '', firstName: '', lastName: '', phoneNumber: '', gender: '', password: '' },
  moduleConfiguration: { enabledModules: JSON.parse(JSON.stringify(getDefaultEnabledModules())) as EnabledModules },
})

const errors = reactive({
  name: '', subdomain: '', companyEmail: '',
  adminEmail: '', adminFirstName: '', adminLastName: '', adminPhone: '', adminGender: '', adminPassword: '',
})

// ── Subdomain ─────────────────────────────────────────────────────────────────
function onSubdomainInput() {
  form.subdomain = form.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')
  subdomainAvailable.value = null
  clearTimeout(subdomainTimer)
  if (form.subdomain.length >= 3) {
    subdomainChecking.value = true
    subdomainTimer = setTimeout(async () => {
      try { subdomainAvailable.value = await store.checkSubdomain(form.subdomain) }
      finally { subdomainChecking.value = false }
    }, 500)
  }
}

// ── Module config ─────────────────────────────────────────────────────────────
function isModuleEnabled(key: string) {
  return form.moduleConfiguration.enabledModules[key as ModuleKey]?.enabled ?? false
}
function isSubEnabled(mod: string, sub: string) {
  return form.moduleConfiguration.enabledModules[mod as ModuleKey]?.submodules?.[sub] ?? false
}
function toggleModule(key: string) {
  const k = key as ModuleKey
  const cfg = form.moduleConfiguration.enabledModules
  if (!cfg[k]) cfg[k] = { enabled: false, submodules: {} }
  cfg[k]!.enabled = !cfg[k]!.enabled
}
function toggleSubmodule(mod: string, sub: string) {
  const k = mod as ModuleKey
  const cfg = form.moduleConfiguration.enabledModules[k]
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

// ── Validation ────────────────────────────────────────────────────────────────
function clearErrors() {
  Object.keys(errors).forEach(k => { (errors as any)[k] = '' })
}

function validateStep(s: number): boolean {
  clearErrors()
  if (s === 0) {
    if (!form.name.trim()) { errors.name = 'Company name is required'; return false }
    if (!form.subdomain.trim()) { errors.subdomain = 'Subdomain is required'; return false }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(form.subdomain)) {
      errors.subdomain = 'Lowercase letters, numbers and hyphens only'; return false
    }
    if (subdomainAvailable.value === false) { errors.subdomain = 'Subdomain already taken'; return false }
  }
  if (s === 1) {
    let ok = true
    if (!form.adminUser.email.trim()) { errors.adminEmail = 'Required'; ok = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminUser.email)) { errors.adminEmail = 'Invalid email'; ok = false }
    if (!form.adminUser.firstName.trim()) { errors.adminFirstName = 'Required'; ok = false }
    if (!form.adminUser.lastName.trim()) { errors.adminLastName = 'Required'; ok = false }
    if (!form.adminUser.phoneNumber.trim()) { errors.adminPhone = 'Required'; ok = false }
    if (!form.adminUser.gender) { errors.adminGender = 'Required'; ok = false }
    if (!autoPassword.value && form.adminUser.password.length < 8) {
      errors.adminPassword = 'Minimum 8 characters'; ok = false
    }
    return ok
  }
  if (s === 2 && form.companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.companyEmail)) {
    errors.companyEmail = 'Invalid email'; return false
  }
  return true
}

const canNext = computed(() => validateStep(step.value))

function next() {
  if (!validateStep(step.value)) return
  step.value++
}
function back() { step.value-- }

// ── Submit ────────────────────────────────────────────────────────────────────
const saving = ref(false)

async function submit() {
  if (!validateStep(step.value)) return
  saving.value = true
  try {
    const payload: any = {
      name: form.name,
      subdomain: form.subdomain,
      description: form.description || undefined,
      website: form.website || undefined,
      companyAddress: form.companyAddress || undefined,
      companyEmail: form.companyEmail || undefined,
      companyPhone: form.companyPhone || undefined,
      moduleConfiguration: form.moduleConfiguration,
      seedMasterData: seedMasterData.value,
      adminUser: {
        email: form.adminUser.email,
        firstName: form.adminUser.firstName,
        lastName: form.adminUser.lastName,
        phoneNumber: form.adminUser.phoneNumber,
        gender: form.adminUser.gender,
        ...(autoPassword.value ? {} : { password: form.adminUser.password }),
      },
    }
    const result = await store.createNewCompany(payload)
    if (result?.adminCredentials) {
      credentials.company = form.name
      credentials.url = result.adminCredentials.loginUrl
      credentials.email = result.adminCredentials.email
      credentials.password = result.adminCredentials.password
      showCredentials.value = true
    } else {
      ToastService.success('Company created')
      router.push('/admin/companies')
    }
  } catch (err: any) {
    ToastService.error(err.response?.data?.message || 'Failed to create company')
  } finally {
    saving.value = false
  }
}

async function copyCredentials() {
  const text = `Company: ${credentials.company}\nURL: ${credentials.url}\nEmail: ${credentials.email}\nPassword: ${credentials.password}`
  await navigator.clipboard.writeText(text).catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <DefaultLayout>
    <div class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <button @click="router.push('/admin/companies')" class="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors">
          <ArrowLeft class="w-4 h-4" />
          Back to Companies
        </button>
        <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Create New Company</h1>
        <p class="text-sm text-slate-500 mt-0.5">Set up a new garage client company</p>
      </div>

      <!-- Stepper -->
      <div class="flex items-center mb-8">
        <template v-for="(s, i) in steps" :key="i">
          <div class="flex items-center gap-2">
            <div
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                i < step ? 'bg-brand-500 text-white' :
                i === step ? 'bg-brand-500 text-white ring-4 ring-brand-100 dark:ring-brand-900' :
                'bg-slate-100 dark:bg-dark-surface text-slate-400'
              ]"
            >
              <CheckCircle v-if="i < step" class="w-4 h-4" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <div v-if="!$attrs.class" class="hidden sm:block">
              <p :class="['text-sm font-medium', i === step ? 'text-brand-500' : 'text-slate-500']">{{ s.title }}</p>
            </div>
          </div>
          <div v-if="i < steps.length - 1" class="flex-1 h-px bg-slate-200 dark:bg-dark-border mx-3" />
        </template>
      </div>

      <!-- Step content -->
      <div class="rounded-xl border border-slate-100 dark:border-dark-border bg-white dark:bg-dark-surface p-6">

        <!-- Step 0: Basic Info -->
        <div v-if="step === 0" class="space-y-5">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Basic Information</h2>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Name <span class="text-red-500">*</span></label>
              <UiInput v-model="form.name" placeholder="My Garage Ltd" :error="errors.name" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subdomain <span class="text-red-500">*</span></label>
              <div class="flex">
                <input
                  v-model="form.subdomain"
                  @input="onSubdomainInput"
                  placeholder="my-garage"
                  :class="['flex-1 rounded-l-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:bg-dark-surface dark:text-slate-100', errors.subdomain ? 'border-red-400' : 'border-slate-200 dark:border-dark-border']"
                />
                <span class="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-hover text-xs text-slate-500">.app.com</span>
              </div>
              <p v-if="errors.subdomain" class="text-xs text-red-500 mt-1">{{ errors.subdomain }}</p>
              <p v-else-if="subdomainChecking" class="text-xs text-slate-400 mt-1">Checking…</p>
              <p v-else-if="subdomainAvailable === true" class="text-xs text-green-600 mt-1">Available</p>
              <p v-else-if="subdomainAvailable === false" class="text-xs text-red-500 mt-1">Already taken</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Brief description"
              class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-slate-100"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website</label>
            <UiInput v-model="form.website" placeholder="https://www.mygarage.com" type="url" />
          </div>
        </div>

        <!-- Step 1: Admin User -->
        <div v-else-if="step === 1" class="space-y-5">
          <div>
            <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Admin User</h2>
            <p class="text-sm text-slate-500 mt-0.5">This user will have full access to the new company.</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email <span class="text-red-500">*</span></label>
              <UiInput v-model="form.adminUser.email" type="email" placeholder="admin@company.com" :error="errors.adminEmail" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone <span class="text-red-500">*</span></label>
              <UiInput v-model="form.adminUser.phoneNumber" type="tel" placeholder="+44 7700 900000" :error="errors.adminPhone" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name <span class="text-red-500">*</span></label>
              <UiInput v-model="form.adminUser.firstName" placeholder="First name" :error="errors.adminFirstName" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name <span class="text-red-500">*</span></label>
              <UiInput v-model="form.adminUser.lastName" placeholder="Last name" :error="errors.adminLastName" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gender <span class="text-red-500">*</span></label>
              <select
                v-model="form.adminUser.gender"
                :class="['w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:bg-dark-surface dark:text-slate-100', errors.adminGender ? 'border-red-400' : 'border-slate-200 dark:border-dark-border']"
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="UNSPECIFIED">Prefer not to say</option>
              </select>
              <p v-if="errors.adminGender" class="text-xs text-red-500 mt-1">{{ errors.adminGender }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <label class="flex items-center gap-2 mb-2 cursor-pointer">
                <input type="checkbox" v-model="autoPassword" class="rounded" />
                <span class="text-sm text-slate-600 dark:text-slate-400">Auto-generate password</span>
              </label>
              <UiInput
                v-if="!autoPassword"
                v-model="form.adminUser.password"
                type="password"
                placeholder="Min 8 characters"
                :error="errors.adminPassword"
              />
              <p v-else class="text-xs text-slate-400">A secure password will be shown after creation.</p>
            </div>
          </div>
        </div>

        <!-- Step 2: Contact -->
        <div v-else-if="step === 2" class="space-y-5">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Contact Details</h2>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
            <textarea
              v-model="form.companyAddress"
              rows="3"
              placeholder="Full company address"
              class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-slate-100"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <UiInput v-model="form.companyEmail" type="email" placeholder="contact@company.com" :error="errors.companyEmail" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
              <UiInput v-model="form.companyPhone" type="tel" placeholder="+44 1234 567890" />
            </div>
          </div>
        </div>

        <!-- Step 3: Modules -->
        <div v-else-if="step === 3" class="space-y-5">
          <div>
            <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Module Configuration</h2>
            <p class="text-sm text-slate-500 mt-0.5">Select which modules to enable. You can change this later.</p>
          </div>

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

          <!-- Seed master data -->
          <label class="flex items-start gap-3 p-4 rounded-lg border border-slate-100 dark:border-dark-border cursor-pointer">
            <input type="checkbox" v-model="seedMasterData" class="mt-0.5 rounded" />
            <div>
              <p class="text-sm font-medium text-slate-800 dark:text-slate-100">Seed default master data</p>
              <p class="text-xs text-slate-500 mt-0.5">Creates default departments, job titles, employment types and employee roles. Can be done later from the company page.</p>
            </div>
          </label>
        </div>

        <!-- Nav buttons -->
        <div class="flex items-center justify-between mt-6 pt-5 border-t border-slate-100 dark:border-dark-border">
          <UiButton v-if="step > 0" variant="secondary" @click="back">
            <ChevronLeft class="w-4 h-4 mr-1" />
            Previous
          </UiButton>
          <div v-else />

          <div class="flex gap-3">
            <UiButton variant="secondary" @click="router.push('/admin/companies')">Cancel</UiButton>
            <UiButton v-if="step < steps.length - 1" :disabled="!canNext" @click="next">
              Next
              <ChevronRight class="w-4 h-4 ml-1" />
            </UiButton>
            <UiButton v-else :disabled="saving" @click="submit">
              <Loader2 v-if="saving" class="w-4 h-4 mr-1 animate-spin" />
              <CheckCircle v-else class="w-4 h-4 mr-1" />
              Create Company
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Credentials dialog -->
    <Teleport to="body">
      <div v-if="showCredentials" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="bg-white dark:bg-dark-surface rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
          <div class="text-center mb-6">
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle class="w-6 h-6 text-green-600" />
            </div>
            <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Company Created</h3>
          </div>

          <div class="space-y-2 mb-4 text-sm">
            <div class="flex justify-between"><span class="text-slate-500">Company</span><span class="font-medium text-slate-800 dark:text-slate-100">{{ credentials.company }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">URL</span><span class="font-medium text-brand-500 text-xs">{{ credentials.url }}</span></div>
          </div>

          <div class="rounded-lg border border-slate-200 dark:border-dark-border p-4 mb-4 bg-slate-50 dark:bg-dark-hover space-y-2 text-sm">
            <p class="font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide mb-2">Admin Credentials</p>
            <div class="flex justify-between"><span class="text-slate-500">Email</span><span class="font-mono text-slate-800 dark:text-slate-100">{{ credentials.email }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Password</span><span class="font-mono text-slate-800 dark:text-slate-100">{{ credentials.password }}</span></div>
          </div>

          <div class="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3 mb-6 text-xs text-amber-700 dark:text-amber-400">
            Save these credentials — the password cannot be retrieved again. Admin will be prompted to change it on first login.
          </div>

          <div class="flex gap-3">
            <UiButton class="flex-1" @click="copyCredentials">
              <Copy class="w-4 h-4 mr-1" />
              {{ copied ? 'Copied!' : 'Copy' }}
            </UiButton>
            <UiButton variant="secondary" class="flex-1" @click="router.push('/admin/companies'); showCredentials = false">
              Done
            </UiButton>
          </div>
        </div>
      </div>
    </Teleport>
  </DefaultLayout>
</template>
