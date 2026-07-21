import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Company, UpdateCompanyDto, CompanySettings, NotificationSettings } from '@/api/company.api'
import {
  getCompany,
  updateCompany,
  getCompanySettings,
  updateCompanySettings,
  getNotificationSettings,
  updateNotificationSettings,
} from '@/api/company.api'

export const useCompanyStore = defineStore('company', () => {
  const company = ref<Company | null>(null)
  const companySettings = ref<CompanySettings | null>(null)
  const notificationSettings = ref<NotificationSettings | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchCompany(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      company.value = await getCompany()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch company data'
    } finally {
      loading.value = false
    }
  }

  async function saveCompany(dto: UpdateCompanyDto): Promise<void> {
    saving.value = true
    error.value = null
    try {
      company.value = await updateCompany(dto)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save company data'
    } finally {
      saving.value = false
    }
  }

  async function fetchCompanySettings(): Promise<void> {
    error.value = null
    try {
      companySettings.value = await getCompanySettings()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch company settings'
    }
  }

  async function saveCompanySettings(dto: CompanySettings): Promise<void> {
    saving.value = true
    error.value = null
    try {
      companySettings.value = await updateCompanySettings(dto)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save company settings'
    } finally {
      saving.value = false
    }
  }

  async function fetchNotificationSettings(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      notificationSettings.value = await getNotificationSettings()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch notification settings'
    } finally {
      loading.value = false
    }
  }

  async function saveNotificationSettings(dto: Partial<NotificationSettings>): Promise<void> {
    saving.value = true
    error.value = null
    try {
      notificationSettings.value = await updateNotificationSettings(dto)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save notification settings'
    } finally {
      saving.value = false
    }
  }

  return {
    company,
    companySettings,
    notificationSettings,
    loading,
    saving,
    error,
    fetchCompany,
    saveCompany,
    fetchCompanySettings,
    saveCompanySettings,
    fetchNotificationSettings,
    saveNotificationSettings,
  }
})
