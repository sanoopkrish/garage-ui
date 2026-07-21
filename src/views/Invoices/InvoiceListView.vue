<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { Eye, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { getInvoices } from '@/api/invoices.api'
import type { Invoice } from '@/api/invoices.api'
import { InvoiceStatus, InvoicePaymentStatus } from '@/types/generated/enums/invoice'
import { invoiceStatusLabels, paymentStatusLabels, paymentStatusVariant, gbp } from '@/utils/invoiceStatus'
import { ToastService } from '@/services/toast.service'

const invoices = ref<Invoice[]>([])
const total = ref(0)
const loading = ref(true)
const page = ref(1)
const pageSize = 10
const totalPages = ref(1)

const searchQuery = ref('')
const statusFilter = ref<'' | InvoicePaymentStatus>('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const statusOptions = [
  { value: '', label: 'All payment statuses' },
  ...Object.values(InvoicePaymentStatus).map((s) => ({ value: s, label: paymentStatusLabels[s] })),
]

async function load(p = page.value) {
  loading.value = true
  try {
    const response = await getInvoices({
      search: searchQuery.value || undefined,
      paymentStatus: statusFilter.value || undefined,
      page: p,
      pageSize,
    })
    invoices.value = response.items
    total.value = response.total
    page.value = p
    totalPages.value = Math.max(1, Math.ceil(response.total / pageSize))
  } catch {
    ToastService.error('Failed to load invoices')
  } finally {
    loading.value = false
  }
}

function onSearch(val: string) {
  searchQuery.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(1), 350)
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d }
}

onMounted(() => load(1))
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Invoices" subtitle="Sales invoices, payments and outstanding balances." />

    <div class="flex items-center gap-3 mb-5">
      <UiSearchInput :modelValue="searchQuery" placeholder="Search invoice no, customer, job..." @update:modelValue="onSearch" />
      <div class="w-52">
        <UiSelect v-model="statusFilter" :options="statusOptions" @update:modelValue="() => load(1)" />
      </div>
      <span class="text-sm text-slate-400 ml-auto">{{ total }} invoices</span>
    </div>

    <UiTable :headers="['Invoice', 'Customer', 'Job', 'Issued', 'Due', 'Total', 'Balance', 'Status', '']">
      <template v-if="loading && invoices.length === 0">
        <tr v-for="n in 5" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in 9" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded" /></td>
        </tr>
      </template>
      <template v-else-if="!loading && invoices.length === 0">
        <tr><td colspan="9" class="px-4 py-10 text-center text-sm text-slate-400">No invoices found.</td></tr>
      </template>
      <tr v-else v-for="inv in invoices" :key="inv.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
        <td class="px-4 py-3.5">
          <router-link :to="`/invoices/${inv.id}`" class="font-semibold text-brand-600 hover:underline">{{ inv.invoiceNumber }}</router-link>
        </td>
        <td class="px-4 py-3.5 text-slate-700 dark:text-slate-200 font-medium">{{ inv.customerName ?? '—' }}</td>
        <td class="px-4 py-3.5">
          <router-link :to="`/jobs/${inv.jobId}`" class="text-sm text-brand-600 hover:underline">{{ inv.jobNumber ?? '—' }}</router-link>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-400">{{ formatDate(inv.issuedAt) }}</td>
        <td class="px-4 py-3.5 text-sm text-slate-400">{{ formatDate(inv.dueDate) }}</td>
        <td class="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200">{{ gbp(inv.grossTotal) }}</td>
        <td class="px-4 py-3.5 text-slate-500 dark:text-slate-400">{{ gbp(inv.balance) }}</td>
        <td class="px-4 py-3.5">
          <UiBadge v-if="inv.status === InvoiceStatus.ISSUED" :variant="(paymentStatusVariant[inv.paymentStatus] as any)" dot>{{ paymentStatusLabels[inv.paymentStatus] }}</UiBadge>
          <UiBadge v-if="inv.accountingSyncStatus === 'synced'" variant="done">Xero</UiBadge>
          <UiBadge v-else-if="inv.accountingSyncStatus === 'error'" variant="cancelled">Xero !</UiBadge>
          <UiBadge v-else variant="pending" dot>{{ invoiceStatusLabels[inv.status] }}</UiBadge>
        </td>
        <td class="px-4 py-3.5">
          <router-link :to="`/invoices/${inv.id}`" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors inline-block">
            <Eye class="w-4 h-4" />
          </router-link>
        </td>
      </tr>
    </UiTable>

    <div v-if="totalPages > 1" class="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="page <= 1" @click="load(page - 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronLeft class="w-4 h-4" /></button>
      <button :disabled="page >= totalPages" @click="load(page + 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronRight class="w-4 h-4" /></button>
    </div>
  </DefaultLayout>
</template>
