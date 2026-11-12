<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import { ChevronLeft, ChevronRight, MapPin, Warehouse, Printer, Search, AlertTriangle, GripVertical, CalendarRange } from 'lucide-vue-next'
import { getPlanner, planVisit, moveVisit, type PlannerData, type PlannerVisit, type PlannerUnscheduledJob } from '@/api/jobs.api'
import { VisitStatus, WorkLocation } from '@/types/generated/enums/job'
import { usePermissions } from '@/composables/usePermissions'
import { jobStatusLabels, jobStatusBadgeVariant } from '@/utils/jobStatus'
import { ToastService } from '@/services/toast.service'

/**
 * Sprint 27 — Assignments planner: technicians as rows, the week as columns.
 * Drag an unscheduled job onto a day to plan it; drag a visit to another day or another
 * person to move it. Different people on different days of one job = one assignment each.
 */
const { hasPermission: canPlan } = usePermissions('menus.workshop.assignments.update')

const data = ref<PlannerData | null>(null)
const loading = ref(true)
const search = ref('')
const roleFilter = ref<'all' | 'Technician' | 'Field Engineer'>('all')
const locationFilter = ref<'all' | WorkLocation>('all')

// ── Week ─────────────────────────────────────────────────────────────────────
function startOfWeek(d: Date): Date {
  const date = new Date(d)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  date.setHours(0, 0, 0, 0)
  return date
}
const weekStart = ref(startOfWeek(new Date()))
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayIso = iso(new Date())
const days = computed(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart.value); d.setDate(d.getDate() + i); return d }))
const weekLabel = computed(() => {
  const s = days.value[0], e = days.value[6]
  return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
})
const isoWeekday = (d: Date) => ((d.getDay() + 6) % 7) + 1
const isWorkingDay = (d: Date) => (data.value?.workingDays ?? [1, 2, 3, 4, 5]).includes(isoWeekday(d))
function shiftWeek(n: number) { const d = new Date(weekStart.value); d.setDate(d.getDate() + 7 * n); weekStart.value = d }
function thisWeek() { weekStart.value = startOfWeek(new Date()) }

async function load() {
  loading.value = true
  try {
    data.value = await getPlanner(iso(days.value[0]), iso(days.value[6]))
  } catch (e: any) {
    ToastService.error(e?.response?.data?.message ?? 'Could not load the planner')
  } finally {
    loading.value = false
  }
}
watch(weekStart, load)
onMounted(load)

// ── Derived ──────────────────────────────────────────────────────────────────
const technicians = computed(() => (data.value?.technicians ?? []).filter((t) => roleFilter.value === 'all' || t.role === roleFilter.value))

const visitsByCell = computed(() => {
  const map = new Map<string, PlannerVisit[]>()
  for (const v of data.value?.visits ?? []) {
    if (locationFilter.value !== 'all' && v.workLocation !== locationFilter.value) continue
    const k = `${v.technicianId}|${v.visitDate}`
    const list = map.get(k) ?? []
    list.push(v)
    map.set(k, list)
  }
  return map
})
const cell = (techId: string, d: Date) => visitsByCell.value.get(`${techId}|${iso(d)}`) ?? []
const capacityFor = (techId: string, d: Date) => (data.value?.capacity ?? []).find((c) => c.technicianId === techId && c.date === iso(d))

const unscheduled = computed(() => {
  const q = search.value.trim().toLowerCase()
  return (data.value?.unscheduled ?? [])
    .filter((j) => locationFilter.value === 'all' || j.workLocation === locationFilter.value)
    .filter((j) => !q || [j.jobNumber, j.description, j.customerName, j.vehicleRegistration, j.postcode].some((s) => (s ?? '').toLowerCase().includes(q)))
})

const visitStatusClass: Record<VisitStatus, string> = {
  [VisitStatus.PLANNED]: 'border-slate-200 dark:border-dark-border',
  [VisitStatus.IN_PROGRESS]: 'border-brand-300 bg-brand-50/60 dark:bg-brand-900/10',
  [VisitStatus.DONE]: 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-900/10',
  [VisitStatus.MISSED]: 'border-red-200 bg-red-50/60 dark:bg-red-900/10',
}
const fmtDay = (isoDate: string) => new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

// ── Drag & drop ──────────────────────────────────────────────────────────────
type DragPayload = { type: 'job'; jobId: string; jobNumber: string } | { type: 'visit'; visitId: string; technicianId: string; visitDate: string; jobNumber: string }
const dragging = ref<DragPayload | null>(null)
const hoverCell = ref<string | null>(null)

function startDrag(e: DragEvent, payload: DragPayload) {
  if (!canPlan.value) { e.preventDefault(); return }
  dragging.value = payload
  e.dataTransfer?.setData('text/plain', JSON.stringify(payload))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function endDrag() { dragging.value = null; hoverCell.value = null }
function overCell(e: DragEvent, key: string) { if (!canPlan.value || !dragging.value) return; e.preventDefault(); hoverCell.value = key }

/** A pending action waiting on a confirm ("Reassign to…" / "Plan anyway") */
const pending = reactive<{ open: boolean; title: string; body: string; confirmLabel: string; run: ((force: boolean) => Promise<void>) | null; force: boolean }>({ open: false, title: '', body: '', confirmLabel: '', run: null, force: false })
const busy = ref(false)

function ask(title: string, body: string, confirmLabel: string, run: (force: boolean) => Promise<void>, force = false) {
  Object.assign(pending, { open: true, title, body, confirmLabel, run, force })
}
async function confirmPending() {
  if (!pending.run) return
  busy.value = true
  const run = pending.run
  const force = pending.force
  pending.open = false
  try { await run(force) } finally { busy.value = false }
}

/** Runs a plan/move; a NON_WORKING_DAY refusal becomes a "Plan anyway" prompt */
async function attempt(label: string, fn: (force: boolean) => Promise<unknown>, force = false) {
  busy.value = true
  try {
    await fn(force)
    ToastService.success(label)
    await load()
  } catch (e: any) {
    const res = e?.response?.data
    const code = res?.code ?? res?.message?.code
    if (code === 'NON_WORKING_DAY' && !force) {
      ask('Not a working day', 'That day is not a working day under Settings → Working time. Plan it anyway?', 'Plan anyway', (f) => attempt(label, fn, f), true)
      return
    }
    const message = res?.message
    ToastService.error(typeof message === 'string' ? message : Array.isArray(message) ? message.join('; ') : (message?.message ?? 'That did not work'))
  } finally {
    busy.value = false
  }
}

async function dropOn(techId: string, techName: string, d: Date) {
  const payload = dragging.value
  endDrag()
  if (!payload || !canPlan.value) return
  const date = iso(d)
  if (payload.type === 'job') {
    await attempt(`${payload.jobNumber} planned for ${techName} on ${fmtDay(date)}`, (force) => planVisit({ jobId: payload.jobId, technicianId: techId, visitDate: date, force }))
    return
  }
  if (payload.technicianId === techId && payload.visitDate === date) return
  if (payload.technicianId !== techId) {
    const from = data.value?.technicians.find((t) => t.id === payload.technicianId)?.name ?? 'the current technician'
    ask(
      `Reassign ${payload.jobNumber}?`,
      `Move the ${fmtDay(payload.visitDate)} visit to ${techName} on ${fmtDay(date)}? ${from} keeps any other days on this job.`,
      'Reassign',
      (force) => attempt(`${payload.jobNumber} moved to ${techName}`, (f) => moveVisit(payload.visitId, { technicianId: techId, visitDate: date, force: f }), force),
    )
    return
  }
  await attempt(`${payload.jobNumber} moved to ${fmtDay(date)}`, (force) => moveVisit(payload.visitId, { visitDate: date, force }))
}

// ── Visit side sheet + click-to-move (no drag needed; works on touch) ────────
const selected = ref<PlannerVisit | null>(null)
const selectedJobVisits = computed(() => (data.value?.visits ?? []).filter((v) => v.jobId === selected.value?.jobId).sort((a, b) => a.visitDate.localeCompare(b.visitDate)))
const moveForm = reactive({ technicianId: '', visitDate: '' })
const selectedLocked = computed(() => !!selected.value && (selected.value.status === VisitStatus.DONE || selected.value.hours > 0))
const technicianOptions = computed(() => (data.value?.technicians ?? []).map((t) => ({ value: t.id, label: `${t.name} — ${t.role}` })))

function openVisit(v: PlannerVisit) {
  selected.value = v
  moveForm.technicianId = v.technicianId
  moveForm.visitDate = v.visitDate
}

async function submitMove() {
  const v = selected.value
  if (!v || !moveForm.visitDate || selectedLocked.value) return
  const changingPerson = moveForm.technicianId && moveForm.technicianId !== v.technicianId
  if (!changingPerson && moveForm.visitDate === v.visitDate) { selected.value = null; return }
  const techName = data.value?.technicians.find((t) => t.id === moveForm.technicianId)?.name ?? ''
  selected.value = null
  await attempt(
    changingPerson ? `${v.jobNumber} moved to ${techName}, ${fmtDay(moveForm.visitDate)}` : `${v.jobNumber} moved to ${fmtDay(moveForm.visitDate)}`,
    (force) => moveVisit(v.id, { technicianId: changingPerson ? moveForm.technicianId : undefined, visitDate: moveForm.visitDate, force }),
  )
}

// ── Plan an unscheduled job by form ──────────────────────────────────────────
const planning = ref<PlannerUnscheduledJob | null>(null)
const planForm = reactive({ technicianId: '', visitDate: '' })

function openPlan(j: PlannerUnscheduledJob) {
  planning.value = j
  planForm.technicianId = j.assignedTechnicianIds[0] ?? data.value?.technicians[0]?.id ?? ''
  planForm.visitDate = todayIso
}

async function submitPlan() {
  const j = planning.value
  if (!j || !planForm.technicianId || !planForm.visitDate) return
  const techName = data.value?.technicians.find((t) => t.id === planForm.technicianId)?.name ?? ''
  planning.value = null
  await attempt(`${j.jobNumber} planned for ${techName} on ${fmtDay(planForm.visitDate)}`, (force) => planVisit({ jobId: j.jobId, technicianId: planForm.technicianId, visitDate: planForm.visitDate, force }))
}

function print() { window.print() }
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Assignments" subtitle="Who is on which job on which day. Drag a job onto a day to plan it; drag a day to move it.">
      <div class="flex flex-wrap items-center gap-2 no-print">
        <select v-model="roleFilter" class="text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-slate-700 dark:text-slate-200">
          <option value="all">All staff</option>
          <option value="Technician">Workshop technicians</option>
          <option value="Field Engineer">Field engineers</option>
        </select>
        <select v-model="locationFilter" class="text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-slate-700 dark:text-slate-200">
          <option value="all">Workshop & on-site</option>
          <option :value="WorkLocation.WORKSHOP">Workshop only</option>
          <option :value="WorkLocation.ON_SITE">On-site only</option>
        </select>
        <div class="flex items-center gap-1 whitespace-nowrap">
          <button @click="shiftWeek(-1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500" aria-label="Previous week"><ChevronLeft class="w-4 h-4" /></button>
          <button @click="thisWeek" class="text-sm font-medium text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">{{ weekLabel }}</button>
          <button @click="shiftWeek(1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500" aria-label="Next week"><ChevronRight class="w-4 h-4" /></button>
        </div>
        <UiButton variant="secondary" @click="thisWeek">Today</UiButton>
        <UiButton variant="secondary" @click="print" title="Print this week (A4 landscape)"><Printer class="w-4 h-4" /> Print</UiButton>
      </div>
    </UiPageHeader>

    <div v-if="loading && !data" class="card h-64 animate-pulse bg-slate-100 dark:bg-white/5" />

    <div v-else class="flex flex-col 2xl:flex-row gap-5 items-start">
      <!-- Week grid -->
      <div class="card overflow-hidden p-0 flex-1 min-w-0 w-full planner-grid" :class="busy ? 'opacity-70 pointer-events-none' : ''">
        <table class="w-full text-sm border-collapse" style="table-layout: fixed">
          <!-- fixed layout + colgroup: every day column keeps the same width whether or not it has jobs -->
          <colgroup>
            <col style="width: 14%" />
            <col v-for="d in days" :key="iso(d)" style="width: 12.28%" />
          </colgroup>
          <thead>
            <tr class="border-b border-slate-100 dark:border-dark-border">
              <th class="p-3 text-left text-xs font-semibold text-slate-400 uppercase">Technician</th>
              <th
                v-for="d in days"
                :key="iso(d)"
                :class="['p-2 text-left text-xs font-semibold uppercase whitespace-nowrap', iso(d) === todayIso ? 'text-brand-600' : isWorkingDay(d) ? 'text-slate-500' : 'text-slate-300 dark:text-slate-600']"
              >
                {{ d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }) }}
                <span v-if="iso(d) === todayIso" class="ml-1 text-[9px] px-1 rounded bg-brand-100 text-brand-700">today</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
            <tr v-if="technicians.length === 0"><td colspan="8" class="p-8 text-center text-sm text-slate-400">No technicians match this filter.</td></tr>
            <tr v-for="t in technicians" :key="t.id" class="align-top">
              <td class="p-3">
                <p class="font-medium text-slate-700 dark:text-slate-200">{{ t.name }}</p>
                <p class="text-[11px] text-slate-400">{{ t.role }}</p>
                <p v-if="t.skills.length" class="text-[11px] text-slate-400 truncate" :title="t.skills.join(', ')">{{ t.skills.join(', ') }}</p>
              </td>
              <td
                v-for="d in days"
                :key="iso(d)"
                :class="[
                  'p-1.5 min-h-[88px] transition-colors',
                  !isWorkingDay(d) ? 'bg-slate-50/70 dark:bg-white/[0.03]' : iso(d) === todayIso ? 'bg-brand-50/30 dark:bg-brand-900/5' : '',
                  hoverCell === `${t.id}|${iso(d)}` ? 'ring-2 ring-inset ring-brand-400 bg-brand-50/60' : '',
                ]"
                @dragover="overCell($event, `${t.id}|${iso(d)}`)"
                @dragleave="hoverCell = null"
                @drop.prevent="dropOn(t.id, t.name, d)"
              >
                <div
                  v-for="v in cell(t.id, d)"
                  :key="v.id"
                  :draggable="canPlan && v.status !== VisitStatus.DONE && v.hours === 0"
                  :class="['group mb-1.5 p-1.5 rounded-lg border text-xs cursor-pointer hover:border-brand-300 min-w-0 overflow-hidden', visitStatusClass[v.status], canPlan && v.status !== VisitStatus.DONE && v.hours === 0 ? 'cursor-grab active:cursor-grabbing' : '']"
                  @dragstart="startDrag($event, { type: 'visit', visitId: v.id, technicianId: v.technicianId, visitDate: v.visitDate, jobNumber: v.jobNumber })"
                  @dragend="endDrag"
                  @click="openVisit(v)"
                  :title="canPlan ? 'Click to move this day to another date or person' : 'Click for details'"
                >
                  <div class="flex flex-wrap items-center gap-x-1">
                    <span class="font-semibold text-brand-600 whitespace-nowrap">{{ v.jobNumber }}</span>
                    <MapPin v-if="v.workLocation === WorkLocation.ON_SITE" class="w-3 h-3 text-sky-600" :title="v.postcode ?? 'On-site'" />
                    <Warehouse v-else class="w-3 h-3 text-slate-400" title="Workshop" />
                    <span class="ml-auto text-slate-500 whitespace-nowrap">{{ v.estimatedHours }}h</span>
                  </div>
                  <p class="text-slate-600 dark:text-slate-300 truncate">{{ v.customerName ?? v.jobDescription }}</p>
                  <div class="flex items-center gap-1 mt-0.5">
                    <span v-if="v.dayCount > 1" :class="['text-[10px]', v.status === VisitStatus.DONE ? 'text-emerald-600' : v.status === VisitStatus.MISSED ? 'text-red-500' : 'text-slate-400']">Day {{ v.dayIndex }} of {{ v.dayCount }}</span>
                    <span v-if="v.status === VisitStatus.DONE" class="text-[10px] text-emerald-600">done</span>
                    <span v-else-if="v.status === VisitStatus.MISSED" class="text-[10px] text-red-500">missed</span>
                    <span v-else-if="v.status === VisitStatus.IN_PROGRESS" class="text-[10px] text-brand-600">on site</span>
                    <AlertTriangle v-if="v.needsReview" class="w-3 h-3 text-amber-500 ml-auto" title="A timer on this day was auto-stopped — check the hours" />
                  </div>
                </div>

                <!-- Capacity bar -->
                <div v-if="capacityFor(t.id, d)" class="mt-1" :title="`${capacityFor(t.id, d)!.bookedHours}h booked of ${capacityFor(t.id, d)!.shiftHours}h`">
                  <div class="h-1 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div
                      :class="['h-full rounded-full', capacityFor(t.id, d)!.overbooked ? 'bg-red-500' : capacityFor(t.id, d)!.bookedHours > 0 ? 'bg-emerald-500' : 'bg-transparent']"
                      :style="{ width: `${Math.min(100, capacityFor(t.id, d)!.shiftHours > 0 ? (capacityFor(t.id, d)!.bookedHours / capacityFor(t.id, d)!.shiftHours) * 100 : (capacityFor(t.id, d)!.bookedHours > 0 ? 100 : 0))}%` }"
                    />
                  </div>
                  <p :class="['text-[10px] mt-0.5 whitespace-nowrap', capacityFor(t.id, d)!.overbooked ? 'text-red-500 font-medium' : 'text-slate-400']">
                    {{ capacityFor(t.id, d)!.bookedHours }}<template v-if="capacityFor(t.id, d)!.workingDay"> / {{ capacityFor(t.id, d)!.shiftHours }}h</template><template v-else>h · day off</template>
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Unscheduled -->
      <aside class="card w-full 2xl:w-80 flex-shrink-0 no-print">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Unscheduled</h2>
          <span class="text-xs text-slate-400">{{ unscheduled.length }}</span>
        </div>
        <p class="text-xs text-slate-400 mb-3">Approved work with no day planned from today on. {{ canPlan ? 'Drag a job onto a technician\'s day, or use Plan a day.' : '' }}</p>
        <div class="relative mb-3">
          <Search class="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input v-model="search" type="search" placeholder="Search jobs" class="w-full pl-8 text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <p v-if="unscheduled.length === 0" class="text-sm text-slate-400 py-6 text-center">Everything approved has a day planned.</p>
        <div v-else class="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          <div
            v-for="j in unscheduled"
            :key="j.jobId"
            :draggable="canPlan"
            :class="['p-2.5 rounded-lg border border-slate-200 dark:border-dark-border text-xs bg-white dark:bg-dark-surface', canPlan ? 'cursor-grab active:cursor-grabbing hover:border-brand-300' : '']"
            @dragstart="startDrag($event, { type: 'job', jobId: j.jobId, jobNumber: j.jobNumber })"
            @dragend="endDrag"
          >
            <div class="flex items-center gap-1.5">
              <GripVertical v-if="canPlan" class="w-3 h-3 text-slate-300" />
              <router-link :to="`/jobs/${j.jobId}`" class="font-semibold text-brand-600 hover:underline" @click.stop>{{ j.jobNumber }}</router-link>
              <MapPin v-if="j.workLocation === WorkLocation.ON_SITE" class="w-3 h-3 text-sky-600" :title="j.postcode ?? 'On-site'" />
              <Warehouse v-else class="w-3 h-3 text-slate-400" title="Workshop" />
              <span class="ml-auto text-slate-500">{{ j.estimatedHours }}h</span>
            </div>
            <p class="text-slate-700 dark:text-slate-200 mt-0.5 truncate">{{ j.description }}</p>
            <p class="text-slate-400 truncate">{{ j.customerName }}<template v-if="j.vehicleRegistration"> · <span class="font-mono">{{ j.vehicleRegistration }}</span></template></p>
            <div class="flex items-center justify-between mt-1">
              <UiBadge :variant="(jobStatusBadgeVariant[j.status] as any)" dot>{{ jobStatusLabels[j.status] }}</UiBadge>
              <span v-if="j.dueDate" :class="['text-[10px]', j.dueDate < todayIso ? 'text-red-500 font-medium' : 'text-slate-400']">due {{ fmtDay(j.dueDate) }}</span>
            </div>
            <button
              v-if="canPlan"
              @click="openPlan(j)"
              class="mt-1.5 w-full flex items-center justify-center gap-1 text-[11px] font-medium text-brand-600 border border-dashed border-brand-200 dark:border-brand-800 rounded py-0.5 hover:bg-brand-50 dark:hover:bg-brand-900/20"
            ><CalendarRange class="w-3 h-3" /> Plan a day…</button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Confirm (reassign / plan anyway) -->
    <UiModal :open="pending.open" :title="pending.title" @close="pending.open = false">
      <p class="text-sm text-slate-600 dark:text-slate-300">{{ pending.body }}</p>
      <template #footer>
        <UiButton variant="ghost" @click="pending.open = false">Cancel</UiButton>
        <UiButton :loading="busy" @click="confirmPending">{{ pending.confirmLabel }}</UiButton>
      </template>
    </UiModal>

    <!-- Visit side sheet -->
    <UiModal :open="!!selected" :title="selected ? `${selected.jobNumber} — ${selected.jobDescription}` : ''" @close="selected = null">
      <div v-if="selected" class="space-y-4 text-sm">
        <div class="flex flex-wrap items-center gap-2">
          <UiBadge :variant="(jobStatusBadgeVariant[selected.jobStatus] as any)" dot>{{ jobStatusLabels[selected.jobStatus] }}</UiBadge>
          <span class="inline-flex items-center gap-1 text-xs text-slate-500">
            <MapPin v-if="selected.workLocation === WorkLocation.ON_SITE" class="w-3 h-3 text-sky-600" /><Warehouse v-else class="w-3 h-3" />
            {{ selected.workLocation === WorkLocation.ON_SITE ? `On-site${selected.postcode ? ` · ${selected.postcode}` : ''}` : 'Workshop' }}
          </span>
          <span v-if="selected.customerName" class="text-xs text-slate-500">{{ selected.customerName }}</span>
          <span v-if="selected.vehicleRegistration" class="text-xs font-mono text-slate-500">{{ selected.vehicleRegistration }}</span>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Days on this job this week</p>
          <ul class="space-y-1">
            <li v-for="v in selectedJobVisits" :key="v.id" :class="['flex items-center gap-2 text-xs rounded-md px-2 py-1.5', v.id === selected.id ? 'bg-brand-50 dark:bg-brand-900/10' : 'bg-slate-50 dark:bg-white/5']">
              <span class="w-24 text-slate-500">{{ fmtDay(v.visitDate) }}</span>
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ v.technicianName }}</span>
              <span class="text-slate-400">Day {{ v.dayIndex }} of {{ v.dayCount }}</span>
              <span class="ml-auto text-slate-500">{{ v.hours > 0 ? `${v.hours}h logged` : `${v.estimatedHours}h planned` }}</span>
            </li>
          </ul>
          <p class="text-[11px] text-slate-400 mt-2">Other weeks and the full visit list are on the job page.</p>
        </div>

        <!-- Move this day (click path — no drag needed) -->
        <div v-if="canPlan" class="pt-3 border-t border-slate-100 dark:border-dark-border">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Move this day</p>
          <p v-if="selectedLocked" class="text-xs text-amber-600">This day {{ selected.status === VisitStatus.DONE ? 'is already done' : 'has time logged against it' }} — it cannot be moved. Plan a new day for another person from the job page or by dragging the job here.</p>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UiSelect v-model="moveForm.technicianId" label="Technician" :options="technicianOptions" />
            <UiInput v-model="moveForm.visitDate" label="Date" type="date" />
          </div>
          <p v-if="!selectedLocked && moveForm.technicianId !== selected.technicianId" class="text-xs text-slate-400 mt-2">{{ selected.technicianName }} keeps any other days on this job; an assignment left with nothing on it is removed.</p>
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="selected = null">Close</UiButton>
        <router-link v-if="selected" :to="`/jobs/${selected.jobId}`"><UiButton variant="secondary">Open job</UiButton></router-link>
        <UiButton v-if="canPlan && selected && !selectedLocked" :loading="busy" @click="submitMove">Move</UiButton>
      </template>
    </UiModal>

    <!-- Plan an unscheduled job by form -->
    <UiModal :open="!!planning" :title="planning ? `Plan ${planning.jobNumber}` : ''" @close="planning = null">
      <div v-if="planning" class="space-y-3 text-sm">
        <p class="text-slate-600 dark:text-slate-300">{{ planning.description }}<span v-if="planning.customerName" class="text-slate-400"> · {{ planning.customerName }}</span></p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UiSelect v-model="planForm.technicianId" label="Technician" :options="technicianOptions" required />
          <UiInput v-model="planForm.visitDate" label="Date" type="date" required />
        </div>
        <p class="text-xs text-slate-400">Add more days, or a different person for another day, by dragging or from the job page.</p>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="planning = null">Cancel</UiButton>
        <UiButton :loading="busy" @click="submitPlan">Plan</UiButton>
      </template>
    </UiModal>

    <p v-if="!canPlan" class="mt-3 text-xs text-slate-400 no-print flex items-center gap-1"><CalendarRange class="w-3.5 h-3.5" /> Read-only view. Workshop Managers can drag jobs and days.</p>
  </DefaultLayout>
</template>

<style scoped>
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  .no-print { display: none !important; }
  .planner-grid { overflow: visible !important; box-shadow: none !important; border: none !important; }
  .planner-grid table { min-width: 0 !important; font-size: 9pt; }
}
</style>
