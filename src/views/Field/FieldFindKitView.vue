<script setup lang="ts">
import { ref } from 'vue'
import FieldLayout from '@/components/Layout/FieldLayout.vue'
import { MapPin, Search } from 'lucide-vue-next'
import { findAssets, locateAsset, type AssetFindRow, type LocateResult } from '@/api/assets.api'
import AssetLocateMap from '@/components/Assets/AssetLocateMap.vue'
import { assetCategoryLabels, assetStatusLabels } from '@/utils/assets'

/** Field app — "Find kit" (Sprint 21): where is the Autel? Read only. */
const query = ref('')
const rows = ref<AssetFindRow[]>([])
const searched = ref(false)
const loading = ref(false)
const located = ref<Record<string, LocateResult>>({})
let timer: ReturnType<typeof setTimeout> | undefined

function onInput() {
  clearTimeout(timer)
  timer = setTimeout(search, 300)
}
async function search() {
  if (query.value.trim().length < 2) { rows.value = []; searched.value = false; return }
  loading.value = true
  try { rows.value = await findAssets(query.value.trim()); searched.value = true } finally { loading.value = false }
}
async function locate(row: AssetFindRow) {
  if (located.value[row.id]) { delete located.value[row.id]; return }
  try { located.value[row.id] = await locateAsset(row.id) } catch { /* shown as unknown */ }
}
</script>

<template>
  <FieldLayout title="Find kit">
    <div class="relative mb-4">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input v-model="query" type="search" placeholder="Autel, ADAS frame, serial number…" autofocus
        class="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface pl-9 pr-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-400"
        @input="onInput" />
    </div>
    <div v-if="loading" class="card !p-4 animate-pulse"><div class="h-4 bg-slate-200 dark:bg-white/10 rounded w-1/2" /></div>
    <p v-else-if="searched && !rows.length" class="text-sm text-slate-400 text-center py-6">Nothing on the register matches "{{ query }}".</p>
    <p v-else-if="!searched" class="text-sm text-slate-400 text-center py-6">Type the name, tag or serial number of the kit you are looking for.</p>
    <div v-else class="space-y-3">
      <div v-for="row in rows" :key="row.id" class="card !p-4">
        <div class="flex items-start gap-3">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-800 dark:text-white">{{ row.name }}</p>
            <p class="text-xs text-slate-400">{{ row.assetTag }} · {{ assetCategoryLabels[row.category] }}<span v-if="row.status !== 'active'"> · {{ assetStatusLabels[row.status] }}</span></p>
            <p class="mt-1.5 flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200"><MapPin class="w-4 h-4 text-brand-500" /> {{ row.locationLabel }}</p>
          </div>
          <button class="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-500 text-white" @click="locate(row)">{{ located[row.id] ? 'Hide' : 'Locate' }}</button>
        </div>
        <div v-if="located[row.id]" class="mt-3">
          <p class="text-sm text-slate-500">{{ located[row.id].detail || located[row.id].label }}</p>
          <AssetLocateMap v-if="located[row.id].lat !== null && located[row.id].lng !== null" class="mt-2" :lat="located[row.id].lat!" :lng="located[row.id].lng!" :label="row.assetTag" />
        </div>
      </div>
    </div>
  </FieldLayout>
</template>
