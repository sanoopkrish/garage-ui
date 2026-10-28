import api from '@/api/client'
import type { AIFeatureType } from '@/types/generated/enums/ai'

export interface AIConfiguration {
  enabled: boolean
  features: Record<AIFeatureType, boolean>
  /** Product-level: whether a-soft has configured an AI provider at all */
  available?: boolean
}

export interface AIUsageStats {
  totalRequests: number
  totalTokens: number
  cachedRequests: number
  estimatedCostUsd?: number
  byFeature: { feature: AIFeatureType; requests: number; tokens: number }[]
  byDay: { date: string; requests: number; tokens: number }[]
  from: string
  to: string
}

/** Own company — used to decide whether AI buttons render at all */
export async function getMyAIConfiguration(): Promise<AIConfiguration> {
  const response = await api.get('/company/ai-configuration')
  return response.data?.data ?? response.data
}

// ---- Owner (platform admin) ----

export async function getCompanyAIConfiguration(companyId: string): Promise<AIConfiguration> {
  const response = await api.get(`/company/${companyId}/ai-configuration`)
  return response.data?.data ?? response.data
}

export async function updateCompanyAIConfiguration(
  companyId: string,
  config: Pick<AIConfiguration, 'enabled' | 'features'>,
): Promise<AIConfiguration> {
  const response = await api.patch(`/company/${companyId}/ai-configuration`, config)
  return response.data?.data ?? response.data
}

export async function getCompanyAIUsage(companyId: string, params?: { from?: string; to?: string }): Promise<AIUsageStats> {
  const response = await api.get(`/company/${companyId}/ai-usage`, { params })
  return response.data?.data ?? response.data
}

// ---- Features ----

export interface SuggestedQuoteLine {
  lineType: 'labour' | 'part'
  description: string
  hours?: number
  quantity?: number
  costPrice?: number
}

export async function suggestQuoteLines(jobId: string): Promise<{ lines: SuggestedQuoteLine[]; reasoning: string }> {
  const response = await api.post(`/quotes/suggest/${jobId}`)
  return response.data?.data ?? response.data
}

export async function draftDamageNotes(jobId: string): Promise<{ draft: string; photosUsed: number }> {
  const response = await api.post(`/jobs/${jobId}/checkin/ai-damage-notes`)
  return response.data?.data ?? response.data
}

export async function rewriteDraft(
  text: string,
  mode: 'professional' | 'simple' | 'shorter',
  context?: string,
): Promise<string> {
  const response = await api.post('/ai/drafts/rewrite', { text, mode, context })
  return (response.data?.data ?? response.data).draft
}
