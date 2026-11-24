<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import { Tags, Pencil } from 'lucide-vue-next'
import { getCustomerPrices, setCustomerPrices, type CustomerItemPrice } from '@/api/price-list.api'
import { usePermissions } from '@/composables/usePermissions'
import { gbp } from '@/utils/invoiceStatus'
import { apiMessage } from '@/utils/procurement'
import { ToastService } from '@/services/toast.service'

/**
 * Sprint 32 — a customer's agreed prices: the price list items where this customer pays
 * something other than the standard price. Anything left blank uses the standard price.
 */
const props = defineProps<{ customerId: string }>()

const { hasPermission: canRead } = usePermissions('menus.finance.priceList.read')
const { hasPermission: canUpdate } = usePermissions('menus.finance.priceList.update')

const items = ref<CustomerItemPrice[]>([])
const loading = ref(true)
const agreed = computed(() => items.value.filter((i) => i.price !== null))

async function load() {
  if (!canRead.value) return
  loading.value = true
  try {
    items.value = await getCustomerPrices(props.customerId)
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to load customer prices'))
  } finally {
    loading.value = false
  }
}

// ── Edit modal: every active item, standard price beside the customer's ──
const editing = ref(false)
const saving = ref(false)
const draft = ref<Record<string, string | number>>({})

function openEdit() {
  draft.value = Object.fromEntries(items.value.map((i) => [i.priceListItemId, i.price ?? '']))
  editing.value = true
}

async function save() {
  const prices = items.value
    .filter((i) => draft.value[i.priceListItemId] !== '' && draft.value[i.priceListItemId] !== undefined)
    .map((i) => ({ priceListItemId: i.priceListItemId, price: Number(draft.value[i.priceListItemId]) }))
  if (prices.some((p) => !(p.price >= 0))) { ToastService.error('Prices must be numbers'); return }
  saving.value = true
  try {
    items.value = await setCustomerPrices(props.customerId, prices)
    ToastService.success('Customer prices saved')
    editing.value = false
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to save customer prices'))
  } finally {
    saving.value = false
  }
}

watch(() => props.customerId, load)
onMounted(load)
</script>

<template>
  <div v-if="canRead && (items.length > 0 || loading)" class="card">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <Tags class="w-4 h-4 text-brand-500" />
        <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Agreed Prices<template v-if="agreed.length"> ({{ agreed.length }})</template></h2>
      </div>
      <button v-if="canUpdate && !loading" class="text-xs font-medium text-brand-600 hover:underline inline-flex items-center gap-1" @click="openEdit">
        <Pencil class="w-3 h-3" /> Edit
      </button>
    </div>

    <p v-if="loading" class="text-sm text-slate-400 animate-pulse">Loading…</p>
    <p v-else-if="agreed.length === 0" class="text-sm text-slate-400">Pays the standard price for everything on the price list.</p>
    <div v-else class="space-y-2 text-sm">
      <div v-for="item in agreed" :key="item.priceListItemId" class="flex justify-between gap-3">
        <span class="text-slate-500">{{ item.name }}</span>
        <span class="font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
          {{ gbp(item.price ?? 0) }}
          <span v-if="item.defaultPrice !== null" class="text-xs font-normal text-slate-400 line-through ml-1">{{ gbp(item.defaultPrice) }}</span>
        </span>
      </div>
    </div>

    <UiModal :open="editing" title="Agreed prices" size="lg" @close="editing = false">
      <p class="text-sm text-slate-500 mb-3">Enter a price only where this customer pays something different. Leave blank to use the standard price.</p>
      <div class="max-h-[55vh] overflow-y-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-dark-border">
              <th class="py-2 pr-2">Item</th>
              <th class="py-2 pr-2 w-28 text-right">Standard</th>
              <th class="py-2 w-32 text-right">This customer £</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.priceListItemId" class="border-b border-slate-50 dark:border-dark-border/50">
              <td class="py-1.5 pr-2">
                <span class="text-slate-700 dark:text-slate-200">{{ item.name }}</span>
                <span v-if="item.category" class="ml-1.5 text-xs text-slate-400">{{ item.category }}</span>
              </td>
              <td class="py-1.5 pr-2 text-right text-slate-500">{{ item.defaultPrice !== null ? gbp(item.defaultPrice) : 'On the job' }}</td>
              <td class="py-1.5 text-right">
                <input v-model="draft[item.priceListItemId]" type="number" min="0" step="0.01" placeholder="Standard"
                  class="w-28 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="editing = false">Cancel</UiButton>
        <UiButton :loading="saving" @click="save">Save prices</UiButton>
      </template>
    </UiModal>
  </div>
</template>
