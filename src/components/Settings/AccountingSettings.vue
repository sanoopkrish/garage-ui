<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { Landmark, Link2, Unlink, RefreshCw } from 'lucide-vue-next'
import {
  getAccountingConnections, connectProvider, updateConnectionSettings, disconnectProvider, getSyncLogs,
  type AccountingConnection, type SyncLogRow,
} from '@/api/accounting.api'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

const connections = ref<AccountingConnection[]>([])
const logs = ref<SyncLogRow[]>([])
const loading = ref(true)
const saving = ref(false)
const connecting = ref(false)

const xero = computed(() => connections.value.find((c) => c.provider === 'xero') ?? null)
const isConnected = computed(() => xero.value?.status === 'connected')

const form = reactive({
  defaultRevenueAccountCode: '',
  defaultPaymentAccountCode: '',
  syncInvoices: true,
  syncPayments: true,
  autoSync: true,
})

async function load() {
  loading.value = true
  try {
    connections.value = await getAccountingConnections()
    if (xero.value) {
      form.defaultRevenueAccountCode = xero.value.settings.defaultRevenueAccountCode ?? '200'
      form.defaultPaymentAccountCode = xero.value.settings.defaultPaymentAccountCode ?? ''
      form.syncInvoices = xero.value.settings.syncInvoices ?? true
      form.syncPayments = xero.value.settings.syncPayments ?? true
      form.autoSync = xero.value.settings.autoSync ?? true
    }
    const logResult = await getSyncLogs({ pageSize: 8 })
    logs.value = logResult.items
  } catch {
    /* integrations tab shows the card regardless */
  } finally {
    loading.value = false
  }
}

async function connect() {
  connecting.value = true
  try {
    const { authUrl } = await connectProvider('xero')
    window.location.href = authUrl // full-page redirect to Xero consent
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not start the Xero connection')
    connecting.value = false
  }
}

async function saveSettings() {
  if (!xero.value) return
  saving.value = true
  try {
    await updateConnectionSettings(xero.value.id, {
      defaultRevenueAccountCode: form.defaultRevenueAccountCode.trim() || undefined,
      defaultPaymentAccountCode: form.defaultPaymentAccountCode.trim() || undefined,
      syncInvoices: form.syncInvoices,
      syncPayments: form.syncPayments,
      autoSync: form.autoSync,
    })
    ToastService.success('Accounting settings saved')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to save settings')
  } finally {
    saving.value = false
  }
}

async function disconnect() {
  if (!xero.value) return
  const result = await showConfirmDialog('Disconnect Xero? Synced history stays in Xero; new invoices will no longer be pushed.')
  if (!result.isConfirmed) return
  await disconnectProvider(xero.value.id)
  ToastService.success('Disconnected from Xero')
  load()
}

function formatWhen(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
}

onMounted(() => {
  const route = useRoute()
  if (route.query.connected) ToastService.success('Connected to Xero')
  if (route.query.error === 'connection_failed') ToastService.error('Xero connection failed — try again')
  load()
})
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
        <Landmark class="w-5 h-5 text-brand-500" /> Accounting — Xero
      </h3>
      <UiBadge v-if="isConnected" variant="done" dot>Connected · {{ xero?.organisationName }}</UiBadge>
      <UiBadge v-else-if="xero?.status === 'error' || xero?.status === 'expired'" variant="cancelled" dot>Needs reconnect</UiBadge>
      <UiBadge v-else variant="open" dot>Not connected</UiBadge>
    </div>

    <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
      Issued invoices and recorded payments are pushed to Xero automatically.
      The workshop connects its own Xero organisation — no credentials are shared.
    </p>
    <p v-if="xero?.lastError" class="text-sm text-red-500 mb-4">{{ xero.lastError }}</p>

    <div v-if="loading" class="h-16 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <template v-else-if="!isConnected">
      <UiButton :disabled="connecting" @click="connect">
        <Link2 class="w-4 h-4" /> {{ connecting ? 'Redirecting…' : 'Connect to Xero' }}
      </UiButton>
    </template>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mb-4">
        <UiInput v-model="form.defaultRevenueAccountCode" label="Revenue account code" placeholder="200" />
        <UiInput v-model="form.defaultPaymentAccountCode" label="Payment account code (bank)" placeholder="e.g. 090" />
      </div>
      <div class="flex flex-wrap gap-5 mb-4 text-sm text-slate-600 dark:text-slate-300">
        <label class="flex items-center gap-2"><input type="checkbox" v-model="form.syncInvoices" class="accent-brand-500" /> Push invoices</label>
        <label class="flex items-center gap-2"><input type="checkbox" v-model="form.syncPayments" class="accent-brand-500" /> Push payments</label>
        <label class="flex items-center gap-2"><input type="checkbox" v-model="form.autoSync" class="accent-brand-500" /> Automatic (on issue / on payment)</label>
      </div>
      <div class="flex items-center gap-2 mb-5">
        <UiButton :disabled="saving" @click="saveSettings">{{ saving ? 'Saving…' : 'Save settings' }}</UiButton>
        <UiButton variant="ghost" @click="disconnect"><Unlink class="w-4 h-4" /> Disconnect</UiButton>
        <span class="text-xs text-slate-400 ml-auto">Last sync: {{ formatWhen(xero?.lastSyncAt ?? null) }}</span>
      </div>

      <!-- Recent sync activity -->
      <div class="pt-4 border-t border-slate-100 dark:border-dark-border">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent sync activity</h4>
          <button class="text-xs text-brand-600 hover:underline inline-flex items-center gap-1" @click="load"><RefreshCw class="w-3 h-3" /> Refresh</button>
        </div>
        <ul v-if="logs.length" class="space-y-1.5">
          <li v-for="log in logs" :key="log.id" class="flex items-center gap-2 text-sm">
            <span
              :class="[
                'w-2 h-2 rounded-full flex-shrink-0',
                log.status === 'success' ? 'bg-green-500' : log.status === 'skipped' ? 'bg-slate-300' : 'bg-red-500',
              ]"
            />
            <span class="text-slate-600 dark:text-slate-300 capitalize">{{ log.entityType }} {{ log.action }}</span>
            <span v-if="log.errorMessage" class="text-xs text-red-500 truncate flex-1">{{ log.errorMessage }}</span>
            <span class="text-xs text-slate-400 ml-auto flex-shrink-0">{{ formatWhen(log.createdAt) }}</span>
          </li>
        </ul>
        <p v-else class="text-sm text-slate-400">Nothing synced yet.</p>
      </div>
    </template>
  </div>
</template>
