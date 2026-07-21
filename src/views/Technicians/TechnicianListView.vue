<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import UiTable from '@/components/Ui/UiTable.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import { Pencil, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { getUsers } from '@/api/users.api'
import { getTechnicianStats } from '@/api/jobs.api'
import type { TechnicianStats } from '@/api/jobs.api'
import type { User } from '@/api/users.api'
import { useCrudPermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/**
 * Technicians are USERS holding the Technician or Field Engineer role
 * (no separate entity). Skills come from master data (Admin → Master Data → Skills)
 * and are assigned on the user edit page.
 */
const TECHNICIAN_ROLES = 'Technician,Field Engineer'

const router = useRouter()
const { canUpdate } = useCrudPermissions('team', 'technicians')

const technicians = ref<User[]>([])
const statsByTech = ref<Record<string, TechnicianStats>>({})
const total = ref(0)
const loading = ref(true)
const page = ref(1)
const pageSize = 10
const totalPages = ref(1)

const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

async function load(p = page.value) {
  loading.value = true
  try {
    const response = await getUsers({
      role: TECHNICIAN_ROLES,
      search: searchQuery.value || undefined,
      page: p,
      pageSize,
    })
    technicians.value = response.items
    total.value = response.total
    getTechnicianStats().then((stats) => {
      statsByTech.value = Object.fromEntries(stats.map((s) => [s.technicianId, s]))
    }).catch(() => {})
    page.value = p
    totalPages.value = Math.max(1, Math.ceil(response.total / pageSize))
  } catch {
    ToastService.error('Failed to load technicians')
  } finally {
    loading.value = false
  }
}

function onSearch(val: string) {
  searchQuery.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(1), 350)
}

function fullName(user: User): string {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
}

function initial(user: User): string {
  return (user.firstName?.charAt(0) ?? user.email.charAt(0)).toUpperCase()
}

function techRoles(user: User): string[] {
  const wanted = ['Technician', 'Field Engineer']
  return (user.systemRoles ?? []).filter((r) => wanted.includes(r.name)).map((r) => r.name)
}

onMounted(() => load(1))
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="Technicians" subtitle="Workshop and field staff holding the Technician or Field Engineer role.">
      <UiSearchInput :modelValue="searchQuery" placeholder="Search technicians..." @update:modelValue="onSearch" />
    </UiPageHeader>

    <p class="mb-4 text-xs text-slate-400">
      Technicians are managed as users — assign the Technician or Field Engineer role in
      <router-link to="/admin/users" class="text-brand-600 hover:underline">Users</router-link>.
      Skills are managed in Master Data and set on the user edit page.
    </p>

    <UiTable :headers="['Name', 'Email', 'Phone', 'Role', 'Skills', 'Jobs', 'Hours', 'Status', '']">
      <template v-if="loading && technicians.length === 0">
        <tr v-for="n in 4" :key="'skel-' + n" class="animate-pulse">
          <td v-for="col in 9" :key="col" class="px-4 py-3.5"><div class="h-3.5 w-24 bg-slate-200 dark:bg-white/10 rounded" /></td>
        </tr>
      </template>
      <template v-else-if="!loading && technicians.length === 0">
        <tr>
          <td colspan="9" class="px-4 py-10 text-center text-sm text-slate-400">
            No technicians yet — assign the Technician or Field Engineer role to a user.
          </td>
        </tr>
      </template>
      <tr v-else v-for="t in technicians" :key="t.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" @click="router.push(`/technicians/${t.id}`)">
        <td class="px-4 py-3.5">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {{ initial(t) }}
            </div>
            <span class="font-medium text-slate-800 dark:text-slate-100">{{ fullName(t) }}</span>
          </div>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-500 dark:text-slate-400">{{ t.email }}</td>
        <td class="px-4 py-3.5 text-sm text-slate-500 dark:text-slate-400">{{ t.phoneNumber || '—' }}</td>
        <td class="px-4 py-3.5">
          <div class="flex flex-wrap gap-1">
            <span v-for="r in techRoles(t)" :key="r" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">{{ r }}</span>
          </div>
        </td>
        <td class="px-4 py-3.5">
          <div class="flex flex-wrap gap-1">
            <span v-for="s in (t.skills ?? [])" :key="s.id" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">{{ s.name }}</span>
            <span v-if="!t.skills?.length" class="text-sm text-slate-400">—</span>
          </div>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
          <template v-if="statsByTech[t.id]">{{ statsByTech[t.id].jobCount }} <span class="text-xs text-slate-400">({{ statsByTech[t.id].completedCount }} done)</span></template>
          <template v-else>—</template>
        </td>
        <td class="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {{ statsByTech[t.id] ? `${statsByTech[t.id].totalHours}h` : '—' }}
        </td>
        <td class="px-4 py-3.5">
          <UiBadge :variant="t.status === 'active' ? 'done' : 'pending'" dot>{{ t.status === 'active' ? 'Active' : 'Inactive' }}</UiBadge>
        </td>
        <td class="px-4 py-3.5">
          <button
            v-if="canUpdate"
            @click.stop="router.push(`/admin/users/${t.id}/edit`)"
            class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors"
            title="Edit user"
          >
            <Pencil class="w-4 h-4" />
          </button>
        </td>
      </tr>
    </UiTable>

    <div v-if="totalPages > 1" class="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="page <= 1" @click="load(page - 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronLeft class="w-4 h-4" /></button>
      <button :disabled="page >= totalPages" @click="load(page + 1)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40"><ChevronRight class="w-4 h-4" /></button>
    </div>
  </DefaultLayout>
</template>
