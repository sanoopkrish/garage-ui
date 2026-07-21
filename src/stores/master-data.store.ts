import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/api/master-data.api'
import type {
  Department, EmployeeRole, EmploymentType, JobTitle,
  CreateDepartmentDto, CreateEmployeeRoleDto, CreateMasterDto,
  Skill, CreateSkillDto,
} from '@/api/master-data.api'

export const useMasterDataStore = defineStore('masterData', () => {
  const departments = ref<Department[]>([])
  const employeeRoles = ref<EmployeeRole[]>([])
  const skills = ref<Skill[]>([])
  const employmentTypes = ref<EmploymentType[]>([])
  const jobTitles = ref<JobTitle[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Departments
  async function fetchDepartments() {
    isLoading.value = true
    error.value = null
    try {
      departments.value = await api.getDepartments()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch departments'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createDepartment(dto: CreateDepartmentDto) {
    const item = await api.createDepartment(dto)
    departments.value.push(item)
    return item
  }

  async function updateDepartment(id: number, dto: Partial<CreateDepartmentDto>) {
    const updated = await api.updateDepartment(id, dto)
    const idx = departments.value.findIndex(d => d.id === id)
    if (idx !== -1) departments.value[idx] = updated
    return updated
  }

  async function deleteDepartment(id: number) {
    await api.deleteDepartment(id)
    departments.value = departments.value.filter(d => d.id !== id)
  }

  // Employee Roles
  async function fetchEmployeeRoles() {
    isLoading.value = true
    error.value = null
    try {
      employeeRoles.value = await api.getEmployeeRoles()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch employee roles'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createEmployeeRole(dto: CreateEmployeeRoleDto) {
    const item = await api.createEmployeeRole(dto)
    employeeRoles.value.push(item)
    return item
  }

  async function updateEmployeeRole(id: number, dto: Partial<CreateEmployeeRoleDto>) {
    const updated = await api.updateEmployeeRole(id, dto)
    const idx = employeeRoles.value.findIndex(r => r.id === id)
    if (idx !== -1) employeeRoles.value[idx] = updated
    return updated
  }

  async function deleteEmployeeRole(id: number) {
    await api.deleteEmployeeRole(id)
    employeeRoles.value = employeeRoles.value.filter(r => r.id !== id)
  }

  async function fetchSkills() {
    isLoading.value = true
    error.value = null
    try {
      skills.value = await api.getSkills()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch skills'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createSkill(dto: CreateSkillDto) {
    const item = await api.createSkill(dto)
    skills.value.push(item)
    return item
  }

  async function updateSkill(id: number, dto: Partial<CreateSkillDto>) {
    const updated = await api.updateSkill(id, dto)
    const idx = skills.value.findIndex(r => r.id === id)
    if (idx !== -1) skills.value[idx] = updated
    return updated
  }

  async function deleteSkill(id: number) {
    await api.deleteSkill(id)
    skills.value = skills.value.filter(r => r.id !== id)
  }

  // Employment Types
  async function fetchEmploymentTypes() {
    isLoading.value = true
    error.value = null
    try {
      employmentTypes.value = await api.getEmploymentTypes()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch employment types'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createEmploymentType(dto: CreateMasterDto) {
    const item = await api.createEmploymentType(dto)
    employmentTypes.value.push(item)
    return item
  }

  async function updateEmploymentType(id: number, dto: Partial<CreateMasterDto>) {
    const updated = await api.updateEmploymentType(id, dto)
    const idx = employmentTypes.value.findIndex(t => t.id === id)
    if (idx !== -1) employmentTypes.value[idx] = updated
    return updated
  }

  async function deleteEmploymentType(id: number) {
    await api.deleteEmploymentType(id)
    employmentTypes.value = employmentTypes.value.filter(t => t.id !== id)
  }

  // Job Titles
  async function fetchJobTitles() {
    isLoading.value = true
    error.value = null
    try {
      jobTitles.value = await api.getJobTitles()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch job titles'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createJobTitle(dto: CreateMasterDto) {
    const item = await api.createJobTitle(dto)
    jobTitles.value.push(item)
    return item
  }

  async function updateJobTitle(id: number, dto: Partial<CreateMasterDto>) {
    const updated = await api.updateJobTitle(id, dto)
    const idx = jobTitles.value.findIndex(t => t.id === id)
    if (idx !== -1) jobTitles.value[idx] = updated
    return updated
  }

  async function deleteJobTitle(id: number) {
    await api.deleteJobTitle(id)
    jobTitles.value = jobTitles.value.filter(t => t.id !== id)
  }

  return {
    departments, employeeRoles, skills, employmentTypes, jobTitles,
    fetchSkills, createSkill, updateSkill, deleteSkill,
    isLoading, error,
    fetchDepartments, createDepartment, updateDepartment, deleteDepartment,
    fetchEmployeeRoles, createEmployeeRole, updateEmployeeRole, deleteEmployeeRole,
    fetchEmploymentTypes, createEmploymentType, updateEmploymentType, deleteEmploymentType,
    fetchJobTitles, createJobTitle, updateJobTitle, deleteJobTitle,
  }
})
