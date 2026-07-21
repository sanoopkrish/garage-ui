# API Integration Guide

This document covers everything a developer needs to connect this frontend template to a real backend API.

---

## Quick Start

1. Set your API URL and disable mock mode in `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_MOCK_AUTH=false
```

2. Run the dev server:

```bash
npm install
npm run dev
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for all API calls | `http://localhost:3000/api/v1` |
| `VITE_MOCK_AUTH` | `true` = no backend needed (template demo mode) | `false` for real API |

Production values go in `.env.production`.

---

## Auth Integration

**File:** `src/stores/auth.ts`

The auth store is the main integration point. When `VITE_MOCK_AUTH=false` it calls real endpoints. The Axios client (`src/api/client.ts`) handles JWT injection and silent refresh automatically.

### Required Backend Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Login with email + password |
| `POST` | `/auth/refresh` | Silent token refresh (uses httpOnly cookie) |
| `POST` | `/auth/logout` | Clear refresh token cookie |
| `GET` | `/auth/profile` | Fetch logged-in user object |
| `POST` | `/auth/change-password` | Force password change on first login |

### Expected Login Response

```json
{
  "access_token": "eyJ...",
  "session_id": "uuid",
  "mustChangePassword": false,
  "user": {
    "id": "uuid",
    "email": "admin@garage.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin",
    "companyId": "uuid",
    "profilePhoto": "https://...",
    "company": {
      "id": "uuid",
      "name": "My Garage Ltd",
      "subdomain": "garage"
    }
  }
}
```

### Expected Profile Response

Same shape as the `user` object above.

### Token Strategy

- **Access token** lives in memory only (never localStorage) — XSS safe
- **Refresh token** must be in an `httpOnly` cookie set by the backend
- The Axios interceptor auto-retries any 401 with a silent refresh before failing

---

## Axios Client

**File:** `src/api/client.ts`

All API calls go through this configured Axios instance. No changes needed here unless you need custom headers or multipart support.

```ts
import api from '@/api/client'

// Example usage anywhere in the app
const response = await api.get('/jobs')
const data = response.data
```

---

## Module API Integration

Each module below lists:
- The view file to update
- The store file to create (following the pattern)
- The API endpoints to implement on the backend

---

### Dashboard

**View:** `src/views/Dashboard/DashboardView.vue`

Currently uses hardcoded mock arrays. Replace with API calls:

```ts
// Create src/api/dashboard.api.ts
import api from '@/api/client'

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentJobs: (limit = 5) => api.get(`/jobs?limit=${limit}&sort=createdAt:desc`),
  getAlerts: () => api.get('/dashboard/alerts'),
}
```

**Backend endpoints needed:**

| Method | Endpoint | Returns |
|---|---|---|
| `GET` | `/dashboard/stats` | `{ activeJobs, totalCustomers, vehiclesBooked, todayRevenue }` |
| `GET` | `/dashboard/alerts` | `Alert[]` |

---

### Jobs / Work Orders

**View:** `src/views/Jobs/JobListView.vue`, `src/views/Jobs/JobDetailView.vue`

**Create:** `src/api/jobs.api.ts`

```ts
import api from '@/api/client'

export const jobsApi = {
  getAll: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/jobs', { params }),
  getById: (id: string) => api.get(`/jobs/${id}`),
  create: (payload: CreateJobDto) => api.post('/jobs', payload),
  update: (id: string, payload: Partial<CreateJobDto>) => api.patch(`/jobs/${id}`, payload),
  delete: (id: string) => api.delete(`/jobs/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/jobs/${id}/status`, { status }),
}
```

**Create:** `src/stores/jobs.store.ts`

```ts
import { defineStore } from 'pinia'
import { jobsApi } from '@/api/jobs.api'

export const useJobsStore = defineStore('jobs', {
  state: () => ({
    jobs: [] as Job[],
    loading: false,
    total: 0,
  }),
  actions: {
    async fetchJobs(params?: object) {
      this.loading = true
      try {
        const res = await jobsApi.getAll(params)
        this.jobs = res.data.data
        this.total = res.data.total
      } finally {
        this.loading = false
      }
    },
    async createJob(payload: CreateJobDto) {
      const res = await jobsApi.create(payload)
      this.jobs.unshift(res.data)
    },
  },
})
```

**Backend endpoints needed:**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/jobs` | List all jobs (paginated, filterable by status/search) |
| `GET` | `/jobs/:id` | Job detail with parts and labour |
| `POST` | `/jobs` | Create new job |
| `PATCH` | `/jobs/:id` | Update job fields |
| `PATCH` | `/jobs/:id/status` | Change job status |
| `DELETE` | `/jobs/:id` | Delete job |

**Job DTO shape:**

```ts
interface CreateJobDto {
  customerId: string
  vehicleId: string
  service: string
  technicianId?: string
  dueDate: string        // ISO date string
  notes?: string
}
```

---

### Customers

**View:** `src/views/Customers/CustomerListView.vue`, `src/views/Customers/CustomerDetailView.vue`

**Create:** `src/api/customers.api.ts`

```ts
export const customersApi = {
  getAll: (params?: object) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (payload: CreateCustomerDto) => api.post('/customers', payload),
  update: (id: string, payload: object) => api.patch(`/customers/${id}`, payload),
  delete: (id: string) => api.delete(`/customers/${id}`),
  getVehicles: (id: string) => api.get(`/customers/${id}/vehicles`),
  getJobs: (id: string) => api.get(`/customers/${id}/jobs`),
}
```

**Backend endpoints needed:**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/customers` | List customers (search, paginate) |
| `GET` | `/customers/:id` | Customer detail |
| `POST` | `/customers` | Create customer |
| `PATCH` | `/customers/:id` | Update customer |
| `DELETE` | `/customers/:id` | Delete customer |
| `GET` | `/customers/:id/vehicles` | Customer's vehicles |
| `GET` | `/customers/:id/jobs` | Customer's job history |

**Customer DTO:**

```ts
interface CreateCustomerDto {
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  city?: string
  postcode?: string
}
```

---

### Vehicles

**View:** `src/views/Vehicles/VehicleListView.vue`, `src/views/Vehicles/VehicleDetailView.vue`

**Create:** `src/api/vehicles.api.ts`

```ts
export const vehiclesApi = {
  getAll: (params?: object) => api.get('/vehicles', { params }),
  getById: (id: string) => api.get(`/vehicles/${id}`),
  create: (payload: CreateVehicleDto) => api.post('/vehicles', payload),
  update: (id: string, payload: object) => api.patch(`/vehicles/${id}`, payload),
  getServiceHistory: (id: string) => api.get(`/vehicles/${id}/jobs`),
}
```

**Backend endpoints needed:**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/vehicles` | List all vehicles |
| `GET` | `/vehicles/:id` | Vehicle detail + service history |
| `POST` | `/vehicles` | Register vehicle |
| `PATCH` | `/vehicles/:id` | Update vehicle (mileage, MOT date etc.) |
| `GET` | `/vehicles/:id/jobs` | Service history |

**Vehicle DTO:**

```ts
interface CreateVehicleDto {
  customerId: string
  make: string
  model: string
  year: number
  registration: string
  colour?: string
  fuel: 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric'
  vin?: string
  mileage?: number
  motExpiry?: string
  nextServiceDate?: string
}
```

---

### Technicians

**View:** `src/views/Technicians/TechnicianListView.vue`

**Create:** `src/api/technicians.api.ts`

```ts
export const techniciansApi = {
  getAll: (params?: object) => api.get('/technicians', { params }),
  create: (payload: CreateTechnicianDto) => api.post('/technicians', payload),
  update: (id: string, payload: object) => api.patch(`/technicians/${id}`, payload),
  delete: (id: string) => api.delete(`/technicians/${id}`),
  getSchedule: (id: string, date: string) => api.get(`/technicians/${id}/schedule`, { params: { date } }),
}
```

**Backend endpoints needed:**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/technicians` | List staff |
| `POST` | `/technicians` | Add technician (or link from users) |
| `PATCH` | `/technicians/:id` | Update details / status |
| `GET` | `/technicians/:id/schedule` | Week schedule for calendar view |

---

### Schedule / Appointments

**View:** `src/views/Schedule/ScheduleView.vue`

**Create:** `src/api/appointments.api.ts`

```ts
export const appointmentsApi = {
  getWeek: (startDate: string) => api.get('/appointments', { params: { startDate, view: 'week' } }),
  create: (payload: CreateAppointmentDto) => api.post('/appointments', payload),
  update: (id: string, payload: object) => api.patch(`/appointments/${id}`, payload),
  cancel: (id: string) => api.patch(`/appointments/${id}/cancel`),
}
```

**Backend endpoints needed:**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/appointments` | List by week (pass `startDate` query param) |
| `POST` | `/appointments` | Book appointment |
| `PATCH` | `/appointments/:id` | Reschedule / update |
| `PATCH` | `/appointments/:id/cancel` | Cancel |

**Appointment DTO:**

```ts
interface CreateAppointmentDto {
  customerId: string
  vehicleId: string
  technicianId: string
  service: string
  date: string       // YYYY-MM-DD
  startTime: string  // HH:MM
  durationHours: number
}
```

---

### Inventory / Parts

**View:** `src/views/Inventory/InventoryListView.vue`

**Create:** `src/api/inventory.api.ts`

```ts
export const inventoryApi = {
  getAll: (params?: object) => api.get('/inventory', { params }),
  getById: (id: string) => api.get(`/inventory/${id}`),
  create: (payload: CreatePartDto) => api.post('/inventory', payload),
  update: (id: string, payload: object) => api.patch(`/inventory/${id}`, payload),
  adjustStock: (id: string, quantity: number, reason: string) =>
    api.post(`/inventory/${id}/adjust`, { quantity, reason }),
  getLowStock: () => api.get('/inventory/low-stock'),
}
```

**Backend endpoints needed:**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/inventory` | List all parts |
| `POST` | `/inventory` | Add new part |
| `PATCH` | `/inventory/:id` | Update part details |
| `POST` | `/inventory/:id/adjust` | Stock adjustment (in/out) |
| `GET` | `/inventory/low-stock` | Parts below minimum level |

**Part DTO:**

```ts
interface CreatePartDto {
  name: string
  sku: string
  category: string
  initialStock: number
  minStock: number
  unitCost: number
  sellPrice: number
  supplier?: string
  location?: string
}
```

---

### Invoices

**View:** `src/views/Invoices/InvoiceListView.vue`, `src/views/Invoices/InvoiceDetailView.vue`

**Create:** `src/api/invoices.api.ts`

```ts
export const invoicesApi = {
  getAll: (params?: object) => api.get('/invoices', { params }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  createFromJob: (jobId: string) => api.post(`/jobs/${jobId}/invoice`),
  markPaid: (id: string, method: string) => api.patch(`/invoices/${id}/paid`, { method }),
  void: (id: string) => api.patch(`/invoices/${id}/void`),
  send: (id: string) => api.post(`/invoices/${id}/send`),
  download: (id: string) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
}
```

**Backend endpoints needed:**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/invoices` | List invoices (filterable by status) |
| `GET` | `/invoices/:id` | Invoice detail with line items |
| `POST` | `/jobs/:id/invoice` | Generate invoice from a job |
| `PATCH` | `/invoices/:id/paid` | Mark as paid |
| `PATCH` | `/invoices/:id/void` | Void invoice |
| `POST` | `/invoices/:id/send` | Email to customer |
| `GET` | `/invoices/:id/pdf` | PDF download (blob response) |

---

### Administration — Users

**View:** `src/views/Administration/UserListView.vue`

This typically maps to your existing `/users` and `/auth` backend endpoints. Follow the same pattern — create `src/api/users.api.ts` and a Pinia store.

---

## Pagination Convention

All list endpoints should follow this response shape for the Pinia stores to work consistently:

```json
{
  "data": [...],
  "total": 142,
  "page": 1,
  "limit": 20
}
```

Pass pagination as query params:

```ts
api.get('/jobs', { params: { page: 1, limit: 20, search: 'BMW', status: 'open' } })
```

---

## Adding a Real API Call — Step by Step

1. **Create the API file** in `src/api/<module>.api.ts`
2. **Create the Pinia store** in `src/stores/<module>.store.ts` with `state`, `getters`, and `actions`
3. **Update the view** — replace the `ref([...])` mock array with `onMounted(() => store.fetchAll())`
4. **Pass `:loading="store.loading"`** to `UiTable` for skeleton rows while fetching
5. **Use `ToastService.error()`** in catch blocks for user-facing errors

### Example — swapping mock data in JobListView

```ts
// Before (mock)
const jobs = ref<Job[]>([{ id: 'WO-0041', ... }])

// After (real API)
import { useJobsStore } from '@/stores/jobs.store'
const jobsStore = useJobsStore()

onMounted(() => jobsStore.fetchJobs())

const filtered = computed(() => jobsStore.jobs.filter(...))
```

```html
<!-- Pass loading to UiTable -->
<UiTable :headers="[...]" :loading="jobsStore.loading">
```

---

## RBAC / Permissions

**File:** `src/composables/usePermissions.ts`

Currently returns `true` for all permissions (open template). To enable real RBAC:

1. Add a `userPermissions` object to the auth store after login (fetched from `/auth/permissions` or embedded in the login response)
2. Update `useCrudPermissions` to check `authStore.userPermissions`
3. Use `v-permission` directive on buttons to hide actions the user cannot perform

```ts
// Usage in views (already wired)
const { canCreate, canUpdate, canDelete } = useCrudPermissions('jobs')
```

```html
<!-- Hide delete button for users without permission -->
<button v-permission="'jobs.delete'" @click="deleteJob(j.id)">Delete</button>
```

---

## File Checklist — What to Create Per Module

For each new module, create these three files:

```
src/
  api/
    <module>.api.ts          ← axios calls
  stores/
    <module>.store.ts        ← pinia state + actions
  views/
    <Module>/
      <Module>ListView.vue   ← connect to store, remove mock data
      <Module>DetailView.vue ← connect to store
```

---

## Error Handling

Axios errors are caught globally by the interceptor. For view-level errors use `ToastService`:

```ts
import { ToastService } from '@/services/toast.service'

try {
  await store.createJob(payload)
  ToastService.success('Job created.')
  showModal.value = false
} catch (e: any) {
  ToastService.error(e.response?.data?.message || 'Failed to create job.')
}
```

---

## Disabling Mock Mode for Production

In `.env.production`:

```env
VITE_API_BASE_URL=https://api.yourgarage.com/api/v1
VITE_MOCK_AUTH=false
```

Build:

```bash
npm run build
```

The mock login banner and pre-filled demo credentials will disappear automatically.
