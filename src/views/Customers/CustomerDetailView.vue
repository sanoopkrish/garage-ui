<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { ArrowLeft, Phone, Mail, Car, Wrench, FileText } from 'lucide-vue-next'
import { useCustomersStore } from '@/stores/customers.store'
import { getVehicles } from '@/api/vehicles.api'
import { getJobs } from '@/api/jobs.api'
import { ToastService } from '@/services/toast.service'
import { CustomerType } from '@/types/generated/enums/customer'
import { jobStatusLabels, jobStatusBadgeVariant } from '@/utils/jobStatus'
import type { Customer } from '@/api/customers.api'
import type { Vehicle } from '@/api/vehicles.api'
import type { Job } from '@/api/jobs.api'

const route = useRoute()
const router = useRouter()
const customersStore = useCustomersStore()

const customer = ref<Customer | null>(null)
const vehicles = ref<Vehicle[]>([])
const jobs = ref<Job[]>([])
const loading = ref(true)

const displayName = computed(() => customer.value?.businessName || customer.value?.name || '')
const isB2b = computed(() => customer.value?.type === CustomerType.B2B)

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

const billingAddressText = computed(() => {
  const a = customer.value?.billingAddress
  if (!a) return null
  return [a.street, a.city, a.postcode, a.country].filter(Boolean).join(', ') || null
})

onMounted(async () => {
  const id = route.params.id as string
  try {
    customer.value = await customersStore.getCustomer(id)
    const [vehicleResponse, jobResponse] = await Promise.all([
      getVehicles({ customerId: id, pageSize: 100 }),
      getJobs({ customerId: id, pageSize: 50 }),
    ])
    vehicles.value = vehicleResponse.items
    jobs.value = jobResponse.items
  } catch {
    ToastService.error('Failed to load customer')
    router.push('/customers')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DefaultLayout>
    <div class="flex items-center justify-between mb-6">
      <button @click="router.back()" class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft class="w-4 h-4" /> Back to Customers
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 xl:grid-cols-3 gap-5 animate-pulse">
      <div class="card h-48 bg-slate-100 dark:bg-white/5" />
      <div class="xl:col-span-2 card h-48 bg-slate-100 dark:bg-white/5" />
    </div>

    <div v-else-if="customer" class="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <!-- Left: contact info -->
      <div class="space-y-5">
        <div class="card">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-14 h-14 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
              {{ displayName.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <h1 class="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{{ displayName }}</h1>
              <div class="flex items-center gap-2">
                <UiBadge :variant="isB2b ? 'progress' : 'open'" dot>{{ isB2b ? 'B2B Account' : 'Private' }}</UiBadge>
                <span class="text-xs text-slate-400">since {{ formatDate(customer.createdAt) }}</span>
              </div>
            </div>
          </div>
          <div class="space-y-2 text-sm">
            <p v-if="isB2b && customer.businessName" class="text-slate-600 dark:text-slate-300">Contact: {{ customer.name }}</p>
            <a v-if="customer.email" :href="`mailto:${customer.email}`" class="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-brand-600">
              <Mail class="w-4 h-4 text-brand-500 flex-shrink-0" /> {{ customer.email }}
            </a>
            <a v-if="customer.phone" :href="`tel:${customer.phone}`" class="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-brand-600">
              <Phone class="w-4 h-4 text-brand-500 flex-shrink-0" /> {{ customer.phone }}
            </a>
          </div>
          <p v-if="billingAddressText" class="mt-3 text-sm text-slate-400">{{ billingAddressText }}</p>
          <p v-if="customer.notes" class="mt-3 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-dark-border pt-3">{{ customer.notes }}</p>
        </div>

        <!-- B2B account terms -->
        <div v-if="isB2b" class="card">
          <div class="flex items-center gap-2 mb-3">
            <FileText class="w-4 h-4 text-brand-500" />
            <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Account Terms</h2>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-slate-400">Labour Rate</span><span class="font-medium text-slate-700 dark:text-slate-200">{{ customer.labourRate != null ? `£${customer.labourRate}/hr` : 'Company default' }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Payment Terms</span><span class="font-medium text-slate-700 dark:text-slate-200">{{ customer.paymentTermsDays != null ? `${customer.paymentTermsDays} days` : '—' }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">VAT Number</span><span class="font-medium text-slate-700 dark:text-slate-200">{{ customer.vatNumber || '—' }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">PO Required</span><span class="font-medium text-slate-700 dark:text-slate-200">{{ customer.poRequired ? 'Yes' : 'No' }}</span></div>
          </div>
        </div>

        <!-- Vehicles -->
        <div class="card">
          <div class="flex items-center gap-2 mb-3">
            <Car class="w-4 h-4 text-brand-500" />
            <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Vehicles ({{ vehicles.length }})</h2>
          </div>
          <p v-if="vehicles.length === 0" class="text-sm text-slate-400">No vehicles registered yet.</p>
          <div v-else class="space-y-3">
            <router-link
              v-for="v in vehicles"
              :key="v.id"
              :to="`/vehicles/${v.id}`"
              class="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-dark-border hover:border-brand-200 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors"
            >
              <div class="w-8 h-8 bg-slate-100 dark:bg-dark-surface rounded-lg flex items-center justify-center">
                <Car class="w-4 h-4 text-slate-500" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ [v.year, v.make, v.model].filter(Boolean).join(' ') || v.registration }}</p>
                <p class="text-xs font-mono text-slate-400">{{ v.registration }}<template v-if="v.colour"> · {{ v.colour }}</template></p>
              </div>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Right: job history -->
      <div class="xl:col-span-2 card">
        <div class="flex items-center gap-2 mb-4">
          <Wrench class="w-4 h-4 text-brand-500" />
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">Job History ({{ jobs.length }})</h2>
        </div>
        <div v-if="jobs.length === 0" class="py-14 text-center">
          <Wrench class="w-8 h-8 text-slate-200 dark:text-slate-600 mx-auto mb-3" />
          <p class="text-sm text-slate-400">No jobs for this customer yet.</p>
        </div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 dark:border-dark-border">
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Job</th>
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Description</th>
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Vehicle</th>
              <th class="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
              <th class="pb-2 text-right text-xs font-semibold text-slate-400 uppercase">Created</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 dark:divide-dark-border">
            <tr v-for="j in jobs" :key="j.id" class="hover:bg-slate-50 dark:hover:bg-white/5">
              <td class="py-3">
                <router-link :to="`/jobs/${j.id}`" class="font-semibold text-brand-600 hover:underline">{{ j.jobNumber }}</router-link>
              </td>
              <td class="py-3 text-slate-700 dark:text-slate-200 max-w-[220px] truncate">{{ j.description }}</td>
              <td class="py-3 font-mono text-xs text-slate-400">{{ j.vehicleRegistration }}</td>
              <td class="py-3">
                <UiBadge :variant="(jobStatusBadgeVariant[j.status] as any)" dot>{{ jobStatusLabels[j.status] }}</UiBadge>
              </td>
              <td class="py-3 text-right text-slate-400">{{ formatDate(j.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </DefaultLayout>
</template>
