import api from '@/api/client'

export async function getPushPublicKey(): Promise<string | null> {
  const response = await api.get('/notifications/push/public-key')
  return (response.data?.data ?? response.data)?.publicKey ?? null
}

export async function subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
  await api.post('/notifications/push/subscribe', {
    subscription,
    userAgent: navigator.userAgent,
  })
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await api.delete('/notifications/push/subscribe', { data: { endpoint } })
}
