import api from '@/api/client'
import axios from 'axios'

/** Self-service profile — /user/me endpoints need no admin permissions. */
export interface MyProfile {
  id: string
  firstName: string
  middleName: string
  lastName: string
  email: string
  phoneNumber: string
  gender: string
  maritalStatus: string
  dateOfBirth: string | null
  hireDate: string | null
  address: Record<string, any> | null
  systemRoles: { id: string; name: string }[]
  employeeRoles: { id: string; name: string }[]
  skills: { id: string; name: string }[]
  department: string
  jobTitle: string
  employmentType: string
  profilePicUploaded: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface UpdateMyProfileDto {
  firstName?: string
  middleName?: string
  lastName?: string
  phoneNumber?: string
  gender?: string
  maritalStatus?: string
  dateOfBirth?: string
  address?: Record<string, any>
}

export async function getMyProfile(): Promise<MyProfile> {
  const response = await api.get('/user/me')
  return response.data?.data ?? response.data
}

export async function updateMyProfile(dto: UpdateMyProfileDto): Promise<MyProfile> {
  const response = await api.patch('/user/me', dto)
  return response.data?.data ?? response.data
}

export async function getProfilePhotoUrl(userId: string): Promise<string> {
  const response = await api.get(`/user/profile-pic/${userId}`)
  return response.data?.data ?? response.data
}

/** Presigned upload to the permanent profile-pictures/ folder, then link to the profile. */
export async function uploadProfilePhoto(file: File): Promise<void> {
  const presign = await api.post('/files/presigned-url', {
    fileName: file.name,
    contentType: file.type,
    fileSize: file.size,
    uploadType: 'profile',
  })
  const { presignedUrl, publicUrl, key } = presign.data?.data ?? presign.data
  await axios.put(presignedUrl, file, { headers: { 'Content-Type': file.type }, withCredentials: false })
  await api.post('/user/photo', { s3Key: key, photoUrl: publicUrl })
}

export async function changeMyPassword(newPassword: string, confirmPassword: string): Promise<void> {
  await api.post('/auth/change-password', { newPassword, confirmPassword })
}
