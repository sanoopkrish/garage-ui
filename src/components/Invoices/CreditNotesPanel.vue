<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import GeneralSliderPanel from '@/components/Ui/GeneralSliderPanel.vue'
import CreditNoteFormModal from '@/components/Invoices/CreditNoteFormModal.vue'
import { Plus, Eye, Download, Send, Ban, Pencil, UploadCloud, Link2, X, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useCreditNotesStore } from '@/stores/credit-notes.store'
import { downloadCreditNotePdf, sendCreditNote, type CreditNote } from '@/api/credit-notes.api'
import { getInvoices, type Invoice } from '@/api/invoices.api'
import { CreditNoteStatus } from '@/types/generated/enums/credit-note'
import { InvoiceStatus } from '@/types/generated/enums/invoice'
import { creditNoteStatusLabels, creditNoteStatusVariant, creditNoteReasonLabels } from '@/utils/creditNoteStatus'
import { gbp } from '@/utils/invoiceStatus'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/** Credit notes tab (Sprint 20): list + new/edit modal + detail slider with allocations. */
const props = defineProps<{ openId?: string | null }>()

const store = useCreditNotesStore()
const { hasPermission: canCreate } = usePermissions('menus.finance.creditNotes.create')
const { hasPermission: canIssue } = usePermissions('menus.finance.creditNotes.issue')
const { hasPermission: canSend } = usePermissions('menus.finance.creditNotes.send')
const { hasPermission: canSync } = usePermissions('menus.finance.invoices.update')

// ── List (local loading + local loadFn; no watchers on store pagination) ──────
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref<'' | CreditNoteStatus>('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const statusOptions = [
  { value: '', label: 'All statuses' },
  ...Object.values(CreditNoteStatus).map((s) => ({ value: s, label: creditNoteStatusLabels[s] })),
]

async function load(page = store.currentPage) {
  loading.value = true
  try {
    await store.fetchCreditNotes({ search: searchQuery.value || undefined, status: statusFilter.value || undefined, page })
  } catch {
    ToastService.error(store.error ?? 'Failed to load credit notes')
  } finally {
    loading.value = false
  }
}

function onSearch(val: string) {
  searchQuery.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(1), 350)
}

// ── New / edit modal ──────────────────────────────────────────────────────────
const showForm = ref(false)
const editing = ref<CreditNote | null>(null)

function openCreate() { editing.value = null; showForm.value = true }
function openEdit(cn: CreditNote) { editing.value = cn; showForm.value = true }

async function onSaved(saved: CreditNote) {
  await load(editing.value ? store.currentPage : 1)
  await openDetail(saved.id)
}

// ── Detail slider ─────────────────────────────────────────────────────────────
const showDetail = ref(false)
const detailLoading = ref(false)
const busy = ref(false)
const detail = computed(() => store.item)

async function openDetail(id: string) {
  showDetail.value = true
  detailLoading.value = true
  try {
    await store.fetchCreditNote(id)
  } catch {
    ToastService.error(store.error ?? 'Failed to load credit note')
    showDetail.value = false
  } finally {
    detailLoading.value = false
  }
}

async function act(fn: () => Promise<unknown>, success: string) {
  busy.value = true
  try {
    await fn()
    ToastService.success(success)
  } catch (e: any) {
    const message = e?.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? store.error ?? 'Something went wrong'))
  } finally {
    busy.value = false
  }
}

async function handleIssue(cn: CreditNote) {
  const text = cn.invoiceNumber
    ? `Issue ${cn.creditNoteNumber}? ${gbp(cn.grossTotal)} will be applied to ${cn.invoiceNumber} (up to its outstanding balance) and emailed to the customer.`
    : `Issue ${cn.creditNoteNumber}? ${gbp(cn.grossTotal)} will sit on the customer's account until allocated, and is emailed to the customer.`
  const result = await showConfirmDialog(text, false, 'Issue')
  if (!result.isConfirmed) return
  await act(() => store.issueCreditNote(cn.id), 'Credit note issued')
}

async function handleVoid(cn: CreditNote) {
  const result = await showConfirmDialog(`Void ${cn.creditNoteNumber}? This cannot be undone.`, false, 'Void')
  if (!result.isConfirmed) return
  await act(() => store.voidCreditNote(cn.id), 'Credit note voided')
}

async function handleSend(cn: CreditNote) {
  const result = await showConfirmDialog(`Email ${cn.creditNoteNumber} to the customer again?`, false, 'Send')
  if (!result.isConfirmed) return
  await act(async () => { await sendCreditNote(cn.id) }, 'Credit note sent')
}

async function handlePdf(cn: CreditNote) {
  try {
    await downloadCreditNotePdf(cn.id, cn.creditNoteNumber)
  } catch {
    ToastService.error('Failed to download PDF')
  }
}

async function handleSync(cn: CreditNote) {
  await act(() => store.syncCreditNote(cn.id), 'Pushed to Xero')
}

async function handleUnallocate(cn: CreditNote, invoiceId: string, invoiceNumber: string | null) {
  const result = await showConfirmDialog(`Remove the allocation to ${invoiceNumber ?? 'this invoice'}? The invoice balance goes back up.`, false, 'Remove')
  if (!result.isConfirmed) return
  await act(() => store.unallocate(cn.id, invoiceId), 'Allocation removed')
}

// ── Allocate modal ────────────────────────────────────────────────────────────
const showAllocate = ref(false)
const allocateForm = reactive({ invoiceId: '', amount: '' })
const allocatable = ref<Invoice[]>([])
const allocating = ref(false)

const allocateOptions = computed(() => [
  { value: '', label: 'Select an invoice…' },
  ...allocatable.value.map((i) => ({ value: i.id, label: `${i.invoiceNumber} — balance ${gbp(i.balance)}` })),
])

async function openAllocate(cn: CreditNote) {
  allocateForm.invoiceId = ''
  allocateForm.amount = ''
  allocatable.value = []
  showAllocate.value = true
  try {
    const { items } = await getInvoices({ customerId: cn.customerId, pageSize: 50 })
    const taken = new Set(cn.allocations.map((a) => a.invoiceId))
    allocatable.value = items.filter((i) => i.status === InvoiceStatus.ISSUED && i.balance > 0 && !taken.has(i.id))
  } catch {
    ToastService.error('Failed to load the customer\'s invoices')
  }
}

function onAllocateInvoice() {
  const inv = allocatable.value.find((i) => i.id === allocateForm.invoiceId)
  if (inv && detail.value) allocateForm.amount = String(Math.min(detail.value.unallocated, inv.balance).toFixed(2))
}

async function submitAllocate() {
  if (!detail.value || !allocateForm.invoiceId) { ToastService.error('Choose an invoice'); return }
  const amount = Number(allocateForm.amount)
  if (!(amount > 0)) { ToastService.error('Enter an amount greater than zero'); return }
  allocating.value = true
  try {
    await store.allocate(detail.value.id, allocateForm.invoiceId, amount)
    ToastService.success('Credit allocated')
    showAllocate.value = false
  } catch {
    ToastService.error(store.error ?? 'Failed to allocate credit')
  } finally {
    allocating.value = false
  }
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d }
}

onMounted(async () => {
  await load(1)
  if (props.openId) openDetail(props.openId)
})
</script>

<template>
  <div>
    <div class="flex items-center gap-3 mb-5">
      <UiSearchInput :modelValue="searchQuery" placeholder="Search credit note no, customer, invoice..." @update:modelValue="onSearch" />
      <div class="w-44">
        <UiSelect v-model="statusFilter" :options="statusOptions" @update:modelValue="() => load(1)" />
      </div>
      <span class="text-sm text-slate-400 ml-auto">{{ store.total }} credit notes</span>
      <UiButton v-if="canCreate" @click="openCreate"><Plus class="w-4 h-4" /> New credit note</UiButton>
    </div>

    <UiTable :headers="['Credit note', 'Customer', 'Invoice', 'Reason', 'Total', 'Allocated', 'Status', '']">
      <template v-if="loading && store.items.length === 0">
        <tr v-for="n in 4" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in 8" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-20 bg-slate-200 dark:bg-white/10 rounded" /></td>
        </tr>
      </template>
      <template v-else-if="!loading && store.items.length === 0">
        <tr><td colspan="8" class="px-4 py-10 text-center text-sm text-slate-400">No credit notes found.</td></tr>
      </template>
      <tr v-else v-for="cn in store.items" :key="cn.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" @click="openDetail(cn.id)">
        <td class="px-4 py-3.5">
          <span class="font-semibold text-brand-600">{{ cn.creditNoteNumber }}</span>
          <p class="text-xs text-slate-400">{{ formatDate(cn.issuedAt ?? cn.createdAt) }}</p>
        </td>
        <td class="px-4 py-3.5 text-slate-700 dark:text-slate-200 font-medium">{{ cn.customerName ?? '—' }}</td>
        <td class="px-4 py-3.5" @click.stop>
          <router-link v-if="cn.invoiceId" :to="`/invoices/${cn.invoiceId}`" class="text-sm text-brand-600 hover:underline">{{ cn.invoiceNumber }}</router-link>
          <span v-else class="text-sm text-slate-400">On account</span>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-500 dark:text-slate-400">{{ creditNoteReasonLabels[cn.reason] }}</td>
        <td class="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200">{{ gbp(cn.grossTotal) }}</td>
        <td class="px-4 py-3.5 text-slate-500 dark:text-slate-400">
          {{ gbp(cn.allocated) }}
          <span v-if="cn.status === CreditNoteStatus.ISSUED && cn.unallocated > 0" class="block text-xs text-amber-600">{{ gbp(cn.unallocated) }} on account</span>
        </td>
        <td class="px-4 py-3.5">
          <UiBadge :variant="(creditNoteStatusVariant[cn.status] as any)" dot>{{ creditNoteStatusLabels[cn.status] }}</UiBadge>
          <UiBadge v-if="cn.accountingSyncStatus === 'synced'" variant="done">Xero</UiBadge>
          <UiBadge v-else-if="cn.accountingSyncStatus === 'error'" variant="cancelled" :title="cn.accountingSyncError ?? ''">Xero !</UiBadge>
        </td>
        <td class="px-4 py-3.5">
          <button class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors" title="View">
            <Eye class="w-4 h-4" />
          </button>
        </td>
      </tr>
    </UiTable>

    <div v-if="store.totalPages > 1" class="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
      <span>Page {{ store.currentPage }} of {{ store.totalPages }}</span>
      <button :disabled="store.currentPage <= 1" @click="load(store.currentPage - 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronLeft class="w-4 h-4" /></button>
      <button :disabled="store.currentPage >= store.totalPages" @click="load(store.currentPage + 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronRight class="w-4 h-4" /></button>
    </div>

    <!-- Detail slider -->
    <GeneralSliderPanel
      v-model="showDetail"
      :title="detail?.creditNoteNumber ?? 'Credit note'"
      :subtitle="detail ? `${detail.customerName ?? ''} · ${creditNoteReasonLabels[detail.reason]}` : ''"
      size="lg"
    >
      <div v-if="detailLoading || !detail" class="h-40 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />
      <div v-else class="space-y-5">
        <div class="flex flex-wrap items-center gap-2">
          <UiBadge :variant="(creditNoteStatusVariant[detail.status] as any)" dot>{{ creditNoteStatusLabels[detail.status] }}</UiBadge>
          <UiBadge v-if="detail.isTradeCredit" variant="info">Trade credit (automatic)</UiBadge>
          <UiBadge v-if="detail.accountingSyncStatus === 'synced'" variant="done">Xero ✓</UiBadge>
          <UiBadge v-else-if="detail.accountingSyncStatus === 'error'" variant="cancelled" :title="detail.accountingSyncError ?? ''">Xero failed</UiBadge>
          <span class="ml-auto text-xs text-slate-400">{{ detail.status === CreditNoteStatus.DRAFT ? 'Created' : 'Issued' }} {{ formatDate(detail.issuedAt ?? detail.createdAt) }}</span>
        </div>
        <p v-if="detail.accountingSyncStatus === 'error' && detail.accountingSyncError" class="text-xs text-red-500">{{ detail.accountingSyncError }}</p>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><p class="text-xs text-slate-400">Customer</p>
            <router-link :to="`/customers/${detail.customerId}`" class="text-brand-600 hover:underline">{{ detail.customerName }}</router-link></div>
          <div><p class="text-xs text-slate-400">Against invoice</p>
            <router-link v-if="detail.invoiceId" :to="`/invoices/${detail.invoiceId}`" class="text-brand-600 hover:underline">{{ detail.invoiceNumber }}</router-link>
            <span v-else class="text-slate-500">None — credit on account</span></div>
          <div v-if="detail.jobId"><p class="text-xs text-slate-400">Job</p>
            <router-link :to="`/jobs/${detail.jobId}`" class="text-brand-600 hover:underline">{{ detail.jobNumber }}</router-link></div>
        </div>

        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 dark:border-dark-border">
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Description</th>
              <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Qty</th>
              <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Unit</th>
              <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
            <tr v-for="line in detail.lines" :key="line.id">
              <td class="py-2.5 text-slate-700 dark:text-slate-200">{{ line.description }}</td>
              <td class="py-2.5 text-right text-slate-500">{{ line.quantity }}</td>
              <td class="py-2.5 text-right text-slate-500">{{ gbp(line.unitPrice) }}</td>
              <td class="py-2.5 text-right font-medium text-slate-700 dark:text-slate-200">{{ gbp(line.lineTotal) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="flex justify-end">
          <div class="w-60 space-y-1.5 text-sm">
            <div class="flex justify-between"><span class="text-slate-400">Net</span><span class="text-slate-700 dark:text-slate-200">{{ gbp(detail.netTotal) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">VAT ({{ detail.vatRatePercent }}%)</span><span class="text-slate-700 dark:text-slate-200">{{ gbp(detail.vatAmount) }}</span></div>
            <div class="flex justify-between font-semibold border-t border-slate-100 dark:border-dark-border pt-1.5"><span class="text-slate-700 dark:text-slate-200">Credit total</span><span class="text-slate-800 dark:text-slate-100">{{ gbp(detail.grossTotal) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Allocated</span><span class="text-green-600">{{ gbp(detail.allocated) }}</span></div>
            <div class="flex justify-between font-semibold"><span class="text-slate-700 dark:text-slate-200">On account</span><span :class="detail.unallocated > 0 ? 'text-amber-600' : 'text-slate-500'">{{ gbp(detail.unallocated) }}</span></div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Allocations</h3>
            <UiButton
              v-if="canIssue && detail.status === CreditNoteStatus.ISSUED && detail.unallocated > 0"
              variant="secondary" size="sm" @click="openAllocate(detail)"
            ><Link2 class="w-3.5 h-3.5" /> Allocate to invoice…</UiButton>
          </div>
          <p v-if="detail.allocations.length === 0" class="text-sm text-slate-400">
            {{ detail.status === CreditNoteStatus.DRAFT ? 'Allocations are made when the credit note is issued.' : 'Not allocated to any invoice.' }}
          </p>
          <div v-else class="space-y-1.5 text-sm">
            <div v-for="a in detail.allocations" :key="a.id" class="flex items-center gap-2 border-b border-slate-50 dark:border-dark-border pb-1.5 last:border-0">
              <router-link :to="`/invoices/${a.invoiceId}`" class="text-brand-600 hover:underline font-medium">{{ a.invoiceNumber }}</router-link>
              <span class="text-xs text-slate-400">{{ formatDate(a.allocatedAt) }}</span>
              <UiBadge v-if="a.accountingSyncStatus === 'synced'" variant="done">Xero</UiBadge>
              <span class="ml-auto font-medium text-slate-700 dark:text-slate-200">{{ gbp(a.amount) }}</span>
              <button
                v-if="canIssue && detail.status === CreditNoteStatus.ISSUED && a.accountingSyncStatus !== 'synced'"
                class="p-1 text-slate-400 hover:text-red-500" title="Remove allocation" :disabled="busy"
                @click="handleUnallocate(detail, a.invoiceId, a.invoiceNumber)"
              ><X class="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>

        <div v-if="detail.notes" class="rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300">
          <p class="text-xs text-slate-400 mb-0.5">Notes</p>{{ detail.notes }}
        </div>
      </div>

      <template v-if="detail && !detailLoading" #footer>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <UiButton variant="secondary" @click="handlePdf(detail)"><Download class="w-4 h-4" /> PDF</UiButton>
          <template v-if="detail.status === CreditNoteStatus.DRAFT">
            <UiButton v-if="canCreate" variant="secondary" :disabled="busy" @click="openEdit(detail)"><Pencil class="w-4 h-4" /> Edit</UiButton>
            <UiButton v-if="canIssue" variant="secondary" :disabled="busy" @click="handleVoid(detail)"><Ban class="w-4 h-4" /> Void</UiButton>
            <UiButton v-if="canIssue" :loading="busy" @click="handleIssue(detail)"><Send class="w-4 h-4" /> Issue</UiButton>
          </template>
          <template v-else-if="detail.status === CreditNoteStatus.ISSUED">
            <UiButton v-if="canSync && detail.accountingSyncStatus !== 'synced'" variant="secondary" :disabled="busy" @click="handleSync(detail)">
              <UploadCloud class="w-4 h-4" /> {{ detail.accountingSyncStatus === 'error' ? 'Retry Xero push' : 'Push to Xero' }}
            </UiButton>
            <UiButton v-if="canIssue && detail.allocations.length === 0" variant="secondary" :disabled="busy" @click="handleVoid(detail)"><Ban class="w-4 h-4" /> Void</UiButton>
            <UiButton v-if="canSend" variant="secondary" :disabled="busy" @click="handleSend(detail)"><Send class="w-4 h-4" /> Send</UiButton>
          </template>
        </div>
      </template>
    </GeneralSliderPanel>

    <CreditNoteFormModal :open="showForm" :creditNote="editing" @close="showForm = false" @saved="onSaved" />

    <UiModal :open="showAllocate" :title="`Allocate ${detail?.creditNoteNumber ?? ''}`" @close="showAllocate = false">
      <div class="space-y-4">
        <p class="text-sm text-slate-500">{{ gbp(detail?.unallocated ?? 0) }} of this credit is unallocated.</p>
        <UiSelect v-model="allocateForm.invoiceId" label="Invoice" :options="allocateOptions" required @update:modelValue="onAllocateInvoice" />
        <p v-if="allocatable.length === 0" class="text-xs text-slate-400 -mt-2">This customer has no other issued invoices with a balance.</p>
        <UiInput v-model="allocateForm.amount" label="Amount (£)" type="number" required />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="showAllocate = false">Cancel</UiButton>
        <UiButton :loading="allocating" @click="submitAllocate">Allocate</UiButton>
      </template>
    </UiModal>
  </div>
</template>
