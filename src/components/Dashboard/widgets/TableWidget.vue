<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { TableData } from '@/api/dashboard.api'
import { formatCell } from '@/utils/dashboard'

const props = defineProps<{ data: TableData; size: string }>()
const router = useRouter()

function open(row: Record<string, any>) {
  const link = props.data.rowLinkKey ? row[props.data.rowLinkKey] : null
  if (link) router.push(link)
}
</script>

<template>
  <div class="overflow-x-auto -mx-1">
    <table v-if="data?.rows?.length" class="w-full text-sm">
      <thead>
        <tr class="text-xs text-slate-400 dark:text-slate-500">
          <th v-for="c in data.columns" :key="c.key" :class="['font-medium pb-2 px-1', c.align === 'right' ? 'text-right' : 'text-left']">{{ c.label }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 dark:divide-white/5">
        <tr
          v-for="(row, i) in data.rows"
          :key="row.id ?? i"
          :class="data.rowLinkKey && row[data.rowLinkKey] ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5' : ''"
          @click="open(row)"
        >
          <td
            v-for="c in data.columns"
            :key="c.key"
            :class="['py-2 px-1 text-slate-700 dark:text-slate-200 whitespace-nowrap', c.align === 'right' ? 'text-right tabular-nums' : 'text-left']"
          >
            {{ formatCell(row[c.key], c.format) }}
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="text-sm text-slate-400">Nothing to show.</p>
  </div>
</template>
