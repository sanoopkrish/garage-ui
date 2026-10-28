<script setup lang="ts">
import { ref, onMounted } from 'vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { Download, Send, ChevronDown, ChevronUp } from 'lucide-vue-next'
import {
  getStatements, getStatement, downloadStatementPdf, sendStatement,
  type StatementSummaryRow, type StatementDetail,
} from '@/api/invoices.api'
import { gbp } from '@/utils/invoiceStatus'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

const { hasPermission: canSend } = usePermissions('menus.finance.statements.send')

const rows = ref<StatementSummaryRow[]>([])
const loading = ref(true)
const expandedId = ref<string | null>(null)
const detail = ref<StatementDetail | null>(null)
const detailLoading = ref(false)
const sendingId = ref<string | null>(null)
const sendingAll = ref(false)

async function load() {
  loading.value = true
  try {
    rows.value = await getStatements()
  } catch {
    ToastService.error('Failed to load statements')
  } finally {
    loading.value = false
  }
}

async function toggle(customerId: string) {
  if (expandedId.value === customerId) { expandedId.value = null; detail.value = null; return }
  expandedId.value = customerId
  detail.value = null
  detailLoading.value = true
  try {
    detail.value = await getStatement(customerId)
  } catch {
    ToastService.error('Failed to load statement detail')
    expandedId.value = null
  } finally {
    detailLoading.value = false
  }
}

async function pdf(row: StatementSummaryRow) {
  try {
    await downloadStatementPdf(row.customerId, row.customerName)
  } catch {
    ToastService.error('Failed to download statement PDF')
  }
}

async function send(row: StatementSummaryRow) {
  if (!row.customerEmail) { ToastService.error(`${row.customerName} has no email address on record`); return }
  if (!(row.outstanding > 0)) { ToastService.error('Nothing outstanding — no statement to send'); return }
  const result = await showConfirmDialog(`Email the statement (${gbp(row.outstanding)} outstanding) to ${row.customerEmail}?`, false, 'Send')
  if (!result.isConfirmed) return
  sendingId.value = row.customerId
  try {
    await sendStatement(row.customerId)
    ToastService.success(`Statement sent to ${row.customerEmail}`)
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to send statement')
  } finally {
    sendingId.value = null
  }
}

async function sendAll() {
  const eligible = rows.value.filter((r) => r.customerEmail && r.outstanding > 0)
  if (!eligible.length) { ToastService.error('No customers with an outstanding balance and an email address'); return }
  const result = await showConfirmDialog(`Send statements to ${eligible.length} customer(s) with outstanding balances?`, false, 'Send all')
  if (!result.isConfirmed) return
  sendingAll.value = true
  let sent = 0, failed = 0
  for (const row of eligible) {
    try {
      await sendStatement(row.customerId)
      sent++
    } catch {
      failed++
    }
  }
  sendingAll.value = false
  if (failed) ToastService.error(`${sent} sent, ${failed} failed`)
  else ToastService.success(`${sent} statement(s) sent`)
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <p class="text-sm text-slate-500 dark:text-slate-400">
        B2B accounts with outstanding balances — statements list every issued, unpaid invoice net of credit notes, plus any credit on account.
      </p>
      <UiButton v-if="canSend" variant="secondary" :disabled="sendingAll || rows.length === 0" @click="sendAll">
        <Send class="w-4 h-4" /> {{ sendingAll ? 'Sending…' : 'Send all with balance' }}
      </UiButton>
    </div>

    <UiTable :headers="['Account', 'Invoices', 'Outstanding', 'Credits on account', 'Overdue', 'Oldest due', '']">
      <template v-if="loading">
        <tr v-for="n in 3" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in 7" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded" /></td>
        </tr>
      </template>
      <template v-else-if="rows.length === 0">
        <tr><td colspan="7" class="px-4 py-10 text-center text-sm text-slate-400">Nothing outstanding — all B2B accounts are settled.</td></tr>
      </template>
      <template v-else>
        <template v-for="row in rows" :key="row.customerId">
          <tr class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" @click="toggle(row.customerId)">
            <td class="px-4 py-3.5">
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{ row.customerName }}</span>
              <span v-if="!row.customerEmail" class="ml-2 text-xs text-amber-600">no email</span>
            </td>
            <td class="px-4 py-3.5 text-slate-500">{{ row.invoiceCount }}</td>
            <td class="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200">{{ gbp(row.outstanding) }}</td>
            <td class="px-4 py-3.5 text-sm">
              <template v-if="row.creditsOnAccount > 0">
                <span class="text-green-600 font-medium">−{{ gbp(row.creditsOnAccount) }}</span>
                <span class="block text-xs text-slate-400">net {{ gbp(row.netOutstanding) }}</span>
              </template>
              <span v-else class="text-slate-400">—</span>
            </td>
            <td class="px-4 py-3.5">
              <UiBadge v-if="row.overdue > 0" variant="cancelled" dot>{{ gbp(row.overdue) }}</UiBadge>
              <span v-else class="text-slate-400 text-sm">—</span>
            </td>
            <td class="px-4 py-3.5 text-sm text-slate-400">{{ formatDate(row.oldestDueDate) }}</td>
            <td class="px-4 py-3.5">
              <div class="flex items-center justify-end gap-1.5" @click.stop>
                <button class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600" title="Download PDF" @click="pdf(row)">
                  <Download class="w-4 h-4" />
                </button>
                <button v-if="canSend" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-brand-600" title="Email statement" :disabled="sendingId === row.customerId" @click="send(row)">
                  <Send class="w-4 h-4" />
                </button>
                <component :is="expandedId === row.customerId ? ChevronUp : ChevronDown" class="w-4 h-4 text-slate-400" />
              </div>
            </td>
          </tr>
          <tr v-if="expandedId === row.customerId">
            <td colspan="7" class="px-4 pb-4 bg-slate-50/60 dark:bg-white/[0.03]">
              <p v-if="detailLoading" class="py-3 text-sm text-slate-400 animate-pulse">Loading…</p>
              <template v-else-if="detail">
                <table class="w-full text-sm mt-2 mb-3">
                  <thead>
                    <tr class="text-left text-xs uppercase tracking-wide text-slate-400">
                      <th class="py-1.5 pr-4">Invoice</th>
                      <th class="py-1.5 pr-4">Job</th>
                      <th class="py-1.5 pr-4">Issued</th>
                      <th class="py-1.5 pr-4">Due</th>
                      <th class="py-1.5 pr-4 text-right">Total</th>
                      <th class="py-1.5 pr-4 text-right">Paid</th>
                      <th class="py-1.5 pr-4 text-right">Credited</th>
                      <th class="py-1.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="inv in detail.rows" :key="inv.invoiceId" class="border-t border-slate-100 dark:border-dark-border/50">
                      <td class="py-2 pr-4"><router-link :to="`/invoices/${inv.invoiceId}`" class="text-brand-600 hover:underline font-medium">{{ inv.invoiceNumber }}</router-link></td>
                      <td class="py-2 pr-4 text-slate-500">{{ inv.jobNumber ?? '—' }}</td>
                      <td class="py-2 pr-4 text-slate-500">{{ formatDate(inv.issuedAt) }}</td>
                      <td class="py-2 pr-4" :class="inv.overdueDays > 0 ? 'text-red-600 font-medium' : 'text-slate-500'">{{ formatDate(inv.dueDate) }}</td>
                      <td class="py-2 pr-4 text-right text-slate-600 dark:text-slate-300">{{ gbp(inv.gross) }}</td>
                      <td class="py-2 pr-4 text-right text-slate-500">{{ gbp(inv.paid) }}</td>
                      <td class="py-2 pr-4 text-right text-slate-500">{{ inv.credited > 0 ? gbp(inv.credited) : '—' }}</td>
                      <td class="py-2 text-right font-semibold text-slate-700 dark:text-slate-200">{{ gbp(inv.balance) }}</td>
                    </tr>
                    <tr v-if="detail.rows.length === 0">
                      <td colspan="8" class="py-2 text-slate-400">No invoices outstanding.</td>
                    </tr>
                  </tbody>
                </table>
                <div v-if="detail.credits.length" class="mb-3 rounded-lg border border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10 px-3 py-2.5">
                  <p class="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400 mb-1.5">Credits on account</p>
                  <div v-for="c in detail.credits" :key="c.creditNoteId" class="flex items-center justify-between text-sm py-0.5">
                    <span>
                      <router-link :to="{ path: '/invoices', query: { tab: 'credit-notes', cn: c.creditNoteId } }" class="text-brand-600 hover:underline font-medium">{{ c.creditNoteNumber }}</router-link>
                      <span class="text-xs text-slate-400"> · {{ formatDate(c.issuedAt) }} · {{ c.reason.replace(/_/g, ' ') }}</span>
                    </span>
                    <span class="font-medium text-green-700 dark:text-green-400">−{{ gbp(c.remaining) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-sm font-semibold border-t border-green-100 dark:border-green-900/30 mt-1.5 pt-1.5">
                    <span class="text-slate-700 dark:text-slate-200">Net balance due</span>
                    <span class="text-slate-800 dark:text-slate-100">{{ gbp(detail.netOutstanding) }}</span>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2 text-xs">
                  <span class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500">Current {{ gbp(detail.ageing.current) }}</span>
                  <span class="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600">1–30 days {{ gbp(detail.ageing.days1to30) }}</span>
                  <span class="px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600">31–60 days {{ gbp(detail.ageing.days31to60) }}</span>
                  <span class="px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600">60+ days {{ gbp(detail.ageing.days60plus) }}</span>
                </div>
              </template>
            </td>
          </tr>
        </template>
      </template>
    </UiTable>
  </div>
</template>
