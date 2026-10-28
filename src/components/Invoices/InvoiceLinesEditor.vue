<script setup lang="ts">
import { computed } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import { gbp } from '@/utils/invoiceStatus'

/**
 * Shared net-lines editor for draft invoices and credit notes (Sprint 20 extraction
 * from InvoiceEditModal). Generic over the line-type enum via `lineTypeOptions`.
 */
export interface EditableLine {
  key: number
  lineType: string
  description: string
  quantity: number
  unitPrice: number
  /** carried through untouched (credit notes: the invoice line being credited) */
  invoiceLineId?: string
}

const props = defineProps<{
  modelValue: EditableLine[]
  vatRatePercent: number
  lineTypeOptions: { value: string; label: string }[]
  defaultLineType: string
  totalLabel?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [lines: EditableLine[]]; 'update:vatRatePercent': [value: number] }>()

let keySeq = Date.now()
const lines = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })
const vat = computed({ get: () => props.vatRatePercent, set: (v) => emit('update:vatRatePercent', Number(v) || 0) })

function addLine() {
  lines.value = [...lines.value, { key: keySeq++, lineType: props.defaultLineType, description: '', quantity: 1, unitPrice: 0 }]
}
function removeLine(key: number) {
  lines.value = lines.value.filter((l) => l.key !== key)
}

const netTotal = computed(() => lines.value.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0))
const grossTotal = computed(() => netTotal.value * (1 + (Number(vat.value) || 0) / 100))
const inputClass = 'w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-dark-border">
            <th class="py-2 pr-2 w-32">Type</th>
            <th class="py-2 pr-2">Description</th>
            <th class="py-2 pr-2 w-16 text-right">Qty</th>
            <th class="py-2 pr-2 w-24 text-right">Unit £ (net)</th>
            <th class="py-2 pr-2 w-24 text-right">Total</th>
            <th class="py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in lines" :key="line.key" class="border-b border-slate-50 dark:border-dark-border/50">
            <td class="py-1.5 pr-2">
              <select v-model="line.lineType" :class="[inputClass, 'text-xs']">
                <option v-for="opt in lineTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </td>
            <td class="py-1.5 pr-2"><input v-model="line.description" type="text" placeholder="Description" :class="inputClass" /></td>
            <td class="py-1.5 pr-2"><input v-model.number="line.quantity" type="number" min="1" max="999" :class="[inputClass, 'text-right']" /></td>
            <td class="py-1.5 pr-2"><input v-model.number="line.unitPrice" type="number" min="0" step="0.01" :class="[inputClass, 'text-right']" /></td>
            <td class="py-1.5 pr-2 text-right font-medium text-slate-700 dark:text-slate-200">
              {{ gbp((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)) }}
            </td>
            <td class="py-1.5 text-right">
              <button type="button" class="p-1 text-slate-400 hover:text-red-500" title="Remove line" @click="removeLine(line.key)">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
          <tr v-if="lines.length === 0">
            <td colspan="6" class="py-4 text-center text-sm text-slate-400">No lines yet — add one.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between">
      <UiButton variant="secondary" size="sm" @click="addLine"><Plus class="w-3.5 h-3.5" /> Add line</UiButton>
      <div class="flex items-center gap-4 text-sm">
        <label class="flex items-center gap-2 text-slate-500 whitespace-nowrap">VAT %
          <input v-model.number="vat" type="number" min="0" max="100" :class="[inputClass, 'w-16 text-right']" />
        </label>
        <span class="text-slate-500">Net {{ gbp(netTotal) }}</span>
        <span class="font-semibold text-slate-800 dark:text-slate-100">{{ totalLabel ?? 'Total' }} {{ gbp(grossTotal) }}</span>
      </div>
    </div>
  </div>
</template>
