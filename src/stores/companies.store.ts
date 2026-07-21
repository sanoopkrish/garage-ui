import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EnabledModules } from '@/types/generated/constants/module-configuration'
import {
  fetchAllCompanies,
  fetchCompanyById,
  createCompany,
  checkSubdomainAvailability,
  toggleCompanyStatus,
  updateCompanyProfile,
  updateCompanyConfiguration,
  seedMasterData,
  type CompanyListItem,
  type CompanyDetailResponse,
  type CreateCompanyDto,
  type CompaniesFilterParams,
  type UpdateCompanyDto,
  type SeedMasterDataResult,
} from '@/api/companies.api'

export const useCompaniesStore = defineStore('companies', () => {
  const companies = ref<CompanyListItem[]>([])
  const currentCompany = ref<CompanyDetailResponse | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({ total: 0, page: 1, limit: 20 })
  const filters = ref<CompaniesFilterParams>({})

  const companyStats = computed(() => ({
    total: pagination.value.total,
    active: companies.value.filter(c => c.isActive).length,
    inactive: companies.value.filter(c => !c.isActive).length,
  }))

  async function fetchCompanies(params?: CompaniesFilterParams) {
    loading.value = true
    error.value = null
    try {
      const res = await fetchAllCompanies(params)
      companies.value = res.companies
      pagination.value.total = res.total
      if (params?.page) pagination.value.page = params.page
    } finally {
      loading.value = false
    }
  }

  async function fetchCompanyDetails(companyId: string) {
    loading.value = true
    error.value = null
    try {
      currentCompany.value = await fetchCompanyById(companyId)
      return currentCompany.value
    } finally {
      loading.value = false
    }
  }

  async function createNewCompany(payload: CreateCompanyDto): Promise<CompanyDetailResponse> {
    saving.value = true
    try {
      const result = await createCompany(payload)
      await fetchCompanies(filters.value)
      return result
    } finally {
      saving.value = false
    }
  }

  async function checkSubdomain(subdomain: string): Promise<boolean> {
    return checkSubdomainAvailability(subdomain)
  }

  async function toggleStatus(companyId: string, isActive: boolean) {
    await toggleCompanyStatus(companyId, isActive)
    const item = companies.value.find(c => c.id === companyId)
    if (item) item.isActive = isActive
    if (currentCompany.value?.id === companyId) currentCompany.value.isActive = isActive
  }

  async function saveProfile(companyId: string, dto: UpdateCompanyDto) {
    saving.value = true
    try {
      const updated = await updateCompanyProfile(companyId, dto)
      if (currentCompany.value?.id === companyId) {
        Object.assign(currentCompany.value, updated)
      }
    } finally {
      saving.value = false
    }
  }

  async function saveConfiguration(companyId: string, enabledModules: EnabledModules) {
    saving.value = true
    try {
      await updateCompanyConfiguration(companyId, { enabledModules })
      if (currentCompany.value?.id === companyId) {
        currentCompany.value.moduleConfiguration = { enabledModules }
      }
    } finally {
      saving.value = false
    }
  }

  async function seedDefaultMasterData(companyId: string): Promise<SeedMasterDataResult> {
    return seedMasterData(companyId)
  }

  function clearCurrentCompany() {
    currentCompany.value = null
  }

  function clearFilters() {
    filters.value = {}
  }

  return {
    companies,
    currentCompany,
    loading,
    saving,
    error,
    pagination,
    filters,
    companyStats,
    fetchCompanies,
    fetchCompanyDetails,
    createNewCompany,
    checkSubdomain,
    toggleStatus,
    saveProfile,
    saveConfiguration,
    seedDefaultMasterData,
    clearCurrentCompany,
    clearFilters,
  }
})
