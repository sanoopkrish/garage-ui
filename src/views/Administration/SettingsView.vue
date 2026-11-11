<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import { Building2, CreditCard, Bell, Satellite, ShieldCheck, Clock, ShoppingCart, LayoutDashboard, Wrench } from 'lucide-vue-next'
import WorkingTimeSettings from '@/components/Settings/WorkingTimeSettings.vue'
import WorkshopSettings from '@/components/Settings/WorkshopSettings.vue'
import InvoiceAttachmentsSettings from '@/components/Settings/InvoiceAttachmentsSettings.vue'
import ProcurementSettings from '@/components/Settings/ProcurementSettings.vue'
import DashboardDefaultsSettings from '@/components/Settings/DashboardDefaultsSettings.vue'
import { useCompanyStore } from '@/stores/company.store'
import { usePermissions } from '@/composables/usePermissions'
import RamTrackingSettings from '@/components/Settings/RamTrackingSettings.vue'
import AccountingSettings from '@/components/Settings/AccountingSettings.vue'
import { ToastService } from '@/services/toast.service'
import type { UpdateCompanyDto, CompanySettings, NotificationSettings } from '@/api/company.api'

const { hasPermission: canSeeBusiness } = usePermissions('menus.administration.settings.business.read')
const { hasPermission: canSeeBilling } = usePermissions('menus.administration.settings.billing.read')
const { hasPermission: canSeeNotify } = usePermissions('menus.administration.settings.notifications.read')
const { hasPermission: canSeeIntegrations } = usePermissions('menus.administration.settings.integrations.read')
const { hasPermission: canSeeSecurity } = usePermissions('menus.administration.settings.security.read')
const { hasPermission: canSeeDashboard } = usePermissions('menus.administration.settings.dashboard.read')

const tabs = computed(() => [
  ...(canSeeBusiness.value ? [{ key: 'business', label: 'Business', icon: Building2 }] : []),
  ...(canSeeBilling.value ? [{ key: 'billing', label: 'Billing / VAT', icon: CreditCard }] : []),
  ...(canSeeBusiness.value ? [{ key: 'workshop', label: 'Workshop', icon: Wrench }] : []),
  ...(canSeeBusiness.value ? [{ key: 'working-time', label: 'Working time', icon: Clock }] : []),
  ...(canSeeBusiness.value ? [{ key: 'purchasing', label: 'Purchasing', icon: ShoppingCart }] : []),
  ...(canSeeDashboard.value ? [{ key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
  ...(canSeeNotify.value ? [{ key: 'notify', label: 'Notifications', icon: Bell }] : []),
  ...(canSeeIntegrations.value ? [{ key: 'integrations', label: 'Integrations', icon: Satellite }] : []),
  ...(canSeeSecurity.value ? [{ key: 'security', label: 'Security & Data', icon: ShieldCheck }] : []),
])

const activeTab = ref(tabs.value[0]?.key ?? 'business')

// Security & data settings local copy (§6)
const securitySettings = ref({
  passwordMinLength: 8,
  passwordRequireMixed: false,
  idleTimeoutMinutes: 0,
  retentionPhotosMonths: 0,
  retentionJobsYears: 0,
})

async function saveSecurity() {
  try {
    await companyStore.saveCompanySettings({ ...securitySettings.value })
    ToastService.success('Security settings saved')
  } catch {
    ToastService.error('Failed to save security settings')
  }
}

const companyStore = useCompanyStore()

// Business form ref — populated via watch once store loads
const biz = ref<UpdateCompanyDto>({
  name: '',
  description: '',
  website: '',
  companyAddress: '',
  companyEmail: '',
  companyPhone: '',
  companyFax: '',
  companyTaxNumber: '',
})

// Billing/regional settings local copy
const billingSettings = ref<CompanySettings>({
  currency: 'GBP',
  timezone: 'Europe/London',
  dateFormat: 'dd/MM/yyyy',
  vatRate: 20,
  paymentTermsDays: 30,
  bankName: '',
  bankSortCode: '',
  bankAccountNumber: '',
  storageChargeEnabled: false,
  storageChargePerDay: 20,
  storageChargeAfterDays: 3,
  defaultTradeCreditAmount: null,
})

// Notification settings local copy
const notifSettings = ref<NotificationSettings>({
  notificationsEnabled: false,
  internalNotificationsEnabled: false,
  emailNotificationsEnabled: false,
  smsNotificationsEnabled: false,
})

// Sync biz form from store whenever company loads
watch(
  () => companyStore.company,
  (company) => {
    if (company) {
      biz.value = {
        name: company.name ?? '',
        description: company.description ?? '',
        website: company.website ?? '',
        companyAddress: company.companyAddress ?? '',
        companyEmail: company.companyEmail ?? '',
        companyPhone: company.companyPhone ?? '',
        companyFax: company.companyFax ?? '',
        companyTaxNumber: company.companyTaxNumber ?? '',
      }
    }
  },
  { immediate: true },
)

// Sync billing/regional settings from store
watch(
  () => companyStore.companySettings,
  (settings) => {
    if (settings) {
      billingSettings.value = {
        currency: settings.currency ?? 'GBP',
        timezone: settings.timezone ?? 'Europe/London',
        dateFormat: settings.dateFormat ?? 'dd/MM/yyyy',
        vatRate: settings.vatRate ?? 20,
        paymentTermsDays: settings.paymentTermsDays ?? 30,
        bankName: settings.bankName ?? '',
        bankSortCode: settings.bankSortCode ?? '',
        bankAccountNumber: settings.bankAccountNumber ?? '',
        storageChargeEnabled: settings.storageChargeEnabled ?? false,
        storageChargePerDay: settings.storageChargePerDay ?? 20,
        storageChargeAfterDays: settings.storageChargeAfterDays ?? 3,
        defaultTradeCreditAmount: settings.defaultTradeCreditAmount ?? null,
      }
      securitySettings.value = {
        passwordMinLength: settings.passwordMinLength ?? 8,
        passwordRequireMixed: settings.passwordRequireMixed ?? false,
        idleTimeoutMinutes: settings.idleTimeoutMinutes ?? 0,
        retentionPhotosMonths: settings.retentionPhotosMonths ?? 0,
        retentionJobsYears: settings.retentionJobsYears ?? 0,
      }
    }
  },
  { immediate: true },
)

// Sync notification settings from store
watch(
  () => companyStore.notificationSettings,
  (settings) => {
    if (settings) {
      notifSettings.value = { ...settings }
    }
  },
  { immediate: true },
)

onMounted(async () => {
  await Promise.all([
    companyStore.fetchCompany(),
    companyStore.fetchCompanySettings(),
    companyStore.fetchNotificationSettings(),
  ])
})

async function saveBusiness() {
  await companyStore.saveCompany(biz.value)
  if (!companyStore.error) {
    ToastService.success('Business information saved.')
  } else {
    ToastService.error(companyStore.error)
  }
}

async function saveBilling() {
  // an emptied number input arrives as '' — the API wants null to clear the default
  const credit = billingSettings.value.defaultTradeCreditAmount as number | null | ''
  billingSettings.value.defaultTradeCreditAmount = credit === '' || credit == null ? null : Number(credit)
  await companyStore.saveCompanySettings(billingSettings.value)
  if (!companyStore.error) {
    ToastService.success('Settings saved.')
  } else {
    ToastService.error(companyStore.error)
  }
}

function toggleMasterNotifications() {
  const next = !notifSettings.value.notificationsEnabled
  notifSettings.value.notificationsEnabled = next
  if (!next) {
    notifSettings.value.internalNotificationsEnabled = false
    notifSettings.value.emailNotificationsEnabled = false
    notifSettings.value.smsNotificationsEnabled = false
  }
}

async function saveNotifications() {
  await companyStore.saveNotificationSettings(notifSettings.value)
  if (!companyStore.error) {
    ToastService.success('Notification settings saved.')
  } else {
    ToastService.error(companyStore.error)
  }
}
</script>

<template>
  <DefaultLayout>
    <div class="mb-6">
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your workshop configuration.</p>
    </div>

    <div class="flex gap-6">
      <!-- Sidebar tabs -->
      <nav class="w-48 flex-shrink-0 space-y-0.5">
        <button
          v-for="t in tabs"
          :key="t.key"
          @click="activeTab = t.key"
          :class="[
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
            activeTab === t.key
              ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10',
          ]"
        >
          <component :is="t.icon" class="w-4 h-4" />
          {{ t.label }}
        </button>
      </nav>

      <!-- Content -->
      <div class="flex-1 card">
        <!-- Business -->
        <template v-if="activeTab === 'business'">
          <div class="mb-4 -mt-1">
            <router-link to="/admin/numbering" class="text-sm text-brand-600 hover:underline">
              Configure document numbering (jobs, quotes, invoices) →
            </router-link>
          </div>
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-5">Business Information</h2>
          <div class="space-y-4 max-w-lg">
            <UiInput v-model="biz.name"            label="Business Name" />
            <UiInput v-model="biz.companyAddress"  label="Address" />
            <UiInput v-model="biz.companyPhone"    label="Phone" />
            <UiInput v-model="biz.companyEmail"    label="Email" type="email" />
            <UiInput v-model="biz.website"         label="Website" />
            <UiInput v-model="biz.companyFax"      label="Fax" />
            <div class="grid grid-cols-2 gap-4">
              <UiInput v-model="biz.companyTaxNumber" label="VAT / Tax Number" />
              <UiInput v-model="biz.description"      label="Description" />
            </div>
            <div class="flex justify-end pt-2">
              <UiButton :disabled="companyStore.saving" @click="saveBusiness">
                <span v-if="companyStore.saving">Saving…</span>
                <span v-else>Save Changes</span>
              </UiButton>
            </div>
          </div>
        </template>

        <!-- Billing -->
        <template v-else-if="activeTab === 'security'">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-5">Security &amp; Data</h2>
          <div class="space-y-6 max-w-lg">

            <div class="space-y-4">
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Passwords</p>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Minimum password length</label>
                <input
                  v-model.number="securitySettings.passwordMinLength" type="number" min="8" max="64"
                  class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <label class="flex items-center justify-between gap-4 cursor-pointer">
                <span class="text-sm text-slate-700 dark:text-slate-300">
                  Require mixed characters
                  <span class="block text-xs text-slate-400 mt-0.5">Uppercase, lowercase and a number.</span>
                </span>
                <input v-model="securitySettings.passwordRequireMixed" type="checkbox" class="w-4 h-4 accent-brand-500 flex-shrink-0" />
              </label>
            </div>

            <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-dark-border">
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2">Sessions</p>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Idle timeout (minutes)</label>
                <input
                  v-model.number="securitySettings.idleTimeoutMinutes" type="number" min="0" max="1440"
                  class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p class="text-xs text-slate-400 mt-1">0 = never. Inactive sessions are signed out and cannot silently resume.</p>
              </div>
            </div>

            <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-dark-border">
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2">Data Retention</p>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Photos &amp; documents (months)</label>
                  <input
                    v-model.number="securitySettings.retentionPhotosMonths" type="number" min="0" max="120"
                    class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Completed jobs (years)</label>
                  <input
                    v-model.number="securitySettings.retentionJobsYears" type="number" min="0" max="25"
                    class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <p class="text-xs text-slate-400">
                0 = keep forever. Applies after a vehicle is collected; certificates are never deleted; invoices are always retained.
              </p>
            </div>

            <div class="flex justify-end pt-2">
              <UiButton :disabled="companyStore.saving" @click="saveSecurity">Save Security Settings</UiButton>
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'billing'">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-5">Billing & VAT</h2>
          <div class="space-y-6 max-w-lg">

            <!-- Regional -->
            <div class="space-y-4">
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Regional</p>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                <select
                  v-model="billingSettings.currency"
                  class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="GBP">GBP — British Pound Sterling</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                  <option value="AUD">AUD — Australian Dollar</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date Format</label>
                <select
                  v-model="billingSettings.dateFormat"
                  class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                  <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                  <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
                <select
                  v-model="billingSettings.timezone"
                  class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Europe/Dublin">Europe/Dublin (IST)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="America/New_York">America/New_York (ET)</option>
                  <option value="America/Chicago">America/Chicago (CT)</option>
                  <option value="America/Denver">America/Denver (MT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                </select>
              </div>
            </div>

            <!-- VAT & Payment -->
            <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-dark-border">
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2">VAT & Payment</p>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default VAT Rate (%)</label>
                <select
                  v-model.number="billingSettings.vatRate"
                  class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option :value="20">20% (Standard)</option>
                  <option :value="5">5% (Reduced)</option>
                  <option :value="0">0% (Zero / Exempt)</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Payment Terms</label>
                <select
                  v-model.number="billingSettings.paymentTermsDays"
                  class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option :value="0">Due on receipt</option>
                  <option :value="7">7 days</option>
                  <option :value="14">14 days</option>
                  <option :value="30">30 days</option>
                  <option :value="60">60 days</option>
                  <option :value="90">90 days</option>
                </select>
              </div>
            </div>

            <!-- Storage charge (Module 9 — optional, off by default) -->
            <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-dark-border">
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2">Storage Charge</p>
              <label class="flex items-center justify-between gap-4 cursor-pointer">
                <span class="text-sm text-slate-700 dark:text-slate-300">
                  Charge storage for uncollected vehicles
                  <span class="block text-xs text-slate-400 mt-0.5">Added daily to the job's draft invoice after the free days; editable per invoice before issuing.</span>
                </span>
                <input v-model="billingSettings.storageChargeEnabled" type="checkbox" class="w-4 h-4 accent-brand-500 flex-shrink-0" />
              </label>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Storage charge (£/day)</label>
                  <input
                    v-model.number="billingSettings.storageChargePerDay"
                    type="number" min="0" step="0.5"
                    :disabled="!billingSettings.storageChargeEnabled"
                    class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Free days after completion</label>
                  <input
                    v-model.number="billingSettings.storageChargeAfterDays"
                    type="number" min="0"
                    :disabled="!billingSettings.storageChargeEnabled"
                    class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <!-- Trade credit (Sprint 20) -->
            <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-dark-border">
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2">Trade Credit</p>
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default trade credit for new trade accounts (£)</label>
                <input
                  v-model="billingSettings.defaultTradeCreditAmount"
                  type="number" min="0" step="0.01" placeholder="None"
                  class="w-full text-sm border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p class="text-xs text-slate-400 mt-1">Pre-fills the per-invoice trade credit on new B2B customers. Each account and each invoice can still be changed.</p>
              </div>
            </div>

            <!-- Bank Details -->
            <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-dark-border">
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2">Bank Details</p>
              <UiInput v-model="billingSettings.bankName"          label="Bank Name" placeholder="e.g. Barclays" />
              <div class="grid grid-cols-2 gap-4">
                <UiInput v-model="billingSettings.bankSortCode"        label="Sort Code" placeholder="12-34-56" />
                <UiInput v-model="billingSettings.bankAccountNumber"   label="Account Number" placeholder="12345678" />
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <UiButton :disabled="companyStore.saving" @click="saveBilling">
                <span v-if="companyStore.saving">Saving…</span>
                <span v-else>Save Changes</span>
              </UiButton>
            </div>

            <!-- Sprint 26 — invoice email attachments (saves on its own) -->
            <div class="pt-4 border-t border-slate-100 dark:border-dark-border">
              <InvoiceAttachmentsSettings />
            </div>
          </div>
        </template>

        <!-- Notifications -->
        <template v-else-if="activeTab === 'workshop'">
          <WorkshopSettings />
        </template>

        <template v-else-if="activeTab === 'working-time'">
          <WorkingTimeSettings />
        </template>

        <template v-else-if="activeTab === 'purchasing'">
          <ProcurementSettings />
        </template>

        <template v-else-if="activeTab === 'dashboard'">
          <DashboardDefaultsSettings />
        </template>

        <template v-else-if="activeTab === 'integrations'">
          <div class="space-y-6">
            <AccountingSettings />
            <RamTrackingSettings />
          </div>
        </template>

        <template v-else-if="activeTab === 'notify'">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-5">Notifications</h2>
          <div class="space-y-1 max-w-lg">
            <!-- All notifications -->
            <div class="flex items-center justify-between py-3 border-b border-slate-100 dark:border-dark-border">
              <div>
                <p class="text-sm font-medium text-slate-700 dark:text-slate-300">All notifications</p>
                <p class="text-xs text-slate-400 dark:text-slate-500">Master switch for all notification channels</p>
              </div>
              <button
                @click="toggleMasterNotifications"
                :class="notifSettings.notificationsEnabled ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                type="button"
              >
                <span
                  :class="notifSettings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'"
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                />
              </button>
            </div>

            <!-- In-app notifications -->
            <div
              class="flex items-center justify-between py-3 border-b border-slate-100 dark:border-dark-border transition-opacity"
              :class="!notifSettings.notificationsEnabled && 'opacity-40 pointer-events-none'"
            >
              <div>
                <p class="text-sm font-medium text-slate-700 dark:text-slate-300">In-app notifications</p>
                <p class="text-xs text-slate-400 dark:text-slate-500">Show notifications inside the application</p>
              </div>
              <button
                @click="notifSettings.internalNotificationsEnabled = !notifSettings.internalNotificationsEnabled"
                :class="notifSettings.internalNotificationsEnabled ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                type="button"
              >
                <span
                  :class="notifSettings.internalNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'"
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                />
              </button>
            </div>

            <!-- Email notifications -->
            <div
              class="flex items-center justify-between py-3 border-b border-slate-100 dark:border-dark-border transition-opacity"
              :class="!notifSettings.notificationsEnabled && 'opacity-40 pointer-events-none'"
            >
              <div>
                <p class="text-sm font-medium text-slate-700 dark:text-slate-300">Email notifications</p>
                <p class="text-xs text-slate-400 dark:text-slate-500">Receive updates and alerts via email</p>
              </div>
              <button
                @click="notifSettings.emailNotificationsEnabled = !notifSettings.emailNotificationsEnabled"
                :class="notifSettings.emailNotificationsEnabled ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                type="button"
              >
                <span
                  :class="notifSettings.emailNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'"
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                />
              </button>
            </div>

            <!-- SMS notifications -->
            <div
              class="flex items-center justify-between py-3 transition-opacity"
              :class="!notifSettings.notificationsEnabled && 'opacity-40 pointer-events-none'"
            >
              <div>
                <p class="text-sm font-medium text-slate-700 dark:text-slate-300">SMS notifications</p>
                <p class="text-xs text-slate-400 dark:text-slate-500">Receive alerts via text message</p>
              </div>
              <button
                @click="notifSettings.smsNotificationsEnabled = !notifSettings.smsNotificationsEnabled"
                :class="notifSettings.smsNotificationsEnabled ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                type="button"
              >
                <span
                  :class="notifSettings.smsNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'"
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                />
              </button>
            </div>

            <div class="flex items-center justify-between pt-4">
              <router-link to="/admin/notification-templates" class="text-sm text-brand-600 hover:underline">
                Manage notification templates →
              </router-link>
              <UiButton :disabled="companyStore.saving" @click="saveNotifications">
                <span v-if="companyStore.saving">Saving…</span>
                <span v-else>Save Changes</span>
              </UiButton>
            </div>
          </div>
        </template>

      </div>
    </div>
  </DefaultLayout>
</template>
