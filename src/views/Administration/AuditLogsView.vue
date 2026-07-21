<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiStatCard from '@/components/Ui/UiStatCard.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import {
  ScrollText, Clock, CalendarDays, Calendar, Shield,
  CheckCircle, XCircle, RefreshCw, Download, RotateCcw, Eye,
  Activity, Layers,
} from 'lucide-vue-next'
import { useAuditStore } from '@/stores/audit.store'
import { AUDIT_ACTIONS } from '@/api/audit.api'

const store = useAuditStore()
const activeTab = ref<'overview' | 'logs'>('overview')

const search = ref('')
const filterAction = ref('')
const filterEntityType = ref('')
const filterFrom = ref('')
const filterTo = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => applyFilters(), 350)
}

function applyFilters() {
  store.setFilters({
    search: search.value || undefined,
    action: filterAction.value || undefined,
    entityType: filterEntityType.value || undefined,
    fromDate: filterFrom.value || undefined,
    toDate: filterTo.value || undefined,
  })
}

function resetFilters() {
  search.value = ''
  filterAction.value = ''
  filterEntityType.value = ''
  filterFrom.value = ''
  filterTo.value = ''
  store.resetFilters()
}

function actionBadgeVariant(action: string): 'done' | 'cancelled' | 'info' | 'pending' | 'open' {
  const map: Record<string, any> = {
    CREATE: 'done',
    UPDATE: 'info',
    DELETE: 'cancelled',
    BULK_DELETE: 'cancelled',
    FAILED_LOGIN: 'cancelled',
    REJECT: 'cancelled',
    LOGIN: 'done',
    APPROVE: 'done',
    RESTORE: 'done',
    ARCHIVE: 'pending',
    LOGOUT: 'pending',
    PASSWORD_CHANGE: 'pending',
    PASSWORD_RESET: 'pending',
    PERMISSION_CHANGE: 'pending',
  }
  return map[action] ?? 'open'
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString()
}

function formatDateShort(ts: string) {
  return new Date(ts).toLocaleDateString()
}

onMounted(() => {
  store.fetchSummary()
  store.fetchLogs()
})
</script>

<template>
  <DefaultLayout>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Audit Logs</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">System activity trail and integrity verification.</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-slate-100 dark:border-dark-border mb-6 flex gap-1">
      <button
        v-for="tab in [{ key: 'overview', label: 'Overview' }, { key: 'logs', label: 'Logs' }]"
        :key="tab.key"
        @click="activeTab = tab.key as any"
        :class="[
          'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
          activeTab === tab.key
            ? 'border-brand-500 text-brand-500'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ── OVERVIEW TAB ──────────────────────────────────────────────────── -->
    <div v-show="activeTab === 'overview'" class="space-y-6">
      <!-- Stat cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <UiStatCard
          title="Total Logs"
          :value="store.summary?.total?.toLocaleString() ?? '—'"
          :icon="ScrollText"
        />
        <UiStatCard
          title="Last 24 Hours"
          :value="store.summary?.last24Hours?.toLocaleString() ?? '—'"
          :icon="Clock"
          iconBg="bg-brand-500"
        />
        <UiStatCard
          title="Last 7 Days"
          :value="store.summary?.last7Days?.toLocaleString() ?? '—'"
          :icon="Calendar"
          iconBg="bg-green-500"
        />
        <UiStatCard
          title="Last 30 Days"
          :value="store.summary?.last30Days?.toLocaleString() ?? '—'"
          :icon="CalendarDays"
          iconBg="bg-purple-500"
        />
      </div>

      <!-- Chain integrity -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Shield class="w-5 h-5 text-brand-500" />
            <h3 class="font-semibold text-slate-800 dark:text-slate-100">Chain Integrity</h3>
          </div>
          <UiButton variant="secondary" size="sm" :disabled="store.loadingChain" @click="store.verifyChain()">
            <RefreshCw :class="['w-4 h-4', store.loadingChain && 'animate-spin']" />
            {{ store.loadingChain ? 'Verifying…' : 'Verify Chain' }}
          </UiButton>
        </div>

        <div v-if="store.chainVerification" class="flex items-center gap-3">
          <div :class="['p-2 rounded-full', store.chainVerification.valid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30']">
            <CheckCircle v-if="store.chainVerification.valid" class="w-5 h-5 text-green-600" />
            <XCircle v-else class="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p class="font-medium text-slate-800 dark:text-slate-100 text-sm">
              {{ store.chainVerification.valid ? 'Chain Verified' : 'Chain Broken' }}
            </p>
            <p class="text-xs text-slate-500">{{ store.chainVerification.checkedCount.toLocaleString() }} records checked</p>
          </div>
        </div>
        <p v-else class="text-sm text-slate-400">Click "Verify Chain" to check audit log integrity.</p>
      </div>

      <!-- Breakdowns -->
      <div v-if="store.summary" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- By action -->
        <div class="card">
          <div class="flex items-center gap-2 mb-4">
            <Activity class="w-4 h-4 text-brand-500" />
            <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Activity by Action</h3>
          </div>
          <div class="space-y-2">
            <div
              v-for="(count, action) in store.summary.byAction"
              :key="action"
              class="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-dark-border last:border-0"
            >
              <UiBadge :variant="actionBadgeVariant(String(action))">{{ action }}</UiBadge>
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ count.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- By category -->
        <div class="card">
          <div class="flex items-center gap-2 mb-4">
            <Layers class="w-4 h-4 text-brand-500" />
            <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Activity by Category</h3>
          </div>
          <div class="space-y-2">
            <div
              v-for="(count, category) in store.summary.byCategory"
              :key="category"
              class="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-dark-border last:border-0"
            >
              <span class="text-sm text-slate-600 dark:text-slate-400">{{ category }}</span>
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ count.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── LOGS TAB ──────────────────────────────────────────────────────── -->
    <div v-show="activeTab === 'logs'" class="space-y-4">
      <!-- Filter bar -->
      <div class="card space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <UiSearchInput v-model="search" placeholder="Search logs…" @update:modelValue="onSearchInput" />

          <select
            v-model="filterAction"
            @change="applyFilters"
            class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Actions</option>
            <option v-for="a in AUDIT_ACTIONS" :key="a" :value="a">{{ a }}</option>
          </select>

          <input
            v-model="filterFrom"
            type="date"
            @change="applyFilters"
            class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="From date"
          />

          <input
            v-model="filterTo"
            type="date"
            @change="applyFilters"
            class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="To date"
          />
        </div>
        <div class="flex items-center justify-between">
          <button @click="resetFilters" class="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <RotateCcw class="w-3.5 h-3.5" />
            Reset filters
          </button>
          <UiButton variant="secondary" size="sm" :disabled="store.exporting" @click="store.exportCsv()">
            <Download class="w-4 h-4" />
            {{ store.exporting ? 'Exporting…' : 'Export CSV' }}
          </UiButton>
        </div>
      </div>

      <!-- Table -->
      <UiTable
        :headers="['Timestamp', 'Action', 'Entity', 'User', 'Category', '']"
        :loading="store.loading"
        empty="No audit logs found."
      >
        <tr
          v-for="log in store.logs"
          :key="log.id"
          class="hover:bg-slate-50 dark:hover:bg-dark-hover transition-colors"
        >
          <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {{ formatDate(log.timestamp) }}
          </td>
          <td class="px-4 py-3">
            <UiBadge :variant="actionBadgeVariant(log.action)">{{ log.action }}</UiBadge>
          </td>
          <td class="px-4 py-3">
            <p class="text-sm text-slate-800 dark:text-slate-100">{{ log.entityType }}</p>
            <p v-if="log.entityDisplayName" class="text-xs text-slate-400">{{ log.entityDisplayName }}</p>
          </td>
          <td class="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
            {{ log.userName || log.userEmail || 'System' }}
          </td>
          <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{{ log.category }}</td>
          <td class="px-4 py-3 text-right">
            <router-link
              :to="`/admin/audit-logs/${log.id}`"
              class="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 justify-end"
            >
              <Eye class="w-3.5 h-3.5" />
              View
            </router-link>
          </td>
        </tr>
      </UiTable>

      <!-- Pagination -->
      <div v-if="store.pagination.total > 0" class="flex items-center justify-between text-sm text-slate-500">
        <span>
          Showing {{ (store.pagination.page - 1) * store.pagination.pageSize + 1 }}–{{ Math.min(store.pagination.page * store.pagination.pageSize, store.pagination.total) }}
          of {{ store.pagination.total.toLocaleString() }}
        </span>
        <div class="flex gap-2">
          <UiButton variant="secondary" size="sm" :disabled="!store.pagination.hasPreviousPage" @click="store.setPage(store.pagination.page - 1)">
            Previous
          </UiButton>
          <UiButton variant="secondary" size="sm" :disabled="!store.pagination.hasNextPage" @click="store.setPage(store.pagination.page + 1)">
            Next
          </UiButton>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>
