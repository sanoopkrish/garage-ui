<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Tags, Search, Loader2 } from 'lucide-vue-next'
import { pickPriceList, type PriceListPickRow } from '@/api/price-list.api'
import { gbp } from '@/utils/invoiceStatus'

/**
 * Sprint 32 — "Add item" button that opens the price list, searchable and grouped by category.
 * Prices shown are the ones that apply to `customerId` (their agreed price, else the standard
 * one). Emits the chosen row; the dropdown stays open so several items can be added in a row.
 * Renders nothing when the price list is empty or the user may not read it.
 */
const props = withDefaults(defineProps<{ customerId?: string; label?: string; align?: 'left' | 'right' }>(), { label: 'Add item', align: 'left' })
const emit = defineEmits<{ pick: [row: PriceListPickRow] }>()

const rows = ref<PriceListPickRow[]>([])
const loaded = ref(false)
const available = ref(true)
const loading = ref(false)
const open = ref(false)
const query = ref('')

async function load() {
  loading.value = true
  try {
    rows.value = await pickPriceList(props.customerId)
    available.value = rows.value.length > 0
  } catch {
    available.value = false // no access to the price list → no button
  } finally {
    loaded.value = true
    loading.value = false
  }
}

// Prices depend on the customer, so reload when it changes
watch(() => props.customerId, () => { loaded.value = false; load() }, { immediate: true })

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  const filtered = q ? rows.value.filter((r) => r.name.toLowerCase().includes(q) || (r.category ?? '').toLowerCase().includes(q)) : rows.value
  const byCategory = new Map<string, PriceListPickRow[]>()
  for (const row of filtered) {
    const key = row.category || 'Other'
    byCategory.set(key, [...(byCategory.get(key) ?? []), row])
  }
  return [...byCategory.entries()].map(([category, items]) => ({ category, items }))
})

function toggle() {
  open.value = !open.value
  if (open.value) query.value = ''
}
function close() { open.value = false }
</script>

<template>
  <div v-if="available" v-click-outside="close" class="relative inline-block">
    <button type="button"
      class="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 text-sm font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-500/20"
      @click="toggle">
      <Tags class="w-3.5 h-3.5" /> {{ label }}
    </button>

    <div v-if="open"
      :class="['absolute z-30 mt-1 w-80 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-lg', align === 'right' ? 'right-0' : 'left-0']">
      <div class="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-dark-border">
        <Search class="w-3.5 h-3.5 text-slate-400" />
        <input v-model="query" type="text" placeholder="Search the price list…" autofocus
          class="w-full bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none" />
      </div>
      <div class="max-h-72 overflow-y-auto py-1">
        <p v-if="loading && !loaded" class="px-3 py-3 text-sm text-slate-400"><Loader2 class="inline w-3.5 h-3.5 animate-spin" /> Loading…</p>
        <p v-else-if="groups.length === 0" class="px-3 py-3 text-sm text-slate-400">Nothing matches.</p>
        <template v-for="group in groups" :key="group.category">
          <p class="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{{ group.category }}</p>
          <button v-for="row in group.items" :key="row.id" type="button"
            class="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
            @click="emit('pick', row)">
            <span class="text-slate-700 dark:text-slate-200">{{ row.name }}</span>
            <span class="shrink-0 text-right">
              <span v-if="row.price !== null" class="font-medium text-slate-700 dark:text-slate-200">{{ gbp(row.price) }}</span>
              <span v-else class="text-xs text-amber-600">price on the job</span>
              <span v-if="row.priceSource === 'customer'" class="block text-[10px] text-brand-600">customer price</span>
            </span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
