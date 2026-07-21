import api from '@/api/client'

export interface DashboardToday {
  bookedToday: number
  completedToday: number
  collectedToday: number
  paymentsTakenToday: number
  invoicedToday: number
  vehiclesInWorkshop: { status: string; count: number }[]
  openReworks: number
  partsOverdue: number
  liveField: {
    technicianId: string
    name: string
    jobId: string
    jobNumber: string
    registration: string | null
    lastSeenAt: string | null
    vanRegistration: string | null
  }[]
}

export interface DashboardKpis {
  range: { from: string; to: string }
  utilisation: {
    technicianId: string
    name: string
    contractedWeeklyHours: number
    billableHours: number
    reworkHours: number
    utilisationPercent: number
  }[]
  quotePipeline: {
    byStatus: { status: string; count: number; value: number }[]
    conversionPercent: number | null
  }
  rework: { created: number; jobsCompleted: number; ratePercent: number | null }
  b2bProfitability: { customerId: string; name: string; revenue: number; partsCost: number; margin: number }[]
  fuel: { technicianId: string; name: string; miles: number; co2Kg: number; estFuelCost: number }[]
}

export interface DashboardTrends {
  revenueByWeek: { week: string; revenue: number }[]
  jobsByWeek: { week: string; created: number; completed: number }[]
  partsSpendBySupplier: { supplier: string; spend: number }[]
}

const unwrap = (r: any) => r.data?.data ?? r.data

export async function getDashboardToday(): Promise<DashboardToday> {
  return unwrap(await api.get('/dashboard/garage/today'))
}

export async function getDashboardKpis(from?: string, to?: string): Promise<DashboardKpis> {
  return unwrap(await api.get('/dashboard/garage/kpis', { params: { from, to } }))
}

export async function getDashboardTrends(months = 6): Promise<DashboardTrends> {
  return unwrap(await api.get('/dashboard/garage/trends', { params: { months } }))
}

export async function createRework(jobId: string, complaintDescription: string): Promise<any> {
  const response = await api.post(`/jobs/${jobId}/rework`, { complaintDescription })
  return response.data?.data ?? response.data
}
