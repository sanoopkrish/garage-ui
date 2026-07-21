import api from '@/api/client'

// Per-company email provider configuration (owner portal passes companyId;
// omitted → caller's own company). Secrets round-trip as '••••••••' — send the
// placeholder back unchanged to keep the stored secret.
export interface NotificationConfig {
  emailProvider: 'smtp' | 'sendgrid' | 'microsoft365' | null
  fromName: string
  smtp: { host: string; port: number; secure: boolean; user: string; pass: string; from: string } | null
  microsoft365: { fromEmail: string } | null
  sendgrid: { apiKey: string; from: string } | null
  smsProvider: 'twilio' | null
  twilio: { accountSid: string; authToken: string; fromNumber: string } | null
}

export async function getNotificationConfig(companyId?: string): Promise<NotificationConfig> {
  const response = await api.get('/company/notification-config', { params: { companyId } })
  return response.data?.data ?? response.data
}

export async function updateNotificationConfig(
  data: Partial<NotificationConfig>,
  companyId?: string,
): Promise<NotificationConfig> {
  const response = await api.patch('/company/notification-config', data, { params: { companyId } })
  return response.data?.data ?? response.data
}

export async function testEmailConnection(
  email: string,
  companyId?: string,
): Promise<{ success: boolean; message: string }> {
  const response = await api.post('/company/notification-config/test-email', { email }, { params: { companyId } })
  return response.data?.data ?? response.data
}
