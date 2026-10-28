<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ClipboardCheck } from 'lucide-vue-next'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { getTimesheets, type Timesheet } from '@/api/timesheets.api'
import { h2, timesheetStatusLabels, timesheetStatusVariant, weekLabel } from '@/utils/hr'
import { usePermissions } from '@/composables/usePermissions'

/** Attendance vs job hours for the last 4 weeks (Sprint 18) — needs menus.hr.timesheets.read */
const props = defineProps<{ technicianId: string }>()
const { hasPermission: canSee } = usePermissions('menus.hr.timesheets.read')
const sheets = ref<Timesheet[]>([])
const loading = ref(true)

onMounted(async () => {
  if (!canSee.value) { loading.value = false; return }
  try {
    sheets.value = (await getTimesheets({ userId: props.technicianId })).slice(0, 4)
  } catch {
    /* card stays empty */
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="canSee" class="card">
    <div class="flex items-center gap-2 mb-3">
      <ClipboardCheck class="w-4 h-4 text-brand-500" />
      <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Attendance (last 4 weeks)</h2>
    </div>
    <p v-if="loading" class="text-sm text-slate-400 animate-pulse">Loading…</p>
    <p v-else-if="sheets.length === 0" class="text-sm text-slate-400">No timesheets yet.</p>
    <div v-else class="space-y-2 text-sm">
      <router-link
        v-for="s in sheets" :key="s.id" :to="`/hr/timesheets/${s.id}`"
        class="flex items-center justify-between gap-2 border-b border-slate-50 dark:border-dark-border pb-2 last:border-0 last:pb-0 hover:text-brand-600"
      >
        <div>
          <p class="font-medium text-slate-700 dark:text-slate-200">{{ weekLabel(s.periodStart, s.periodEnd) }}</p>
          <p class="text-xs text-slate-400">Attended {{ h2(s.attendedHours) }}h · on jobs {{ h2(s.jobHours) }}h<template v-if="s.overtimeHours > 0"> · overtime {{ h2(s.overtimeHours) }}h</template></p>
        </div>
        <UiBadge :variant="(timesheetStatusVariant[s.status] as any)">{{ timesheetStatusLabels[s.status] }}</UiBadge>
      </router-link>
    </div>
  </div>
</template>
