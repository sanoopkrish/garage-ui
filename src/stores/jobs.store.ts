import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  getJobs,
  getJob as getJobApi,
  createJob as createJobApi,
  updateJob as updateJobApi,
  updateJobStatus as updateJobStatusApi,
  createJobCheckin as createJobCheckinApi,
  updateJobCheckin as updateJobCheckinApi,
  deleteJob as deleteJobApi,
} from '@/api/jobs.api'
import type { Job, CreateJobDto, UpdateJobDto, CreateJobCheckinDto, UpdateJobCheckinDto } from '@/api/jobs.api'
import type { JobStatus } from '@/types/generated/enums/job'

export const useJobsStore = defineStore('jobs', () => {
  const jobs = ref<Job[]>([])
  const total = ref<number>(0)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

  async function fetchJobs(params?: {
    search?: string
    status?: JobStatus
    customerId?: string
    vehicleId?: string
    isRework?: boolean
    page?: number
    pageSize?: number
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await getJobs({
        ...params,
        page: params?.page ?? currentPage.value,
        pageSize: params?.pageSize ?? pageSize.value,
      })
      jobs.value = response.items
      total.value = response.total
      if (params?.page !== undefined) {
        currentPage.value = params.page
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch jobs'
    } finally {
      loading.value = false
    }
  }

  async function getJob(id: string): Promise<Job> {
    error.value = null
    try {
      return await getJobApi(id)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch job'
      throw err
    }
  }

  async function createJob(dto: CreateJobDto): Promise<Job> {
    loading.value = true
    error.value = null
    try {
      const created = await createJobApi(dto)
      await fetchJobs({ page: currentPage.value, pageSize: pageSize.value })
      return created
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to create job'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateJob(id: string, dto: UpdateJobDto): Promise<Job> {
    error.value = null
    try {
      return await updateJobApi(id, dto)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to update job'
      throw err
    }
  }

  async function updateStatus(id: string, status: JobStatus, note?: string): Promise<Job> {
    error.value = null
    try {
      return await updateJobStatusApi(id, status, note)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to update job status'
      throw err
    }
  }

  async function createCheckin(id: string, dto: CreateJobCheckinDto): Promise<Job> {
    error.value = null
    try {
      return await createJobCheckinApi(id, dto)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to check in vehicle'
      throw err
    }
  }

  async function updateCheckin(id: string, dto: UpdateJobCheckinDto): Promise<Job> {
    error.value = null
    try {
      return await updateJobCheckinApi(id, dto)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to update check-in'
      throw err
    }
  }

  async function deleteJob(id: string) {
    loading.value = true
    error.value = null
    try {
      await deleteJobApi(id)
      jobs.value = jobs.value.filter((j) => j.id !== id)
      total.value = Math.max(0, total.value - 1)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to delete job'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    jobs,
    total,
    loading,
    error,
    currentPage,
    pageSize,
    totalPages,
    fetchJobs,
    getJob,
    createJob,
    updateJob,
    updateStatus,
    createCheckin,
    updateCheckin,
    deleteJob,
  }
})
