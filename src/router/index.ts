import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTenant } from '@/composables/useTenant'
import { pinia } from '@/stores/piniaInstance'

const routes = [
  { path: '/', redirect: '/dashboard' },

  // Auth
  {
    path: '/auth/login',
    name: 'login',
    component: () => import('@/views/Auth/LoginView.vue'),
    meta: { title: 'Sign In', requiresAuth: false },
  },
  {
    path: '/auth/change-password',
    name: 'change-password',
    component: () => import('@/views/Auth/ChangePasswordView.vue'),
    meta: { title: 'Change Password', requiresAuth: false },
  },

  // Dashboard
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/Dashboard/DashboardView.vue'),
    meta: { title: 'Dashboard', requiresAuth: true, permissionKey: 'menus.dashboard.read' },
  },
  {
    // Self-service — every authenticated user can view/edit their own profile
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/Profile/ProfileView.vue'),
    meta: { title: 'My Profile', requiresAuth: true },
  },
  {
    path: '/notifications',
    name: 'notifications',
    component: () => import('@/views/Notifications/NotificationsView.vue'),
    meta: { title: 'Notifications', requiresAuth: true },
  },

  // Field engineer (Module 8) — mobile-first views, own layout
  {
    path: '/field/login',
    name: 'field-login',
    component: () => import('@/views/Field/FieldLoginView.vue'),
    meta: { title: 'Field Sign In', requiresAuth: false },
  },
  {
    path: '/field',
    name: 'field-jobs',
    component: () => import('@/views/Field/FieldJobListView.vue'),
    meta: { title: 'My Jobs', requiresAuth: true, permissionKey: 'menus.workshop.jobs.read' },
  },
  {
    path: '/field/jobs/:id',
    name: 'field-job-detail',
    component: () => import('@/views/Field/FieldJobDetailView.vue'),
    meta: { title: 'Job', requiresAuth: true, permissionKey: 'menus.workshop.jobs.read' },
  },
  {
    path: '/field/route',
    name: 'field-route',
    component: () => import('@/views/Field/FieldRouteView.vue'),
    meta: { title: "Today's route", requiresAuth: true, permissionKey: 'menus.workshop.jobs.read' },
  },
  {
    path: '/field/kit',
    name: 'field-kit',
    component: () => import('@/views/Field/FieldFindKitView.vue'),
    meta: { title: 'Find kit', requiresAuth: true, permissionKey: 'menus.assets.register.read' },
  },
  {
    path: '/field/timesheet',
    name: 'field-timesheet',
    component: () => import('@/views/Field/FieldTimesheetView.vue'),
    meta: { title: 'My Week', requiresAuth: true },
  },

  // Wall-tablet clocking — public: the tablet is never logged in; the API checks the tenant's kiosk switch
  {
    path: '/kiosk',
    name: 'kiosk',
    component: () => import('@/views/Kiosk/KioskClockView.vue'),
    meta: { title: 'Clock in / out', requiresAuth: false },
  },

  // HR — clocking in & timesheets (Sprint 18)
  {
    path: '/hr/my-week',
    name: 'hr-my-week',
    component: () => import('@/views/Hr/MyWeekView.vue'),
    meta: { title: 'My Week', requiresAuth: true },
  },
  {
    path: '/hr/attendance',
    name: 'hr-attendance',
    component: () => import('@/views/Hr/AttendanceView.vue'),
    meta: { title: 'Attendance', requiresAuth: true, permissionKey: 'menus.hr.attendance.read' },
  },
  {
    path: '/hr/timesheets',
    name: 'hr-timesheets',
    component: () => import('@/views/Hr/TimesheetListView.vue'),
    meta: { title: 'Timesheets', requiresAuth: true, permissionKey: 'menus.hr.timesheets.read' },
  },
  {
    path: '/hr/timesheets/:id',
    name: 'hr-timesheet-detail',
    component: () => import('@/views/Hr/TimesheetDetailView.vue'),
    meta: { title: 'Timesheet', requiresAuth: true, permissionKey: 'menus.hr.timesheets.read' },
  },

  // Asset register (Sprint 21)
  {
    path: '/assets',
    name: 'assets',
    component: () => import('@/views/Assets/AssetListView.vue'),
    meta: { title: 'Asset register', requiresAuth: true, permissionKey: 'menus.assets.register.read' },
  },

  // Jobs / Work Orders
  {
    path: '/jobs',
    name: 'jobs',
    component: () => import('@/views/Jobs/JobListView.vue'),
    meta: { title: 'Jobs', requiresAuth: true, permissionKey: 'menus.workshop.jobs.read' },
  },
  {
    path: '/jobs/:id',
    name: 'job-detail',
    component: () => import('@/views/Jobs/JobDetailView.vue'),
    meta: { title: 'Job Detail', requiresAuth: true, permissionKey: 'menus.workshop.jobs.read' },
  },

  // Customers
  {
    path: '/customers',
    name: 'customers',
    component: () => import('@/views/Customers/CustomerListView.vue'),
    meta: { title: 'Customers', requiresAuth: true, permissionKey: 'menus.crm.customers.read' },
  },
  {
    path: '/customers/:id',
    name: 'customer-detail',
    component: () => import('@/views/Customers/CustomerDetailView.vue'),
    meta: { title: 'Customer Detail', requiresAuth: true, permissionKey: 'menus.crm.customers.read' },
  },

  // Vehicles
  {
    path: '/vehicles',
    name: 'vehicles',
    component: () => import('@/views/Vehicles/VehicleListView.vue'),
    meta: { title: 'Vehicles', requiresAuth: true, permissionKey: 'menus.crm.vehicles.read' },
  },
  {
    path: '/vehicles/:id',
    name: 'vehicle-detail',
    component: () => import('@/views/Vehicles/VehicleDetailView.vue'),
    meta: { title: 'Vehicle Detail', requiresAuth: true, permissionKey: 'menus.crm.vehicles.read' },
  },

  // Technicians
  {
    path: '/technicians',
    name: 'technicians',
    component: () => import('@/views/Technicians/TechnicianListView.vue'),
    meta: { title: 'Technicians', requiresAuth: true, permissionKey: 'menus.team.technicians.read' },
  },
  {
    path: '/technicians/:id',
    name: 'technician-detail',
    component: () => import('@/views/Technicians/TechnicianDetailView.vue'),
    meta: { title: 'Technician', requiresAuth: true, permissionKey: 'menus.team.technicians.read' },
  },

  // Schedule / Appointments
  {
    path: '/schedule',
    name: 'schedule',
    component: () => import('@/views/Schedule/ScheduleView.vue'),
    meta: { title: 'Schedule', requiresAuth: true, permissionKey: 'menus.workshop.schedule.read' },
  },
  // Sprint 27 — Assignments planner (technicians × days)
  {
    path: '/workshop/assignments',
    name: 'assignments-planner',
    component: () => import('@/views/Schedule/AssignmentsPlannerView.vue'),
    meta: { title: 'Assignments', requiresAuth: true, permissionKey: 'menus.workshop.assignments.read' },
  },

  // Inventory / Parts
  {
    path: '/inventory',
    name: 'inventory',
    component: () => import('@/views/Inventory/InventoryListView.vue'),
    meta: { title: 'Job Parts', requiresAuth: true, permissionKey: 'menus.stock.inventory.read' },
  },

  // Invoices
  {
    path: '/invoices',
    name: 'invoices',
    component: () => import('@/views/Invoices/InvoiceListView.vue'),
    meta: { title: 'Invoices', requiresAuth: true, permissionKey: 'menus.finance.invoices.read' },
  },
  {
    path: '/invoices/:id',
    name: 'invoice-detail',
    component: () => import('@/views/Invoices/InvoiceDetailView.vue'),
    meta: { title: 'Invoice Detail', requiresAuth: true, permissionKey: 'menus.finance.invoices.read' },
  },

  // Purchasing (Sprint 23)
  {
    path: '/procurement/orders',
    name: 'procurement-orders',
    component: () => import('@/views/Procurement/PurchaseOrderListView.vue'),
    meta: { title: 'Orders', requiresAuth: true, permissionKey: 'menus.finance.procurement.read' },
  },
  {
    path: '/procurement/orders/new',
    name: 'procurement-order-new',
    component: () => import('@/views/Procurement/PurchaseOrderFormView.vue'),
    meta: { title: 'New Purchase Order', requiresAuth: true, permissionKey: 'menus.finance.procurement.createOrder' },
  },
  {
    path: '/procurement/orders/:id/edit',
    name: 'procurement-order-edit',
    component: () => import('@/views/Procurement/PurchaseOrderFormView.vue'),
    meta: { title: 'Edit Purchase Order', requiresAuth: true, permissionKey: 'menus.finance.procurement.createOrder' },
  },
  {
    path: '/procurement/bills',
    name: 'procurement-bills',
    component: () => import('@/views/Procurement/BillListView.vue'),
    meta: { title: 'Supplier Invoices', requiresAuth: true, permissionKey: 'menus.finance.procurement.read' },
  },
  {
    path: '/procurement/stock',
    name: 'procurement-stock',
    component: () => import('@/views/Procurement/StockListView.vue'),
    meta: { title: 'Stock', requiresAuth: true, permissionKey: 'menus.finance.procurement.read' },
  },
  {
    path: '/procurement/reports',
    name: 'procurement-reports',
    component: () => import('@/views/Procurement/ProcurementReportsView.vue'),
    meta: { title: 'Purchasing Reports', requiresAuth: true, permissionKey: 'menus.finance.procurement.read' },
  },
  {
    path: '/procurement/suppliers',
    name: 'procurement-suppliers',
    component: () => import('@/views/Procurement/SupplierListView.vue'),
    meta: { title: 'Suppliers', requiresAuth: true, permissionKey: 'menus.finance.suppliers.read' },
  },

  // Companies — owner/platform domain only
  {
    path: '/admin/companies',
    name: 'admin-companies',
    component: () => import('@/views/Administration/CompaniesListView.vue'),
    meta: { title: 'Companies', requiresAuth: true, ownerOnly: true },
  },
  {
    path: '/admin/companies/create',
    name: 'admin-company-create',
    component: () => import('@/views/Administration/CompanyCreateView.vue'),
    meta: { title: 'Create Company', requiresAuth: true, ownerOnly: true },
  },
  {
    path: '/admin/companies/:id',
    name: 'admin-company-edit',
    component: () => import('@/views/Administration/CompanyEditView.vue'),
    meta: { title: 'Company', requiresAuth: true, ownerOnly: true },
  },

  // Audit Logs
  {
    path: '/admin/audit-logs',
    name: 'admin-audit-logs',
    component: () => import('@/views/Administration/AuditLogsView.vue'),
    meta: { title: 'Audit Logs', requiresAuth: true, permissionKey: 'menus.administration.auditLogs.read' },
  },
  {
    path: '/admin/audit-logs/:id',
    name: 'admin-audit-log-detail',
    component: () => import('@/views/Administration/AuditLogDetailView.vue'),
    meta: { title: 'Audit Log', requiresAuth: true, permissionKey: 'menus.administration.auditLogs.read' },
  },

  // Administration
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/views/Administration/UserListView.vue'),
    meta: { title: 'Users', requiresAuth: true, permissionKey: 'menus.administration.users.read' },
  },
  {
    path: '/admin/users/:id/edit',
    name: 'admin-user-edit',
    component: () => import('@/views/Administration/UserEditView.vue'),
    meta: { title: 'Edit User', requiresAuth: true, permissionKey: 'menus.administration.users.update' },
  },
  {
    path: '/admin/notification-templates',
    name: 'admin-notification-templates',
    component: () => import('@/views/Administration/NotificationTemplatesView.vue'),
    meta: { title: 'Notification Templates', requiresAuth: true, permissionKey: 'menus.administration.settings.notifications.read' },
  },
  {
    path: '/admin/numbering',
    name: 'admin-numbering',
    component: () => import('@/views/Administration/NumberingSequenceView.vue'),
    meta: { title: 'Document Numbering', requiresAuth: true, permissionKey: 'menus.administration.settings.business.read' },
  },
  {
    path: '/admin/settings',
    name: 'admin-settings',
    component: () => import('@/views/Administration/SettingsView.vue'),
    meta: { title: 'Settings', requiresAuth: true },
  },
  {
    path: '/admin/roles',
    name: 'admin-roles',
    component: () => import('@/views/Administration/RolesView.vue'),
    meta: { title: 'Roles', requiresAuth: true, permissionKey: 'menus.administration.systemRoles.read' },
  },
  {
    path: '/admin/master-data',
    name: 'admin-master-data',
    component: () => import('@/views/Administration/MasterDataView.vue'),
    meta: { title: 'Master Data', requiresAuth: true },
  },

  // Tenant access denied
  // Sprint 25 — in-app help centre (any signed-in user; pages are filtered by the API)
  {
    path: '/help/:slug?',
    name: 'help',
    component: () => import('@/views/Help/HelpCentreView.vue'),
    meta: { title: 'Help Centre', requiresAuth: true },
  },
  {
    path: '/tenant-access-denied',
    name: 'tenant-access-denied',
    component: () => import('@/views/Auth/TenantAccessDeniedView.vue'),
    meta: { title: 'Access Denied', requiresAuth: false },
  },

  // Catch-all
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  document.title = `${to.meta.title || 'Workshop'} | Cruise`

  if (to.meta.requiresAuth === false) return true

  const authStore = useAuthStore(pinia)
  if (!authStore.initialized) {
    await authStore.initialize()
  }

  if (!authStore.isAuthenticated) {
    // Field PWA has its own login (manifest start_url is /field)
    if (to.path.startsWith('/field')) {
      return { name: 'field-login' }
    }
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Field-only users (Technician/Field Engineer roles) live in the mobile field views.
  // Only redirect when they can actually enter /field — otherwise the RBAC branch below
  // would bounce them back here and abort navigation in an infinite redirect.
  if (authStore.isFieldWorkerOnly && (to.path === '/dashboard' || to.path === '/')) {
    const flat = authStore.userPermissionsFlat ?? {}
    if (authStore.userPermissions?.isAdmin || flat['menus.workshop.jobs.read']) {
      return { name: 'field-jobs' }
    }
  }

  // Owner-only routes need an isAdmin role (backend enforces AdminRoleGuard) and the owner
  // domain (VITE_OWNER_SUBDOMAIN, e.g. tconsult.<base domain>) — tenant subdomains are blocked.
  // isOwnerDomain is always true in dev.
  if (to.meta.ownerOnly) {
    if (authStore.userPermissions?.isAdmin !== true) {
      return to.name === 'dashboard' ? true : { name: 'dashboard' }
    }
    const { isOwnerDomain } = useTenant()
    if (!isOwnerDomain.value) {
      return { name: 'dashboard' }
    }
  }

  // RBAC: route requires a permission key unless the user is admin
  if (to.meta.permissionKey && authStore.userPermissions?.isAdmin !== true) {
    const flat = authStore.userPermissionsFlat ?? {}
    if (!flat[to.meta.permissionKey as string]) {
      return to.name === 'dashboard' ? true : { name: 'dashboard' }
    }
  }

  return true
})

export default router
