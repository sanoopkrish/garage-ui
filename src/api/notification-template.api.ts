import apiClient from './client'

export interface NotificationTemplateDto {
  id: string
  code: string
  name: string
  category: string
  module?: string
  emailSubject?: string
  emailBody?: string
  smsBody?: string
  inAppTitle?: string
  inAppBody?: string
  availableVariables: string[]
  isActive: boolean
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateNotificationTemplateDto {
  code: string
  name: string
  category: string
  module?: string
  emailSubject?: string
  emailBody?: string
  smsBody?: string
  inAppTitle?: string
  inAppBody?: string
  availableVariables?: string[]
  isActive?: boolean
}

export interface UpdateNotificationTemplateDto {
  name?: string
  emailSubject?: string
  emailBody?: string
  smsBody?: string
  inAppTitle?: string
  inAppBody?: string
  availableVariables?: string[]
  isActive?: boolean
}

export const fetchNotificationTemplates = async (
  category?: string,
): Promise<NotificationTemplateDto[]> => {
  const params = category ? { category } : {}
  const response = await apiClient.get<NotificationTemplateDto[]>('/notification-templates', { params })
  return response.data
}

export const fetchNotificationTemplate = async (id: string): Promise<NotificationTemplateDto> => {
  const response = await apiClient.get<NotificationTemplateDto>(`/notification-templates/${id}`)
  return response.data
}

export const createNotificationTemplate = async (
  data: CreateNotificationTemplateDto,
): Promise<NotificationTemplateDto> => {
  const response = await apiClient.post<NotificationTemplateDto>('/notification-templates', data)
  return response.data
}

export const updateNotificationTemplate = async (
  id: string,
  data: UpdateNotificationTemplateDto,
): Promise<NotificationTemplateDto> => {
  const response = await apiClient.put<NotificationTemplateDto>(`/notification-templates/${id}`, data)
  return response.data
}

export const deleteNotificationTemplate = async (id: string): Promise<void> => {
  await apiClient.delete(`/notification-templates/${id}`)
}

export const seedDefaultTemplates = async (): Promise<{
  message: string
  templates: NotificationTemplateDto[]
}> => {
  const response = await apiClient.post('/notification-templates/seed-defaults')
  return response.data
}
