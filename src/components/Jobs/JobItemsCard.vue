<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import PriceListPicker from '@/components/PriceList/PriceListPicker.vue'
import { ListChecks, Plus, Trash2 } from 'lucide-vue-next'
import { getJobItems, setJobItems, type JobItem } from '@/api/jobs.api'
import type { PriceListPickRow } from '@/api/price-list.api'
import { usePermissions } from '@/composables/usePermissions'
import { gbp } from '@/utils/invoiceStatus'
import { ToastService } from '@/services/toast.service'

/**
 * Sprint 32 — "Work to invoice": the fixed-price items agreed or done on a job that needs no
 * quote. Picked from the price list (the customer's own price applies) or typed. "Create
 * invoice" on the Invoices card starts from these lines. Technician accounts see the list
 * without prices and cannot change it.
 */
const props = defineProps<{ jobId: string; customerId?: string }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const { hasPermission: canUpdateJob } = usePermissions('menus.workshop.jobs.update')
// Same rule as the Quotes card: pricing is for staff with quote or finance access
const { hasAnyPermission: canViewPricing } = usePermissions([
  'menus.workshop.jobs.createQuote',
  'menus.finance.invoices.read',
  'menus.finance.priceList.read',
])
const canEdit = computed(() => canUpdateJob.value && canViewPricing.value)

interface Row { key: number; priceListItemId?: string; description: string; quantity: number; unitPrice: number | '' }
let keySeq = 0
const rows = ref<Row[]>([])
const saved = ref('')
const loading = ref(true)
const saving = ref(false)

const snapshot = () => JSON.stringify(rows.value.map(({ key: _key, ...rest }) => rest))
const dirty = computed(() => snapshot() !== saved.value)
const netTotal = computed(() => rows.value.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0))
const unpriced = computed(() => rows.value.filter((r) => r.unitPrice === '' || !(Number(r.unitPrice) > 0)).length)

function fromServer(items: JobItem[]) {
  rows.value = items.map((i) => ({
    key: keySeq++, priceListItemId: i.priceListItemId ?? undefined, description: i.description, quantity: i.quantity,
    unitPrice: i.unitPrice === null || i.unitPrice === undefined ? '' : Number(i.unitPrice),
  }))
  saved.value = snapshot()
}

async function load() {
  loading.value = true
  try {
    fromServer(await getJobItems(props.jobId))
  } catch {
    ToastService.error('Failed to load the work to invoice')
  } finally {
    loading.value = false
  }
}

function addFromPriceList(row: PriceListPickRow) {
  rows.value = [...rows.value, { key: keySeq++, priceListItemId: row.id, description: row.name, quantity: 1, unitPrice: row.price ?? '' }]
}
function addLine() {
  rows.value = [...rows.value, { key: keySeq++, description: '', quantity: 1, unitPrice: '' }]
}
function removeRow(key: number) {
  rows.value = rows.value.filter((r) => r.key !== key)
}

async function save() {
  if (rows.value.some((r) => !r.description.trim())) { ToastService.error('Every line needs a description'); return }
  saving.value = true
  try {
    fromServer(await setJobItems(props.jobId, rows.value.map((r) => ({
      priceListItemId: r.priceListItemId,
      description: r.description.trim(),
      quantity: Number(r.quantity) || 1,
      unitPrice: r.unitPrice === '' ? null : Number(r.unitPrice),
    }))))
    ToastService.success('Work to invoice saved')
    emit('changed')
  } catch (err: any) {
    const message = err?.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to save'))
  } finally {
    saving.value = false
  }
}

watch(() => props.jobId, load)
onMounted(load)

const inputClass = 'w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
</script>

<template>
  <!-- Technicians only see the card when there is something on it -->
  <div v-if="canEdit || rows.length > 0" class="card">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <ListChecks class="w-4 h-4 text-brand-500" />
        <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Work to invoice</h2>
      </div>
      <span v-if="canViewPricing && rows.length" class="text-sm text-slate-500">Net <span class="font-semibold text-slate-700 dark:text-slate-200">{{ gbp(netTotal) }}</span></span>
    </div>

    <p v-if="loading" class="text-sm text-slate-400 animate-pulse">Loading…</p>
    <template v-else>
      <p v-if="rows.length === 0" class="text-sm text-slate-400 mb-3">
        Nothing added yet. Pick the work from the price list and the invoice starts from it — no quote needed.
      </p>

      <!-- Read-only list (technicians: no prices) -->
      <ul v-if="!canEdit" class="divide-y divide-slate-50 dark:divide-dark-border text-sm">
        <li v-for="row in rows" :key="row.key" class="py-1.5 flex justify-between gap-3">
          <span class="text-slate-700 dark:text-slate-200">{{ row.description }}</span>
          <span class="text-slate-400">× {{ row.quantity }}</span>
        </li>
      </ul>

      <template v-else>
        <table v-if="rows.length" class="w-full text-sm mb-3">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-dark-border">
              <th class="py-2 pr-2">Item</th>
              <th class="py-2 pr-2 w-16 text-right">Qty</th>
              <th class="py-2 pr-2 w-28 text-right">Price £ (net)</th>
              <th class="py-2 pr-2 w-24 text-right">Total</th>
              <th class="py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key" class="border-b border-slate-50 dark:border-dark-border/50">
              <td class="py-1.5 pr-2"><input v-model="row.description" type="text" placeholder="Description" :class="inputClass" /></td>
              <td class="py-1.5 pr-2"><input v-model.number="row.quantity" type="number" min="1" max="999" :class="[inputClass, 'text-right']" /></td>
              <td class="py-1.5 pr-2">
                <input v-model="row.unitPrice" type="number" min="0" step="0.01" placeholder="Price"
                  :class="[inputClass, 'text-right', row.unitPrice === '' ? 'border-amber-400 ring-1 ring-amber-300' : '']" />
              </td>
              <td class="py-1.5 pr-2 text-right font-medium text-slate-700 dark:text-slate-200">{{ gbp((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0)) }}</td>
              <td class="py-1.5 text-right">
                <button type="button" class="p-1 text-slate-400 hover:text-red-500" title="Remove" @click="removeRow(row.key)"><Trash2 class="w-3.5 h-3.5" /></button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="flex flex-wrap items-center gap-2">
          <PriceListPicker :customerId="customerId" @pick="addFromPriceList" />
          <UiButton variant="secondary" size="sm" @click="addLine"><Plus class="w-3.5 h-3.5" /> Add line</UiButton>
          <span v-if="unpriced > 0 && rows.length" class="text-xs text-amber-600">{{ unpriced }} line{{ unpriced === 1 ? '' : 's' }} still to price</span>
          <UiButton v-if="dirty" class="ml-auto" size="sm" :loading="saving" @click="save">Save</UiButton>
        </div>
      </template>
    </template>
  </div>
</template>
