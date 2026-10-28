<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import { createGoodsReceipt, receivePurchaseOrder, type PurchaseOrder } from '@/api/procurement/purchase-orders.api'
import { GoodsReceiptCondition } from '@/types/generated/enums/procurement'
import { apiMessage, conditionLabels, todayIso } from '@/utils/procurement'
import { useProcurementStore } from '@/stores/procurement.store'
import { ToastService } from '@/services/toast.service'

/**
 * Booking a delivery in. With booking-in records on this creates a goods receipt (received / rejected /
 * condition per line, delivery note ref); with them off it is a quick "received" tick per line.
 */
const props = defineProps<{ open: boolean; order: PurchaseOrder | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const procurement = useProcurementStore()

interface Line { itemId: string; description: string; outstanding: number; received: number; rejected: number; condition: GoodsReceiptCondition; remarks: string }
const lines = ref<Line[]>([])
const form = reactive({ receivedDate: todayIso(), deliveryNoteRef: '', notes: '' })
const saving = ref(false)
const full = computed(() => procurement.goodsReceiptsEnabled)
const conditionOptions = Object.values(GoodsReceiptCondition).map((c) => ({ value: c, label: conditionLabels[c] }))

watch(() => props.open, (open) => {
  if (!open || !props.order) return
  Object.assign(form, { receivedDate: todayIso(), deliveryNoteRef: '', notes: '' })
  lines.value = props.order.items
    .map((i) => ({
      itemId: i.id, description: i.description, outstanding: Math.round((i.quantity - i.receivedQuantity) * 100) / 100,
      received: Math.round((i.quantity - i.receivedQuantity) * 100) / 100, rejected: 0, condition: GoodsReceiptCondition.GOOD, remarks: '',
    }))
    .filter((l) => l.outstanding > 0)
})

async function save() {
  if (!props.order) return
  const arriving = lines.value.filter((l) => Number(l.received) > 0)
  if (!arriving.length) { ToastService.error('Enter the quantity that arrived on at least one line'); return }
  const tooMany = arriving.find((l) => Number(l.received) - Number(l.rejected || 0) > l.outstanding)
  if (tooMany) { ToastService.error(`"${tooMany.description}": only ${tooMany.outstanding} outstanding`); return }
  if (arriving.some((l) => Number(l.rejected || 0) > Number(l.received))) { ToastService.error('Rejected cannot be more than the quantity that arrived'); return }

  saving.value = true
  try {
    if (full.value) {
      const receipt = await createGoodsReceipt({
        purchaseOrderId: props.order.id,
        receivedDate: form.receivedDate || undefined,
        deliveryNoteRef: form.deliveryNoteRef.trim() || undefined,
        notes: form.notes.trim() || undefined,
        items: arriving.map((l) => ({
          purchaseOrderItemId: l.itemId, quantityReceived: Number(l.received), quantityRejected: Number(l.rejected) || 0,
          condition: l.condition, remarks: l.remarks.trim() || undefined,
        })),
      })
      ToastService.success(`Delivery booked in — ${receipt.grnNumber}`)
    } else {
      await receivePurchaseOrder(props.order.id, arriving.map((l) => ({ purchaseOrderItemId: l.itemId, quantityReceived: Number(l.received) })))
      ToastService.success('Marked as received')
    }
    emit('saved')
    emit('close')
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to book the delivery in'))
  } finally {
    saving.value = false
  }
}

const inputClass = 'w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
</script>

<template>
  <UiModal :open="open" :title="`Book in delivery — ${order?.poNumber ?? ''}`" size="lg" @close="emit('close')">
    <div class="space-y-4">
      <div v-if="full" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiInput v-model="form.receivedDate" label="Date received" type="date" />
        <UiInput v-model="form.deliveryNoteRef" label="Delivery note number" />
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-dark-border">
              <th class="py-2 pr-2">Item</th>
              <th class="py-2 pr-2 w-24 text-right">Outstanding</th>
              <th class="py-2 pr-2 w-24 text-right">Arrived</th>
              <template v-if="full">
                <th class="py-2 pr-2 w-24 text-right">Rejected</th>
                <th class="py-2 pr-2 w-32">Condition</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in lines" :key="line.itemId" class="border-b border-slate-50 dark:border-dark-border/50 align-top">
              <td class="py-2 pr-2 text-slate-700 dark:text-slate-200">
                {{ line.description }}
                <input v-if="full && (Number(line.rejected) > 0 || line.condition !== GoodsReceiptCondition.GOOD)" v-model="line.remarks" type="text" placeholder="What is wrong with it?" :class="[inputClass, 'mt-1.5']" />
              </td>
              <td class="py-2 pr-2 text-right text-slate-500">{{ line.outstanding }}</td>
              <td class="py-2 pr-2"><input v-model.number="line.received" type="number" min="0" step="any" :class="[inputClass, 'text-right']" /></td>
              <template v-if="full">
                <td class="py-2 pr-2"><input v-model.number="line.rejected" type="number" min="0" step="any" :class="[inputClass, 'text-right']" /></td>
                <td class="py-2 pr-2">
                  <select v-model="line.condition" :class="inputClass">
                    <option v-for="opt in conditionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </td>
              </template>
            </tr>
            <tr v-if="!lines.length"><td colspan="5" class="py-4 text-center text-slate-400">Everything on this order has been received.</td></tr>
          </tbody>
        </table>
      </div>
      <p v-if="full" class="text-xs text-slate-400">Only what you accept counts towards the order. Rejected items stay outstanding.</p>

      <div v-if="full">
        <label class="block text-xs font-medium text-slate-500 mb-1">Notes</label>
        <textarea v-model="form.notes" rows="2" class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
      </div>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Cancel</UiButton>
      <UiButton :loading="saving" :disabled="!lines.length" @click="save">{{ full ? 'Book in' : 'Mark received' }}</UiButton>
    </template>
  </UiModal>
</template>
