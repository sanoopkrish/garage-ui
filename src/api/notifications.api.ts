import client from '@/api/client'

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: string
  data?: Record<string, any>
}

export async function getNotifications(params?: {
  page?: number
  limit?: number
  unreadOnly?: boolean
  read?: boolean
  type?: string
}): Promise<{ notifications: AppNotification[]; total: number }> {
  const endpoint = params?.unreadOnly === false ? '/notifications/all' : '/notifications'
  const response = await client.get(endpoint, { params })
  // Body shape is { data: rows[], total } — don't unwrap `data` twice
  const raw = Array.isArray(response.data?.data) ? response.data : (response.data?.data ?? response.data)
  const rows: any[] = raw?.data ?? []
  // Backend stores title/priority inside metadata; socket events carry them top-level
  const notifications = rows.map((n) => ({
    ...n,
    title: n.title ?? n.metadata?.title ?? n.type,
    priority: n.priority ?? n.metadata?.priority ?? 'medium',
  }))
  return { notifications, total: raw?.total ?? 0 }
}

export async function markRead(id: string): Promise<void> {
  const response = await client.patch(`/notifications/${id}/read`)
  return response.data?.data ?? response.data
}

export async function markAllRead(): Promise<void> {
  const response = await client.post('/notifications/mark-all-read')
  return response.data?.data ?? response.data
}

export async function deleteNotification(id: string): Promise<void> {
  const response = await client.delete(`/notifications/${id}`)
  return response.data?.data ?? response.data
}
