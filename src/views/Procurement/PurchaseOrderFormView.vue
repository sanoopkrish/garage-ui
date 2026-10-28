<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import SupplierFormModal from '@/components/Procurement/SupplierFormModal.vue'
import { Plus, Trash2, ArrowLeft } from 'lucide-vue-next'
import {
  createPurchaseOrder, getPurchaseOrder, orderAction, updatePurchaseOrder, type PurchaseOrderInput,
} from '@/api/procurement/purchase-orders.api'
import type { Supplier } from '@/api/procurement/suppliers.api'
import { getCompanySettings } from '@/api/company.api'
import { getJobs } from '@/api/jobs.api'
import { PurchaseOrderKind, PurchaseOrderStatus } from '@/types/generated/enums/procurement'
import { apiMessage, gbp, orderKindLabels } from '@/utils/procurement'
import { useProcurementStore } from '@/stores/procurement.store'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/** Purchase order create / edit — a dedicated page (multi-line form). Draft and rejected orders only. */
const route = useRoute()
const router = useRouter()
const procurement = useProcurementStore()
const { hasPermission: canAddSupplier } = usePermissions('menus.finance.suppliers.update')

const orderId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const isEdit = computed(() => !!orderId.value)
const poNumber = ref('')
const loading = ref(true)
const saving = ref('')
const defaultVat = ref(20)
const errors = reactive({ supplierId: '' })

interface Line { key: number; description: string; partNumber: string; quantity: number; unitPrice: number; taxRate: number }
let keySeq = Date.now()
const newLine = (): Line => ({ key: keySeq++, description: '', partNumber: '', quantity: 1, unitPrice: 0, taxRate: defaultVat.value })
const lines = ref<Line[]>([])
const form = reactive({
  supplierId: '', kind: PurchaseOrderKind.STOCK_PARTS as PurchaseOrderKind, expectedDeliveryDate: '', deliverTo: '', jobId: '',
  shippingCost: 0 as number | string, paymentTerms: '', notes: '',
})

const kindOptions = Object.values(PurchaseOrderKind).map((k) => ({ value: k, label: orderKindLabels[k] }))
const jobOptions = ref<{ value: string; label: string }[]>([{ value: '', label: 'Not for a job' }])

const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100
const lineNet = (l: Line) => r2((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))
const net = computed(() => r2(lines.value.reduce((s, l) => s + lineNet(l), 0)))
const vat = computed(() => r2(lines.value.reduce((s, l) => s + r2(lineNet(l) * ((Number(l.taxRate) || 0) / 100)), 0)))
const gross = computed(() => r2(net.value + vat.value + (Number(form.shippingCost) || 0)))
const needsApproval = computed(() => procurement.approvalsEnabled && gross.value > Number(procurement.settings?.poApprovalThreshold ?? 0))

function onSupplierChange() {
  errors.supplierId = ''
  const supplier = procurement.suppliers.find((s) => s.id === form.supplierId)
  if (supplier?.paymentTermsDays != null && !form.paymentTerms) form.paymentTerms = `${supplier.paymentTermsDays} days`
}

const showSupplierForm = ref(false)
async function onSupplierSaved(supplier: Supplier) {
  await procurement.fetchSuppliers().catch(() => {})
  form.supplierId = supplier.id
  onSupplierChange()
}

function payload(): PurchaseOrderInput | null {
  errors.supplierId = form.supplierId ? '' : 'Choose a supplier'
  if (errors.supplierId) return null
  const filled = lines.value.filter((l) => l.description.trim() || Number(l.unitPrice))
  if (!filled.length) { ToastService.error('Add at least one item'); return null }
  if (filled.some((l) => !l.description.trim())) { ToastService.error('Every item needs a description'); return null }
  if (filled.some((l) => !(Number(l.quantity) > 0))) { ToastService.error('Every item needs a quantity'); return null }
  return {
    supplierId: form.supplierId,
    kind: form.kind,
    expectedDeliveryDate: form.expectedDeliveryDate || undefined,
    deliverTo: form.deliverTo.trim(),
    jobId: form.jobId || undefined,
    shippingCost: Number(form.shippingCost) || 0,
    paymentTerms: form.paymentTerms.trim(),
    notes: form.notes.trim(),
    items: filled.map((l) => ({
      description: l.description.trim(), partNumber: l.partNumber.trim() || undefined,
      quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) || 0, taxRate: Number(l.taxRate) || 0,
    })),
  }
}

async function save(submit: boolean) {
  const data = payload()
  if (!data) return
  saving.value = submit ? 'submit' : 'draft'
  try {
    let order = orderId.value ? await updatePurchaseOrder(orderId.value, data) : await createPurchaseOrder(data)
    if (submit) {
      order = await orderAction(order.id, 'submit')
      ToastService.success(order.status === PurchaseOrderStatus.PENDING_APPROVAL
        ? `${order.poNumber} sent for approval`
        : `${order.poNumber} approved — ready to send to the supplier`)
    } else {
      ToastService.success(`Draft ${order.poNumber} saved`)
    }
    router.push(`/procurement/orders?open=${order.id}`)
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to save the order'))
  } finally {
    saving.value = ''
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      procurement.fetchSettings(),
      procurement.fetchSuppliers(),
      getCompanySettings().then((s) => { if (s?.vatRate != null) defaultVat.value = Number(s.vatRate) }).catch(() => {}),
      getJobs({ pageSize: 50 }).then((r) => {
        jobOptions.value = [{ value: '', label: 'Not for a job' }, ...r.items.map((j: any) => ({ value: j.id, label: [j.jobNumber, j.customerName ?? j.customer?.name].filter(Boolean).join(' · ') }))]
      }).catch(() => {}),
    ])
    if (orderId.value) {
      const order = await getPurchaseOrder(orderId.value)
      if (![PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.REJECTED].includes(order.status)) {
        ToastService.error('Only draft or rejected orders can be edited')
        router.replace(`/procurement/orders?open=${order.id}`)
        return
      }
      poNumber.value = order.poNumber
      Object.assign(form, {
        supplierId: order.supplierId, kind: order.kind, expectedDeliveryDate: order.expectedDeliveryDate?.slice(0, 10) ?? '',
        deliverTo: order.deliverTo ?? '', jobId: order.jobId ?? '', shippingCost: order.shippingCost, paymentTerms: order.paymentTerms ?? '', notes: order.notes ?? '',
      })
      if (order.jobId && !jobOptions.value.some((o) => o.value === order.jobId)) jobOptions.value.push({ value: order.jobId, label: order.jobNumber ?? 'Job' })
      lines.value = order.items.map((i) => ({ key: keySeq++, description: i.description, partNumber: i.partNumber ?? '', quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate }))
    } else {
      lines.value = [newLine()]
    }
  } catch (err) {
    ToastService.error(apiMessage(err, 'Failed to load the form'))
  } finally {
    loading.value = false
  }
})

const inputClass = 'w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
</script>

<template>
  <DefaultLayout>
    <UiPageHeader :title="isEdit ? `Edit ${poNumber}` : 'New purchase order'" subtitle="Raise an order with a supplier. It is saved as a draft until you submit it.">
      <UiButton variant="ghost" @click="router.push('/procurement/orders')"><ArrowLeft class="w-4 h-4" /> Back to orders</UiButton>
    </UiPageHeader>

    <div v-if="loading" class="h-64 animate-pulse bg-slate-100 dark:bg-white/5 rounded-xl" />

    <div v-else class="max-w-5xl space-y-5">
      <div class="bg-white dark:bg-dark-surface rounded-xl border border-slate-200 dark:border-dark-border p-5 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <UiSelect v-model="form.supplierId" label="Supplier" :options="procurement.supplierOptions" placeholder="Choose a supplier" required :error="errors.supplierId" @update:modelValue="onSupplierChange" />
            <button v-if="canAddSupplier" type="button" class="mt-1 text-xs text-brand-600 hover:underline" @click="showSupplierForm = true">+ Add a new supplier</button>
          </div>
          <UiSelect v-model="form.kind" label="What is it for" :options="kindOptions" />
          <UiSelect v-model="form.jobId" label="Job (optional)" :options="jobOptions" />
          <UiInput v-model="form.expectedDeliveryDate" label="Delivery needed by" type="date" />
          <UiInput v-model="form.deliverTo" label="Deliver to" placeholder="e.g. Workshop, Bay 2" />
          <UiInput v-model="form.paymentTerms" label="Payment terms" placeholder="e.g. 30 days" />
        </div>
      </div>

      <div class="bg-white dark:bg-dark-surface rounded-xl border border-slate-200 dark:border-dark-border p-5 space-y-3">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-dark-border">
                <th class="py-2 pr-2">Item</th>
                <th class="py-2 pr-2 w-36">Part number</th>
                <th class="py-2 pr-2 w-20 text-right">Qty</th>
                <th class="py-2 pr-2 w-28 text-right">Unit £ (net)</th>
                <th class="py-2 pr-2 w-20 text-right">VAT %</th>
                <th class="py-2 pr-2 w-24 text-right">Net</th>
                <th class="py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in lines" :key="line.key" class="border-b border-slate-50 dark:border-dark-border/50">
                <td class="py-1.5 pr-2"><input v-model="line.description" type="text" placeholder="What are you ordering?" :class="inputClass" /></td>
                <td class="py-1.5 pr-2"><input v-model="line.partNumber" type="text" :class="inputClass" /></td>
                <td class="py-1.5 pr-2"><input v-model.number="line.quantity" type="number" min="0" step="any" :class="[inputClass, 'text-right']" /></td>
                <td class="py-1.5 pr-2"><input v-model.number="line.unitPrice" type="number" min="0" step="0.01" :class="[inputClass, 'text-right']" /></td>
                <td class="py-1.5 pr-2"><input v-model.number="line.taxRate" type="number" min="0" max="100" :class="[inputClass, 'text-right']" /></td>
                <td class="py-1.5 pr-2 text-right font-medium text-slate-700 dark:text-slate-200">{{ gbp(lineNet(line)) }}</td>
                <td class="py-1.5 text-right">
                  <button type="button" class="p-1 text-slate-400 hover:text-red-500" title="Remove item" @click="lines = lines.filter((l) => l.key !== line.key)"><Trash2 class="w-3.5 h-3.5" /></button>
                </td>
              </tr>
              <tr v-if="!lines.length"><td colspan="7" class="py-4 text-center text-slate-400">No items yet — add one.</td></tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-wrap items-start justify-between gap-4">
          <UiButton variant="secondary" size="sm" @click="lines = [...lines, newLine()]"><Plus class="w-3.5 h-3.5" /> Add item</UiButton>
          <div class="w-72 space-y-1.5 text-sm">
            <div class="flex justify-between text-slate-500"><span>Net</span><span>{{ gbp(net) }}</span></div>
            <div class="flex justify-between text-slate-500"><span>VAT</span><span>{{ gbp(vat) }}</span></div>
            <div class="flex items-center justify-between text-slate-500">
              <span class="whitespace-nowrap">Delivery charge</span>
              <input v-model.number="form.shippingCost" type="number" min="0" step="0.01" :class="[inputClass, 'text-right']" style="width: 6.5rem" />
            </div>
            <div class="flex justify-between pt-1.5 border-t border-slate-100 dark:border-dark-border font-semibold text-slate-800 dark:text-slate-100"><span>Total</span><span>{{ gbp(gross) }}</span></div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-dark-surface rounded-xl border border-slate-200 dark:border-dark-border p-5">
        <label class="block text-xs font-medium text-slate-500 mb-1">Notes for the supplier (printed on the order)</label>
        <textarea v-model="form.notes" rows="2" class="w-full rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
      </div>

      <p v-if="needsApproval" class="text-sm text-amber-600">
        This order is over the {{ gbp(procurement.settings?.poApprovalThreshold) }} approval limit. Unless you can approve orders yourself, it will wait for a manager after you submit it.
      </p>

      <div class="flex items-center justify-end gap-2">
        <UiButton variant="ghost" @click="router.push('/procurement/orders')">Cancel</UiButton>
        <UiButton variant="secondary" :loading="saving === 'draft'" :disabled="!!saving" @click="save(false)">Save draft</UiButton>
        <UiButton :loading="saving === 'submit'" :disabled="!!saving" @click="save(true)">Save and submit</UiButton>
      </div>
    </div>

    <SupplierFormModal :open="showSupplierForm" @close="showSupplierForm = false" @saved="onSupplierSaved" />
  </DefaultLayout>
</template>
