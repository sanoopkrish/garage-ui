import api from '@/api/client'

export interface Company {
  id: string
  name: string
  subdomain: string
  description?: string
  website?: string
  companyAddress?: string
  companyEmail?: string
  companyPhone?: string
  companyFax?: string
  companyTaxNumber?: string
  isActive: boolean
  settings?: CompanySettings
  moduleConfiguration?: Record<string, any>
  logos?: { headerLogo?: string; loginLogo?: string; reportLogo?: string }
}

export interface UpdateCompanyDto {
  name?: string
  description?: string
  website?: string
  companyAddress?: string
  companyEmail?: string
  companyPhone?: string
  companyFax?: string
  companyTaxNumber?: string
}

/** Clocking & timesheet rules (Sprint 18) — the API always returns these fully resolved */
export interface WorkingTimeSettings {
  workingDays: number[]
  shiftStart: string
  shiftEnd: string
  lateGraceMinutes: number
  unpaidBreakMinutes: number
  breakAfterHours: number
  overtimeMode: string
  overtimeDailyThresholdHours: number
  autoClockOutAfterHours: number
  workshopGeofence: { lat: number; lng: number; radiusMetres: number } | null
  timesheetApproverTag: string
  kioskEnabled: boolean
}

/** Purchasing feature switches (Sprint 23) — the API always returns these fully resolved */
export interface ProcurementSettings {
  enabled: boolean
  approvalsEnabled: boolean
  poApprovalThreshold: number
  goodsReceiptsEnabled: boolean
  billsEnabled: boolean
  billPaymentsEnabled: boolean
  billVarianceTolerance: number
  billVariancePercent: number
  aiInvoiceCapture: boolean
  lowStockSuggestions: boolean
  fieldReceiptCapture: boolean
}

export interface CompanySettings {
  timezone?: string
  dateFormat?: string
  currency?: string
  vatRate?: number
  paymentTermsDays?: number
  bankName?: string
  bankSortCode?: string
  bankAccountNumber?: string
  storageChargeEnabled?: boolean
  storageChargePerDay?: number
  storageChargeAfterDays?: number
  /** pre-fill for new trade (B2B) accounts; null = none */
  defaultTradeCreditAmount?: number | null
  workingTime?: WorkingTimeSettings
  procurement?: Partial<ProcurementSettings>
  passwordMinLength?: number
  passwordRequireMixed?: boolean
  idleTimeoutMinutes?: number
  retentionPhotosMonths?: number
  retentionJobsYears?: number
}

export interface NotificationSettings {
  notificationsEnabled: boolean
  internalNotificationsEnabled: boolean
  emailNotificationsEnabled: boolean
  smsNotificationsEnabled: boolean
}

export async function getCompany(): Promise<Company> {
  const response = await api.get('/company/profile')
  return response.data?.data ?? response.data
}

export async function updateCompany(dto: UpdateCompanyDto): Promise<Company> {
  const response = await api.patch('/company/profile', dto)
  return response.data?.data ?? response.data
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const response = await api.get('/company/settings')
  return response.data?.data ?? response.data
}

export async function updateCompanySettings(dto: CompanySettings): Promise<CompanySettings> {
  const response = await api.patch('/company/settings', dto)
  return response.data?.data ?? response.data
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await api.get('/company/notification-settings')
  return response.data?.data ?? response.data
}

export async function updateNotificationSettings(
  dto: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
  const response = await api.patch('/company/notification-settings', dto)
  return response.data?.data ?? response.data
}
