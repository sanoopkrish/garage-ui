<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { Truck, Plus, MapPin } from 'lucide-vue-next'
import { getPartsOrders, createFromQuote, type PartsOrder } from '@/api/parts-orders.api'
import { getQuotesForJob, type Quote } from '@/api/quotes.api'
import { QuoteLineStatus, QuoteLineType } from '@/types/generated/enums/quote'
import { PartsOrderStatus } from '@/types/generated/enums/job'
import { useCrudPermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showInputDialog } from '@/utils/alert'

const props = defineProps<{ jobId: string }>()

const { canCreate } = useCrudPermissions('stock', 'inventory')

const orders = ref<PartsOrder[]>([])
const quotes = ref<Quote[]>([])
const loading = ref(true)
const creating = ref(false)

const statusLabels: Record<PartsOrderStatus, string> = {
  [PartsOrderStatus.TO_ORDER]: 'To Order',
  [PartsOrderStatus.ORDERED]: 'Ordered',
  [PartsOrderStatus.DELAYED]: 'Delayed',
  [PartsOrderStatus.RECEIVED]: 'Received',
  [PartsOrderStatus.WRONG_PART]: 'Wrong Part',
  [PartsOrderStatus.RETURNED]: 'Returned',
}
const statusVariant: Record<PartsOrderStatus, string> = {
  [PartsOrderStatus.TO_ORDER]: 'open',
  [PartsOrderStatus.ORDERED]: 'progress',
  [PartsOrderStatus.DELAYED]: 'pending',
  [PartsOrderStatus.RECEIVED]: 'done',
  [PartsOrderStatus.WRONG_PART]: 'cancelled',
  [PartsOrderStatus.RETURNED]: 'cancelled',
}

/** Quote with approved part lines not yet on any order → orderable */
const orderableQuote = computed<Quote | null>(() => {
  const orderedQuoteLineIds = new Set(
    orders.value.flatMap((o) => o.lines.map((l) => l.quoteLineId)).filter(Boolean),
  )
  for (const quote of quotes.value) {
    const pending = (quote.lines ?? []).filter(
      (l) => l.lineType === QuoteLineType.PART
        && l.lineStatus === QuoteLineStatus.APPROVED
        && !orderedQuoteLineIds.has(l.id),
    )
    if (pending.length) return quote
  }
  return null
})

async function load() {
  loading.value = true
  try {
    const [orderResult, jobQuotes] = await Promise.all([
      getPartsOrders({ jobId: props.jobId, pageSize: 50 }),
      getQuotesForJob(props.jobId).catch(() => []),
    ])
    orders.value = orderResult.items
    quotes.value = jobQuotes
  } finally {
    loading.value = false
  }
}

async function orderFromQuote() {
  if (!orderableQuote.value) return
  const result = await showInputDialog('Order Parts', 'Supplier name', 'e.g. Euro Car Parts', true, 'Create Order')
  if (!result.isConfirmed || !result.value?.trim()) return
  creating.value = true
  try {
    const order = await createFromQuote(orderableQuote.value.id, result.value.trim())
    ToastService.success(`${order.orderNumber} created with ${order.lines.length} line${order.lines.length === 1 ? '' : 's'}`)
    await load()
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not create the parts order')
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <Truck class="w-4 h-4 text-brand-500" /> Parts
      </h2>
      <UiButton v-if="canCreate && orderableQuote" size="sm" :disabled="creating" @click="orderFromQuote">
        <Plus class="w-3.5 h-3.5" /> Order parts from quote
      </UiButton>
    </div>

    <div v-if="loading" class="h-16 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <div v-else-if="orders.length" class="space-y-3">
      <div v-for="order in orders" :key="order.id" class="border border-slate-100 dark:border-dark-border rounded-lg p-3.5">
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <router-link to="/inventory" class="font-semibold text-brand-600 hover:underline">{{ order.orderNumber }}</router-link>
          <UiBadge :variant="(statusVariant[order.status] as any)" dot>{{ statusLabels[order.status] }}</UiBadge>
          <span class="text-sm text-slate-500">{{ order.supplierName }}</span>
          <span v-if="order.expectedDate" class="ml-auto text-xs text-slate-400">ETA {{ new Date(order.expectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }}</span>
        </div>
        <span v-if="order.delayNotes" class="block text-xs text-amber-600 mb-1.5">{{ order.delayNotes }}</span>
        <ul class="space-y-1">
          <li v-for="line in order.lines" :key="line.id" class="flex items-center gap-2 text-sm">
            <span :class="['w-2 h-2 rounded-full flex-shrink-0', line.receivedQuantity >= line.quantity ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600']" />
            <span class="flex-1 text-slate-600 dark:text-slate-300 truncate">{{ line.description }}</span>
            <span class="text-xs text-slate-400">{{ line.receivedQuantity }}/{{ line.quantity }}</span>
            <span v-if="line.shelfLocation" class="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500"><MapPin class="w-3 h-3 text-brand-500" />{{ line.shelfLocation }}</span>
          </li>
        </ul>
      </div>
    </div>

    <p v-else class="text-sm text-slate-400">
      No parts on order for this job{{ orderableQuote ? ' — the approved quote has part lines ready to order.' : '.' }}
    </p>
  </div>
</template>
