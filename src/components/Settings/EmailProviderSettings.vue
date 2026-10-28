<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { Mail, Send, CheckCircle2, XCircle, Loader2 } from 'lucide-vue-next'
import {
  getNotificationConfig, updateNotificationConfig, testEmailConnection,
  type NotificationConfig,
} from '@/api/notification-config.api'
import { ToastService } from '@/services/toast.service'

// Owner portal passes the target company's id; without it the caller's own company is configured
const props = defineProps<{ companyId?: string }>()

const loading = ref(true)
const saving = ref(false)
const testing = ref(false)

const emailProvider = ref<'' | 'smtp' | 'sendgrid' | 'microsoft365'>('')
const fromName = ref('')
const smtp = reactive({ host: '', port: '587', secure: false, user: '', pass: '', from: '' })
const m365 = reactive({ fromEmail: '' })
const sendgrid = reactive({ apiKey: '', from: '' })

const testEmail = ref('')
const testResult = ref<{ success: boolean; message: string } | null>(null)

const smtpPresets = {
  google: { host: 'smtp.gmail.com', port: '587', secure: false, label: 'Google (Gmail / Workspace)' },
  outlook: { host: 'smtp.office365.com', port: '587', secure: false, label: 'Microsoft 365 SMTP' },
} as const

const isGoogleSmtp = computed(() => smtp.host === smtpPresets.google.host)

function applyPreset(key: keyof typeof smtpPresets | 'custom') {
  if (key === 'custom') {
    smtp.host = ''
    smtp.port = '587'
    smtp.secure = false
    return
  }
  const preset = smtpPresets[key]
  smtp.host = preset.host
  smtp.port = preset.port
  smtp.secure = preset.secure
}

// Gmail requires From to match the account address
watch(() => smtp.user, (user) => {
  if (isGoogleSmtp.value) smtp.from = user
})

async function load() {
  loading.value = true
  try {
    const config = await getNotificationConfig(props.companyId)
    emailProvider.value = config.emailProvider ?? ''
    fromName.value = config.fromName ?? ''
    if (config.smtp) {
      smtp.host = config.smtp.host
      smtp.port = String(config.smtp.port || 587)
      smtp.secure = config.smtp.secure
      smtp.user = config.smtp.user
      smtp.pass = config.smtp.pass
      smtp.from = config.smtp.from
    }
    if (config.microsoft365) m365.fromEmail = config.microsoft365.fromEmail
    if (config.sendgrid) {
      sendgrid.apiKey = config.sendgrid.apiKey
      sendgrid.from = config.sendgrid.from
    }
  } catch {
    ToastService.error('Failed to load email configuration')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const payload: Partial<NotificationConfig> = {
      emailProvider: (emailProvider.value || null) as NotificationConfig['emailProvider'],
      fromName: fromName.value.trim(),
    }
    if (emailProvider.value === 'smtp') {
      payload.smtp = { ...smtp, port: Number(smtp.port) || 587 }
    } else if (emailProvider.value === 'sendgrid') {
      payload.sendgrid = { apiKey: sendgrid.apiKey, from: sendgrid.from }
    } else if (emailProvider.value === 'microsoft365') {
      payload.microsoft365 = { fromEmail: m365.fromEmail }
    }
    await updateNotificationConfig(payload, props.companyId)
    ToastService.success('Email configuration saved')
    testResult.value = null
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to save email configuration')
  } finally {
    saving.value = false
  }
}

async function sendTest() {
  if (!testEmail.value) return
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await testEmailConnection(testEmail.value.trim(), props.companyId)
  } catch (e: any) {
    testResult.value = { success: false, message: e.response?.data?.message ?? 'Failed to send test email' }
  } finally {
    testing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
        <Mail class="w-5 h-5 text-brand-500" /> Email Provider
      </h3>
      <UiBadge v-if="!loading && emailProvider" variant="done" dot>{{ emailProvider === 'microsoft365' ? 'Microsoft 365' : emailProvider === 'sendgrid' ? 'SendGrid' : 'SMTP' }}</UiBadge>
      <UiBadge v-else-if="!loading" variant="open" dot>System default</UiBadge>
    </div>

    <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
      Emails to customers (quotes, invoices, reminders) are sent through this provider.
      Leave on <span class="font-medium">None</span> to use the platform's default mail server.
    </p>

    <div v-if="loading" class="h-24 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <div v-else class="space-y-4 max-w-2xl">
      <div class="max-w-xs">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Provider</label>
        <select
          v-model="emailProvider"
          class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="">None (system default)</option>
          <option value="smtp">SMTP</option>
          <option value="sendgrid">SendGrid</option>
          <option value="microsoft365">Microsoft 365</option>
        </select>
      </div>

      <!-- SMTP -->
      <template v-if="emailProvider === 'smtp'">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Quick preset</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(preset, key) in smtpPresets"
              :key="key"
              type="button"
              @click="applyPreset(key)"
              :class="[
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                smtp.host === preset.host
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-500',
              ]"
            >
              {{ preset.label }}
            </button>
            <button
              type="button"
              @click="applyPreset('custom')"
              class="rounded-lg border border-slate-200 dark:border-dark-border px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-500 transition-colors"
            >
              Custom
            </button>
          </div>
          <p v-if="isGoogleSmtp" class="text-xs text-slate-400 mt-1.5">
            Gmail needs an <a href="https://myaccount.google.com/apppasswords" target="_blank" class="text-brand-600 underline">App Password</a> — not the regular account password.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UiInput v-model="smtp.host" label="SMTP host" placeholder="smtp.example.com" />
          <UiInput v-model="smtp.port" label="Port" type="number" placeholder="587" />
          <UiInput v-model="smtp.user" label="Username" :placeholder="isGoogleSmtp ? 'you@gmail.com' : 'username'" />
          <UiInput v-model="smtp.pass" :label="isGoogleSmtp ? 'App password' : 'Password'" type="password" />
          <UiInput v-model="smtp.from" label="From email" :disabled="isGoogleSmtp" placeholder="noreply@yourdomain.com" />
          <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 sm:mt-7">
            <input type="checkbox" v-model="smtp.secure" class="accent-brand-500" />
            SSL/TLS (port 465) — uncheck for STARTTLS (587)
          </label>
        </div>
      </template>

      <!-- SendGrid -->
      <template v-else-if="emailProvider === 'sendgrid'">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UiInput v-model="sendgrid.apiKey" label="API key" type="password" placeholder="SG.xxxxxxxxx" />
          <UiInput v-model="sendgrid.from" label="From email" placeholder="noreply@yourdomain.com" />
        </div>
      </template>

      <!-- Microsoft 365 (Graph) -->
      <template v-else-if="emailProvider === 'microsoft365'">
        <div class="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
          Sends via the Microsoft Graph API. The workshop's Microsoft 365 admin must grant the Cruise
          application consent to send mail; the Azure tenant is resolved from the email domain automatically.
        </div>
        <div class="max-w-sm">
          <UiInput v-model="m365.fromEmail" label="From email address" placeholder="noreply@yourdomain.com" />
          <p class="text-xs text-slate-400 mt-1">Must be a real Microsoft 365 mailbox.</p>
        </div>
      </template>

      <div v-if="emailProvider" class="max-w-sm">
        <UiInput v-model="fromName" label="From name (display name)" placeholder="Falls back to the company name" />
      </div>

      <div class="flex items-center gap-2 pt-1">
        <UiButton :disabled="saving" @click="save">
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
          {{ saving ? 'Saving…' : 'Save configuration' }}
        </UiButton>
      </div>

      <!-- Test email -->
      <div v-if="emailProvider" class="pt-4 border-t border-slate-100 dark:border-dark-border">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Send test email</label>
        <div class="flex gap-2 max-w-md">
          <UiInput v-model="testEmail" type="email" placeholder="you@example.com" class="flex-1" />
          <UiButton variant="secondary" :disabled="testing || !testEmail" @click="sendTest">
            <Loader2 v-if="testing" class="w-4 h-4 animate-spin" />
            <Send v-else class="w-4 h-4" />
            Test
          </UiButton>
        </div>
        <p class="text-xs text-slate-400 mt-1">Uses the last saved configuration — save first if you changed anything.</p>
        <div v-if="testResult" class="mt-2 flex items-start gap-1.5 text-sm">
          <CheckCircle2 v-if="testResult.success" class="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
          <XCircle v-else class="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
          <span :class="testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-500'">{{ testResult.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
