# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (port 5174; proxies /api → http://localhost:3003)
npm run build     # Type-check (vue-tsc) then build for production
npm run preview   # Preview production build locally
```

No test or lint scripts are configured. The backend API is a separate repo expected at `http://localhost:3003` in dev.

## Architecture

**garage-ui** ("GarageOS") is a Vue 3 + TypeScript + Vite SPA for garage/automotive service management, built toward the scope in `AUTOCURE_PROPOSAL.md`. It is **multi-tenant**: each garage company is a tenant identified by subdomain, and there is a separate owner/platform domain for managing companies.

### Integration status — two kinds of views

- **Wired to real API + Pinia**: auth, and all Administration modules — users, roles, companies, master data, audit logs, settings — plus notifications (in `AppHeader`).
- **Still hardcoded mock `ref([...])` arrays**: the business modules — dashboard, jobs, customers, vehicles, technicians, schedule, inventory, invoices.

`API_INTEGRATION.md` documents the pattern for wiring a module: create `src/api/<module>.api.ts` (Axios methods + DTO interfaces) → `src/stores/<module>.store.ts` (Pinia state/actions) → replace the view's mock ref with the store. Follow the existing users/roles/companies files as reference implementations.

### Multi-tenancy

- `src/composables/useTenant.ts` resolves the tenant subdomain from the URL host; dev falls back to `VITE_TENANT_SUBDOMAIN` (default `demo`)
- `src/api/client.ts` sends `X-Tenant-Subdomain` and `X-Original-Host` headers on every request
- "Owner domain" = no subdomain in URL (always true in dev). Routes with `meta.ownerOnly` (the `/admin/companies` module) are blocked on tenant subdomains in production only
- A 403 response whose message mentions "tenant" clears tenant state and hard-redirects to `/tenant-access-denied`

### Authentication

- `src/stores/auth.ts`; session restored at app mount (`src/main.ts`) via `POST /auth/refresh` — access token kept in memory, refresh token in httpOnly cookie, session id in `sessionStorage`, proactive refresh scheduled before expiry
- `src/api/client.ts` injects the Bearer token and on 401 performs a single refresh with a subscriber queue (concurrent 401s wait for the one refresh); 401 on `/auth/refresh` or `/auth/logout` forces logout
- Mock mode: `VITE_MOCK_AUTH=true` bypasses real auth (currently `false` in `.env`)
- Route guard in `src/router/index.ts` checks `meta.requiresAuth` and redirects to login with a `redirect` query param

### Permissions (RBAC)

- Backend returns a permission tree; the auth store flattens it to `userPermissionsFlat` with keys like `menus.workshop.jobs.read`; `isAdmin` bypasses all checks
- `src/composables/usePermissions.ts`: `useCrudPermissions(module, subModule)` returns `canCreate/canRead/canUpdate/canDelete/canAccess`; per-module helpers exist (`useJobPermissions`, `useCustomerPermissions`, …) — use those in views
- Global `v-permission` directive hides elements the user lacks permission for (registered in `main.ts`, alongside `v-click-outside`)
- Role/permission editing UI lives in `src/components/Roles/PermissionsEditor.vue`

### Generated types

- `src/types/generated/` is auto-generated from the backend repo — **do not edit manually**; regeneration happens from the backend (`npm run generate:types` there, not in this package.json)
- Import enums/constants from `@/types/generated`; `constants/module-configuration.ts` is the single source of truth for configurable modules/submodules
- `src/types/generated.backup/` is a snapshot kept for reference

### Pinia outside components

`src/stores/piniaInstance.ts` exports the shared `pinia` instance so stores can be used in the router guard and `main.ts` before the app mounts. Use `useAuthStore(pinia)` in non-component code.

### Key Conventions

- Vue 3 Composition API with `<script setup>` throughout; path alias `@/` → `src/`
- Reusable UI components in `src/components/Ui/` (`UiButton`, `UiTable`, `UiModal`, `UiMultiSelect`, …); layout in `src/components/Layout/`
- Tailwind CSS 3, custom brand orange palette, class-based dark mode via `useDarkMode()` (persists to localStorage)
- Toasts via `ToastService` (`src/services/toast.service.ts`, wraps vue-toastification); form validation via `useValidation()` (wraps Vuelidate 2)
- Global error handler in `src/utils/errorHandler.ts`, registered in `main.ts` for both `app.config.errorHandler` and unhandled rejections
- Page titles come from route `meta.title` (`"<title> | GarageOS"`)

### Environment variables

`.env`: `VITE_API_BASE_URL` (used only in production builds — dev always uses the `/api` proxy), `VITE_MOCK_AUTH`, `VITE_TENANT_SUBDOMAIN` (dev tenant fallback).
