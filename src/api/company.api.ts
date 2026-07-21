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

export interface CompanySettings {
  timezone?: string
  dateFormat?: string
  currency?: string
  vatRate?: number
  paymentTermsDays?: number
  bankName?: string
  bankSortCode?: string
  bankAccountNumber?: string
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
