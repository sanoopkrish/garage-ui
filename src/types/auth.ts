import type { EnabledModules } from '@/types/generated/constants/module-configuration'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  profilePhoto?: string
  companyId: string
  company?: Company
}

export interface Company {
  id: string
  name: string
  subdomain: string
  /** The owner's module switches for this company (null = never configured, nothing switched off) */
  moduleConfiguration?: { enabledModules?: EnabledModules } | null
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  session_id?: string
  user: AuthUser
  mustChangePassword?: boolean
}
