<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTenant } from '@/composables/useTenant'
import { useAuthStore } from '@/stores/auth'
import {
  LayoutDashboard, Wrench, Users, Car, UserCog,
  CalendarDays, Package, FileText, Settings, ChevronLeft, ChevronRight,
  Gauge, Shield, UsersRound, Database, Building2, ScrollText,
  Mail, Hash,
} from 'lucide-vue-next'

const route = useRoute()
const collapsed = ref(false)
const { isOwnerDomain } = useTenant()
const authStore = useAuthStore()

interface NavItem {
  label: string
  to: string
  icon: unknown
  section: string | null
  ownerOnly?: boolean
  /** Read-permission key(s) — item shown if the user has ANY of them; admin sees all */
  permissionKey?: string | string[]
}

const nav: NavItem[] = [
  { label: 'Dashboard',    to: '/dashboard',    icon: LayoutDashboard, section: null,       permissionKey: 'menus.dashboard.read' },
  { label: 'Jobs',         to: '/jobs',         icon: Wrench,          section: 'Workshop', permissionKey: 'menus.workshop.jobs.read' },
  { label: 'Schedule',     to: '/schedule',     icon: CalendarDays,    section: 'Workshop', permissionKey: 'menus.workshop.schedule.read' },
  { label: 'Customers',    to: '/customers',    icon: Users,           section: 'CRM',      permissionKey: 'menus.crm.customers.read' },
  { label: 'Vehicles',     to: '/vehicles',     icon: Car,             section: 'CRM',      permissionKey: 'menus.crm.vehicles.read' },
  { label: 'Technicians',  to: '/technicians',  icon: UserCog,         section: 'Team',     permissionKey: 'menus.team.technicians.read' },
  { label: 'Inventory',    to: '/inventory',    icon: Package,         section: 'Stock',    permissionKey: 'menus.stock.inventory.read' },
  { label: 'Invoices',     to: '/invoices',     icon: FileText,        section: 'Finance',  permissionKey: 'menus.finance.invoices.read' },
  { label: 'Companies',    to: '/admin/companies',   icon: Building2,  section: 'Admin', ownerOnly: true },
  { label: 'Users',        to: '/admin/users',       icon: UsersRound, section: 'Admin', permissionKey: 'menus.administration.users.read' },
  { label: 'Audit Logs',   to: '/admin/audit-logs',  icon: ScrollText, section: 'Admin', permissionKey: 'menus.administration.auditLogs.read' },
  { label: 'Roles',        to: '/admin/roles',       icon: Shield,     section: 'Admin', permissionKey: 'menus.administration.systemRoles.read' },
  { label: 'Email Templates', to: '/admin/notification-templates', icon: Mail, section: 'Admin', permissionKey: 'menus.administration.settings.notifications.read' },
  { label: 'Numbering',    to: '/admin/numbering',   icon: Hash,       section: 'Admin', permissionKey: 'menus.administration.settings.business.read' },
  { label: 'Master Data',  to: '/admin/master-data', icon: Database,   section: 'Admin', permissionKey: [
    'menus.administration.masterData.departments.read',
    'menus.administration.masterData.jobTitles.read',
    'menus.administration.masterData.employmentTypes.read',
    'menus.administration.masterData.employeeRoles.read',
  ] },
  { label: 'Settings',     to: '/admin/settings',    icon: Settings,   section: 'Admin', permissionKey: [
    'menus.administration.settings.business.read',
    'menus.administration.settings.billing.read',
    'menus.administration.settings.notifications.read',
    'menus.administration.settings.security.read',
    'menus.administration.settings.appearance.read',
  ] },
]

function hasMenuAccess(item: NavItem): boolean {
  if (authStore.userPermissions?.isAdmin) return true
  if (!item.permissionKey) return true
  const flat = authStore.userPermissionsFlat ?? {}
  const keys = Array.isArray(item.permissionKey) ? item.permissionKey : [item.permissionKey]
  return keys.some((key) => !!flat[key])
}

const grouped = computed(() => {
  const sections: Record<string, NavItem[]> = {}
  for (const item of nav) {
    if (item.ownerOnly && !isOwnerDomain.value) continue
    if (!hasMenuAccess(item)) continue
    const key = item.section || 'Main'
    if (!sections[key]) sections[key] = []
    sections[key].push(item)
  }
  return sections
})

const isActive = (to: string) => route.path.startsWith(to)
</script>

<template>
  <aside
    :class="[
      'flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 relative',
      collapsed ? 'w-16' : 'w-60',
    ]"
  >
    <!-- Logo -->
    <div class="flex items-center gap-3 px-4 py-5 border-b border-white/10">
      <div class="flex-shrink-0 w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
        <Gauge class="w-5 h-5 text-white" />
      </div>
      <Transition name="fade">
        <span v-if="!collapsed" class="text-white font-bold text-lg tracking-tight">GarageOS</span>
      </Transition>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-4 space-y-6 px-2">
      <template v-for="(items, section) in grouped" :key="section">
        <div>
          <Transition name="fade">
            <p
              v-if="!collapsed && section !== 'Main'"
              class="px-2 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-widest"
            >
              {{ section }}
            </p>
          </Transition>
          <ul class="space-y-0.5">
            <li v-for="item in items" :key="item.to">
              <router-link
                :to="item.to"
                :class="[
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(item.to)
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'text-slate-400 hover:bg-sidebar-hover hover:text-white',
                ]"
                :title="collapsed ? item.label : ''"
              >
                <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
                <Transition name="fade">
                  <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
                </Transition>
              </router-link>
            </li>
          </ul>
        </div>
      </template>
    </nav>

    <!-- Collapse toggle -->
    <button
      @click="collapsed = !collapsed"
      class="absolute -right-3 top-20 w-6 h-6 bg-sidebar border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
    >
      <ChevronLeft v-if="!collapsed" class="w-3.5 h-3.5" />
      <ChevronRight v-else class="w-3.5 h-3.5" />
    </button>
  </aside>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
