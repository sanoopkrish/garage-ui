import api from '@/api/client'

export interface Department {
  id: number
  name: string
  description?: string
  status: 'active' | 'inactive'
  annualBudget?: number
  companyId: string
}

export interface Skill {
  id: number
  name: string
  description?: string
  status: 'active' | 'inactive'
}

export interface CreateSkillDto {
  name: string
  description?: string
  status: 'active' | 'inactive'
}

export interface EmployeeRole {
  id: number
  name: string
  description?: string
  status: 'active' | 'inactive'
  billingRate?: number
  companyId: string
}

export interface EmploymentType {
  id: number
  name: string
  description?: string
  status: 'active' | 'inactive'
  companyId: string
}

export interface JobTitle {
  id: number
  name: string
  description?: string
  status: 'active' | 'inactive'
  companyId: string
}

export interface CreateMasterDto {
  name: string
  description?: string
  status?: 'active' | 'inactive'
}

export interface CreateDepartmentDto extends CreateMasterDto {
  annualBudget?: number
}

export interface CreateEmployeeRoleDto extends CreateMasterDto {
  billingRate?: number
}

// Departments
export const getDepartments = () =>
  api.get<Department[]>('/master/department').then(r => r.data)
export const createDepartment = (dto: CreateDepartmentDto) =>
  api.post<Department>('/master/department', dto).then(r => r.data)
export const updateDepartment = (id: number, dto: Partial<CreateDepartmentDto>) =>
  api.patch<Department>(`/master/department/${id}`, dto).then(r => r.data)
export const deleteDepartment = (id: number) =>
  api.delete(`/master/department/${id}`)

// Employee Roles
export const getEmployeeRoles = () =>
  api.get<EmployeeRole[]>('/master/employee-role').then(r => r.data)
export const createEmployeeRole = (dto: CreateEmployeeRoleDto) =>
  api.post<EmployeeRole>('/master/employee-role', dto).then(r => r.data)
export const updateEmployeeRole = (id: number, dto: Partial<CreateEmployeeRoleDto>) =>
  api.patch<EmployeeRole>(`/master/employee-role/${id}`, dto).then(r => r.data)
export const deleteEmployeeRole = (id: number) =>
  api.delete(`/master/employee-role/${id}`)

// Employment Types
export const getEmploymentTypes = () =>
  api.get<EmploymentType[]>('/master/employment-type').then(r => r.data)
export const createEmploymentType = (dto: CreateMasterDto) =>
  api.post<EmploymentType>('/master/employment-type', dto).then(r => r.data)
export const updateEmploymentType = (id: number, dto: Partial<CreateMasterDto>) =>
  api.patch<EmploymentType>(`/master/employment-type/${id}`, dto).then(r => r.data)
export const deleteEmploymentType = (id: number) =>
  api.delete(`/master/employment-type/${id}`)

// Job Titles
export const getJobTitles = () =>
  api.get<JobTitle[]>('/master/job-title').then(r => r.data)
export const createJobTitle = (dto: CreateMasterDto) =>
  api.post<JobTitle>('/master/job-title', dto).then(r => r.data)
export const updateJobTitle = (id: number, dto: Partial<CreateMasterDto>) =>
  api.patch<JobTitle>(`/master/job-title/${id}`, dto).then(r => r.data)
export const deleteJobTitle = (id: number) =>
  api.delete(`/master/job-title/${id}`)

export const getSkills = () =>
  api.get<Skill[]>('/master/skill').then(r => r.data)
export const createSkill = (dto: CreateSkillDto) =>
  api.post<Skill>('/master/skill', dto).then(r => r.data)
export const updateSkill = (id: number, dto: Partial<CreateSkillDto>) =>
  api.patch<Skill>(`/master/skill/${id}`, dto).then(r => r.data)
export const deleteSkill = (id: number) =>
  api.delete(`/master/skill/${id}`)
