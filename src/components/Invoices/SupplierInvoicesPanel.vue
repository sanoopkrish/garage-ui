<script setup lang="ts">
import { ref, onMounted } from 'vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import { FileText, ExternalLink } from 'lucide-vue-next'
import { getSupplierInvoices, type SupplierInvoiceRow } from '@/api/invoices.api'
import { getViewUrl } from '@/api/files.api'
import { ToastService } from '@/services/toast.service'

const rows = ref<SupplierInvoiceRow[]>([])
const loading = ref(true)

const currentYear = new Date().getFullYear()
const month = ref('') // '' = all, '1'..'12'
const year = ref('')  // '' = all, e.g. '2026'
const monthOptions = [
  { value: '', label: 'All months' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i, 1).toLocaleDateString('en-GB', { month: 'long' }),
  })),
]
const yearOptions = [
  { value: '', label: 'All years' },
  ...Array.from({ length: 5 }, (_, i) => ({ value: String(currentYear - i), label: String(currentYear - i) })),
]

async function load() {
  loading.value = true
  try {
    let from: string | undefined
    let to: string | undefined
    const y = year.value ? Number(year.value) : undefined
    const m = month.value ? Number(month.value) : undefined
    if (y && m) {
      from = `${y}-${String(m).padStart(2, '0')}-01`
      to = new Date(y, m, 0).toISOString().slice(0, 10) // last day of month
    } else if (y) {
      from = `${y}-01-01`
      to = `${y}-12-31`
    }
    // month without a year applies to the current year
    if (!y && m) {
      from = `${currentYear}-${String(m).padStart(2, '0')}-01`
      to = new Date(currentYear, m, 0).toISOString().slice(0, 10)
    }
    rows.value = await getSupplierInvoices({ from, to })
  } catch {
    ToastService.error('Failed to load supplier invoices')
  } finally {
    loading.value = false
  }
}

async function open(row: SupplierInvoiceRow) {
  try {
    window.open(await getViewUrl(row.s3Key, row.fileType), '_blank')
  } catch {
    ToastService.error('Failed to open file')
  }
}

function formatDate(d: string): string {
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d }
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <p class="text-sm text-slate-500 dark:text-slate-400">
        Supplier purchase invoices filed against jobs — upload them on the job's Photos &amp; Files card.
      </p>
      <div class="flex items-center gap-2">
        <div class="w-36"><UiSelect v-model="month" :options="monthOptions" @update:modelValue="load" /></div>
        <div class="w-28"><UiSelect v-model="year" :options="yearOptions" @update:modelValue="load" /></div>
      </div>
    </div>

    <UiTable :headers="['Uploaded', 'Job', 'Customer', 'Supplier / PO', 'File', '']">
      <template v-if="loading">
        <tr v-for="n in 3" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in 6" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded" /></td>
        </tr>
      </template>
      <template v-else-if="rows.length === 0">
        <tr><td colspan="6" class="px-4 py-10 text-center text-sm text-slate-400">No supplier invoices{{ month || year ? ' in this period' : '' }} — upload them from the job's Photos &amp; Files card with category "Supplier invoice".</td></tr>
      </template>
      <tr v-else v-for="row in rows" :key="row.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
        <td class="px-4 py-3.5 text-sm text-slate-400">{{ formatDate(row.uploadedAt) }}</td>
        <td class="px-4 py-3.5"><router-link :to="`/jobs/${row.jobId}`" class="text-brand-600 hover:underline font-medium">{{ row.jobNumber }}</router-link></td>
        <td class="px-4 py-3.5 text-slate-600 dark:text-slate-300">{{ row.customerName }}</td>
        <td class="px-4 py-3.5 text-sm text-slate-500">
          <span v-if="row.suppliers">{{ row.suppliers }}</span>
          <span v-if="row.orderNumbers" class="text-xs text-slate-400"> · {{ row.orderNumbers }}</span>
          <span v-if="!row.suppliers && !row.orderNumbers" class="text-slate-400">—</span>
        </td>
        <td class="px-4 py-3.5">
          <button class="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200 hover:text-brand-600" @click="open(row)">
            <FileText class="w-4 h-4 text-slate-400" /> {{ row.fileName }}
            <span class="text-xs text-slate-400">{{ formatSize(row.fileSize) }}</span>
          </button>
        </td>
        <td class="px-4 py-3.5 text-right">
          <button class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-brand-600" title="Open" @click="open(row)">
            <ExternalLink class="w-4 h-4" />
          </button>
        </td>
      </tr>
    </UiTable>
  </div>
</template>
