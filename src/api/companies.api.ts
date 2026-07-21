import apiClient from './client'
import type { EnabledModules } from '@/types/generated/constants/module-configuration'

export interface CompanyListItem {
  id: string
  name: string
  subdomain: string
  isActive: boolean
  userCount?: number
  createdAt: string
}

export interface CreateAdminUserDto {
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED'
  password?: string
}

export interface CreateCompanyDto {
  name: string
  subdomain: string
  description?: string
  website?: string
  companyAddress?: string
  companyEmail?: string
  companyPhone?: string
  moduleConfiguration?: { enabledModules: EnabledModules }
  adminUser: CreateAdminUserDto
  seedMasterData?: boolean
}

export interface AdminCredentials {
  email: string
  password: string
  mustChangePassword: boolean
  loginUrl: string
}

export interface CompanyDetailResponse {
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
  moduleConfiguration?: { enabledModules?: EnabledModules }
  isActive: boolean
  userCount?: number
  createdAt: string
  updatedAt: string
  adminCredentials?: AdminCredentials
}

export interface UpdateCompanyDto {
  name?: string
  description?: string
  website?: string
  companyAddress?: string
  companyEmail?: string
  companyPhone?: string
}

export interface SeedMasterDataResult {
  departments: { created: number; skipped: number }
  jobTitles: { created: number; skipped: number }
  employmentTypes: { created: number; skipped: number }
  employeeRoles: { created: number; skipped: number }
}

export interface CompaniesFilterParams {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}

export interface CompaniesResponse {
  companies: CompanyListItem[]
  total: number
  page?: number
  limit?: number
}

export const fetchAllCompanies = async (params?: CompaniesFilterParams): Promise<CompaniesResponse> => {
  const response = await apiClient.get('company/', { params })
  const data = response.data?.data ?? response.data
  return Array.isArray(data) ? { companies: data, total: data.length } : data
}

export const fetchCompanyById = async (companyId: string): Promise<CompanyDetailResponse> => {
  const response = await apiClient.get(`company/${companyId}`)
  return response.data?.data ?? response.data
}

export const createCompany = async (payload: CreateCompanyDto): Promise<CompanyDetailResponse> => {
  const response = await apiClient.post('company/', payload)
  return response.data?.data ?? response.data
}

export const checkSubdomainAvailability = async (subdomain: string): Promise<boolean> => {
  const response = await apiClient.get(`company/check-subdomain/${subdomain}`)
  const data = response.data?.data ?? response.data
  return data.available
}

export const toggleCompanyStatus = async (companyId: string, isActive: boolean): Promise<void> => {
  await apiClient.patch(`company/${companyId}/status`, { isActive })
}

export const updateCompanyProfile = async (companyId: string, dto: UpdateCompanyDto): Promise<CompanyDetailResponse> => {
  const response = await apiClient.patch(`company/${companyId}/profile`, dto)
  return response.data?.data ?? response.data
}

export const updateCompanyConfiguration = async (
  companyId: string,
  configuration: { enabledModules: EnabledModules },
): Promise<void> => {
  await apiClient.patch(`company/${companyId}/configuration`, configuration)
}

export const seedMasterData = async (companyId: string): Promise<SeedMasterDataResult> => {
  const response = await apiClient.post(`company/${companyId}/seed-master-data`)
  return response.data?.data ?? response.data
}
