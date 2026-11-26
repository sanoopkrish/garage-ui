<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Car, ChevronRight, MapPin, MessageSquare, Phone, Loader2 } from 'lucide-vue-next'
import PortalLayout from '../PortalLayout.vue'
import { usePortalStore } from '../portal.store'
import { portalApi, type PortalJobSummary, type PortalVehicle } from '../portal.api'

/** Sprint 29 — portal home: open jobs as cards, closed jobs folded away, your vehicles. */
const portal = usePortalStore()
const loading = ref(true)
const open = ref<PortalJobSummary[]>([])
const closed = ref<PortalJobSummary[]>([])
const vehicles = ref<PortalVehicle[]>([])
const showClosed = ref(false)
const error = ref('')

const greeting = computed(() => {
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return portal.firstName ? `${part}, ${portal.firstName}` : part
})

function day(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

onMounted(async () => {
  try {
    const [all, v] = await Promise.all([portalApi.jobs('all'), portalApi.vehicles()])
    open.value = all.filter((j) => !j.closed)
    closed.value = all.filter((j) => j.closed)
    vehicles.value = v
  } catch {
    error.value = 'Could not load your jobs right now. Please try again shortly.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <PortalLayout>
    <div class="space-y-6">
      <div>
        <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ greeting }}</h1>
        <p v-if="portal.me?.welcomeText" class="text-sm text-slate-500 mt-1 whitespace-pre-wrap">{{ portal.me.welcomeText }}</p>
        <p v-if="portal.isTrade && portal.customer" class="text-xs text-slate-400 mt-1">Account: {{ portal.customer.name }}</p>
      </div>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 2" :key="i" class="h-24 rounded-xl animate-pulse bg-slate-200/60 dark:bg-white/5" />
      </div>
      <p v-else-if="error" class="card text-sm text-red-600">{{ error }}</p>

      <div v-else class="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 space-y-6 lg:space-y-0">
       <div class="space-y-6 min-w-0">
        <section>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Current jobs</h2>
          <div v-if="!open.length" class="card text-center">
            <Car class="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p class="text-sm text-slate-500">Nothing in progress right now.</p>
            <a v-if="portal.me?.workshop.phone" :href="`tel:${portal.me.workshop.phone.replace(/\s+/g, '')}`" class="inline-flex items-center gap-1.5 mt-3 text-sm text-brand-500 font-medium"><Phone class="w-4 h-4" /> Call {{ portal.me.workshop.name }}</a>
          </div>
          <ul v-else class="space-y-3">
            <li v-for="j in open" :key="j.id">
              <router-link :to="{ name: 'portal-job', params: { id: j.id } }" class="card block hover:border-brand-300 transition-colors">
                <div class="flex items-start gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-mono text-base font-bold text-slate-800 dark:text-slate-100 tracking-wide">{{ j.vehicle?.registration ?? j.jobNumber }}</span>
                      <span v-if="j.vehicle?.make" class="text-sm text-slate-500">{{ j.vehicle.make }} {{ j.vehicle.model }}</span>
                    </div>
                    <p class="text-sm text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{{ j.description }}</p>
                    <div class="flex items-center gap-2 mt-2 flex-wrap">
                      <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{{ j.statusPhrase }}</span>
                      <span v-if="j.nextVisitDate" class="inline-flex items-center gap-1 text-xs text-slate-500"><MapPin class="w-3.5 h-3.5" /> {{ j.onSite ? 'Engineer visiting' : 'Booked' }} {{ day(j.nextVisitDate) }}</span>
                      <span v-if="j.messagesCount" class="inline-flex items-center gap-1 text-xs text-slate-500"><MessageSquare class="w-3.5 h-3.5" /> {{ j.messagesCount }}</span>
                    </div>
                    <p class="text-xs text-slate-400 mt-1.5">{{ j.nextStep }}</p>
                  </div>
                  <ChevronRight class="w-5 h-5 text-slate-300 flex-shrink-0 mt-1" />
                </div>
              </router-link>
            </li>
          </ul>
        </section>

        <section v-if="closed.length">
          <button type="button" class="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 mb-2" @click="showClosed = !showClosed">
            Past jobs ({{ closed.length }}) <ChevronRight :class="['w-3.5 h-3.5 transition-transform', showClosed ? 'rotate-90' : '']" />
          </button>
          <ul v-if="showClosed" class="divide-y divide-slate-100 dark:divide-dark-border card !p-0">
            <li v-for="j in closed" :key="j.id">
              <router-link :to="{ name: 'portal-job', params: { id: j.id } }" class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5">
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-slate-700 dark:text-slate-200 truncate"><span class="font-mono font-semibold">{{ j.vehicle?.registration ?? j.jobNumber }}</span> · {{ j.description }}</p>
                  <p class="text-xs text-slate-400">{{ j.statusPhrase }}<template v-if="j.completedAt"> · {{ day(j.completedAt) }}</template></p>
                </div>
                <ChevronRight class="w-4 h-4 text-slate-300" />
              </router-link>
            </li>
          </ul>
        </section>

       </div>
       <div class="space-y-6 min-w-0">
        <section v-if="vehicles.length">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Your vehicles</h2>
          <ul class="grid sm:grid-cols-2 lg:grid-cols-1 gap-2">
            <li v-for="v in vehicles" :key="v.id" class="card !py-3 flex items-center gap-3">
              <Car class="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div class="min-w-0">
                <p class="font-mono font-semibold text-slate-800 dark:text-slate-100">{{ v.registration }}</p>
                <p class="text-xs text-slate-500 truncate">{{ [v.make, v.model, v.colour].filter(Boolean).join(' · ') }}<template v-if="v.motExpiryDate"> · MOT {{ day(v.motExpiryDate) }}</template></p>
              </div>
            </li>
          </ul>
        </section>

        <p class="text-xs text-slate-400 text-center lg:text-left pt-2">
          Need something else? Call {{ portal.me?.workshop.name }}<template v-if="portal.me?.workshop.phone"> on <a :href="`tel:${portal.me.workshop.phone.replace(/\s+/g, '')}`" class="text-brand-500">{{ portal.me.workshop.phone }}</a></template>.
        </p>
       </div>
      </div>
    </div>
  </PortalLayout>
</template>
