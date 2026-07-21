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
