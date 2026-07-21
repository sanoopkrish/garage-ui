<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import {
  ArrowLeft, Clock, User, Globe, Tag, Shield,
  CheckCircle, XCircle, Loader2, Plus, Pencil, Trash2,
  LogIn, LogOut, FileOutput, Eye, Activity, Minus,
} from 'lucide-vue-next'
import { useAuditStore } from '@/stores/audit.store'

const route = useRoute()
const router = useRouter()
const store = useAuditStore()

const log = computed(() => store.currentLog)

function actionBadgeVariant(action: string): 'done' | 'cancelled' | 'info' | 'pending' | 'open' {
  const map: Record<string, any> = {
    CREATE: 'done', UPDATE: 'info', DELETE: 'cancelled', BULK_DELETE: 'cancelled',
    FAILED_LOGIN: 'cancelled', REJECT: 'cancelled', LOGIN: 'done', APPROVE: 'done',
    RESTORE: 'done', ARCHIVE: 'pending', LOGOUT: 'pending', PASSWORD_CHANGE: 'pending',
    PASSWORD_RESET: 'pending', PERMISSION_CHANGE: 'pending',
  }
  return map[action] ?? 'open'
}

function httpMethodVariant(method: string): 'done' | 'info' | 'pending' | 'cancelled' | 'open' {
  const map: Record<string, any> = {
    GET: 'done', POST: 'info', PUT: 'pending', PATCH: 'pending', DELETE: 'cancelled',
  }
  return map[method] ?? 'open'
}

function sensitivityVariant(level: string): 'cancelled' | 'pending' | 'info' | 'done' {
  const map: Record<string, any> = {
    HIGHEST: 'cancelled', HIGH: 'pending', MEDIUM: 'info', LOW: 'done',
  }
  return map[level] ?? 'info'
}

function getActionIcon(action: string) {
  const icons: Record<string, any> = {
    CREATE: Plus, UPDATE: Pencil, DELETE: Trash2, BULK_DELETE: Trash2,
    LOGIN: LogIn, LOGOUT: LogOut, FAILED_LOGIN: XCircle, EXPORT: FileOutput,
    READ: Eye,
  }
  return icons[action] ?? Activity
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString()
}

onMounted(() => store.fetchLog(route.params.id as string))
onUnmounted(() => store.clearCurrentLog())
</script>

<template>
  <DefaultLayout>
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <button @click="router.push('/admin/audit-logs')" class="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors">
          <ArrowLeft class="w-4 h-4" />
          Back to Audit Logs
        </button>
        <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Audit Log Detail</h1>
      </div>

      <!-- Loading -->
      <div v-if="store.loading" class="flex justify-center py-20">
        <Loader2 class="w-8 h-8 animate-spin text-brand-500" />
      </div>

      <div v-else-if="log" class="space-y-5">
        <!-- Action header card -->
        <div class="card flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex items-center gap-3">
            <div class="p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20">
              <component :is="getActionIcon(log.action)" class="w-6 h-6 text-brand-500" />
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <UiBadge :variant="actionBadgeVariant(log.action)">{{ log.action }}</UiBadge>
                <span class="text-sm text-slate-500">on</span>
                <span class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ log.entityType }}</span>
              </div>
              <p v-if="log.entityDisplayName" class="text-xs text-slate-400 mt-0.5">{{ log.entityDisplayName }}</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-slate-500 sm:ml-auto">
            <Clock class="w-3.5 h-3.5" />
            {{ formatDate(log.timestamp) }}
          </div>
        </div>

        <!-- Details grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <!-- User info -->
          <div class="card">
            <div class="flex items-center gap-2 mb-4">
              <User class="w-4 h-4 text-brand-500" />
              <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">User Information</h3>
            </div>
            <dl class="space-y-3">
              <div class="flex justify-between items-start border-b border-slate-50 dark:border-dark-border pb-3">
                <dt class="text-xs text-slate-500">Name</dt>
                <dd class="text-xs font-medium text-slate-800 dark:text-slate-100">{{ log.userName || '—' }}</dd>
              </div>
              <div class="flex justify-between items-start border-b border-slate-50 dark:border-dark-border pb-3">
                <dt class="text-xs text-slate-500">Email</dt>
                <dd class="text-xs font-medium text-slate-800 dark:text-slate-100">{{ log.userEmail || '—' }}</dd>
              </div>
              <div class="flex justify-between items-start border-b border-slate-50 dark:border-dark-border pb-3">
                <dt class="text-xs text-slate-500">Role</dt>
                <dd class="text-xs font-medium text-slate-800 dark:text-slate-100">{{ log.userRole || '—' }}</dd>
              </div>
              <div class="flex justify-between items-start">
                <dt class="text-xs text-slate-500">IP Address</dt>
                <dd class="text-xs font-mono text-slate-800 dark:text-slate-100">{{ log.ipAddress || '—' }}</dd>
              </div>
            </dl>
          </div>

          <!-- Request info -->
          <div class="card">
            <div class="flex items-center gap-2 mb-4">
              <Globe class="w-4 h-4 text-brand-500" />
              <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Request Information</h3>
            </div>
            <dl class="space-y-3">
              <div class="flex justify-between items-start border-b border-slate-50 dark:border-dark-border pb-3">
                <dt class="text-xs text-slate-500">Endpoint</dt>
                <dd class="text-xs font-mono text-slate-800 dark:text-slate-100 max-w-[200px] truncate text-right">{{ log.endpoint || '—' }}</dd>
              </div>
              <div class="flex justify-between items-start">
                <dt class="text-xs text-slate-500">HTTP Method</dt>
                <dd>
                  <UiBadge v-if="log.httpMethod" :variant="httpMethodVariant(log.httpMethod)">{{ log.httpMethod }}</UiBadge>
                  <span v-else class="text-xs text-slate-400">—</span>
                </dd>
              </div>
            </dl>
          </div>

          <!-- Classification -->
          <div class="card">
            <div class="flex items-center gap-2 mb-4">
              <Tag class="w-4 h-4 text-brand-500" />
              <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Classification</h3>
            </div>
            <dl class="space-y-3">
              <div class="flex justify-between items-start border-b border-slate-50 dark:border-dark-border pb-3">
                <dt class="text-xs text-slate-500">Category</dt>
                <dd class="text-xs font-medium text-slate-800 dark:text-slate-100">{{ log.category }}</dd>
              </div>
              <div class="flex justify-between items-start">
                <dt class="text-xs text-slate-500">Sensitivity</dt>
                <dd>
                  <UiBadge v-if="log.sensitivityLevel" :variant="sensitivityVariant(log.sensitivityLevel)">{{ log.sensitivityLevel }}</UiBadge>
                  <span v-else class="text-xs text-slate-400">—</span>
                </dd>
              </div>
            </dl>
          </div>

          <!-- Integrity -->
          <div class="card">
            <div class="flex items-center gap-2 mb-4">
              <Shield class="w-4 h-4 text-brand-500" />
              <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Entity</h3>
            </div>
            <dl class="space-y-3">
              <div class="flex justify-between items-start border-b border-slate-50 dark:border-dark-border pb-3">
                <dt class="text-xs text-slate-500">Type</dt>
                <dd class="text-xs font-medium text-slate-800 dark:text-slate-100">{{ log.entityType }}</dd>
              </div>
              <div class="flex justify-between items-start">
                <dt class="text-xs text-slate-500">ID</dt>
                <dd class="text-xs font-mono text-slate-800 dark:text-slate-100 max-w-[200px] truncate text-right">{{ log.entityId || '—' }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Changed fields -->
        <div v-if="log.changedFields && log.changedFields.length" class="card">
          <div class="flex items-center gap-2 mb-4">
            <Pencil class="w-4 h-4 text-brand-500" />
            <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Changed Fields</h3>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="field in log.changedFields"
              :key="field"
              class="px-2.5 py-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full"
            >
              {{ field }}
            </span>
          </div>
        </div>

        <!-- Before / After state -->
        <div v-if="log.beforeState || log.afterState" class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div v-if="log.beforeState" class="card">
            <div class="flex items-center gap-2 mb-3">
              <Minus class="w-4 h-4 text-red-500" />
              <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">Before State</h3>
            </div>
            <pre class="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-dark-hover p-3 rounded-lg overflow-auto max-h-80">{{ JSON.stringify(log.beforeState, null, 2) }}</pre>
          </div>
          <div v-if="log.afterState" class="card">
            <div class="flex items-center gap-2 mb-3">
              <Plus class="w-4 h-4 text-green-500" />
              <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">After State</h3>
            </div>
            <pre class="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-dark-hover p-3 rounded-lg overflow-auto max-h-80">{{ JSON.stringify(log.afterState, null, 2) }}</pre>
          </div>
        </div>

        <!-- Notes / Reason -->
        <div v-if="log.reason || log.notes" class="card">
          <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-3">Additional Context</h3>
          <dl class="space-y-3">
            <div v-if="log.reason">
              <dt class="text-xs text-slate-500 mb-1">Reason</dt>
              <dd class="text-sm text-slate-700 dark:text-slate-300">{{ log.reason }}</dd>
            </div>
            <div v-if="log.notes">
              <dt class="text-xs text-slate-500 mb-1">Notes</dt>
              <dd class="text-sm text-slate-700 dark:text-slate-300">{{ log.notes }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Not found -->
      <div v-else-if="!store.loading" class="card text-center py-16">
        <p class="text-slate-400">Audit log not found.</p>
      </div>
    </div>
  </DefaultLayout>
</template>
