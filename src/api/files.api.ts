import api from '@/api/client'
import axios from 'axios'

/**
 * Attachments via the presigned two-stage flow (cms pattern):
 * temp-presigned-url → direct S3 PUT (no auth headers) → associate by s3Key.
 */

export interface Attachment {
  id: string
  fileName: string
  s3Key: string
  contentType: string
  fileSize: number
  category: string
  entityType: string
  entityId: string
  createdAt: string
}

export async function uploadTemporary(file: File): Promise<string> {
  const response = await api.post('/files/temp-presigned-url', {
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type,
  })
  const { presignedUrl, key } = response.data?.data ?? response.data
  // Direct S3 PUT — plain axios, no auth headers, no credentials
  await axios.put(presignedUrl, file, { headers: { 'Content-Type': file.type }, withCredentials: false })
  return key
}

export async function attachToEntity(
  s3Key: string,
  entityType: string,
  entityId: string,
  category: string,
): Promise<Attachment> {
  const response = await api.post('/attachments/from-temporary', { s3Key, entityType, entityId, category })
  return response.data?.data ?? response.data
}

export async function listAttachments(entityType: string, entityId: string, category?: string): Promise<Attachment[]> {
  const response = await api.get('/attachments', { params: { entityType, entityId, category } })
  const data = response.data?.data ?? response.data
  return Array.isArray(data) ? data : (data.items ?? [])
}

export async function deleteAttachment(id: string): Promise<void> {
  await api.delete(`/attachments/${id}`)
}

export async function getViewUrl(s3Key: string, contentType?: string): Promise<string> {
  const response = await api.get('/files/view-url', { params: { key: s3Key, contentType } })
  const data = response.data?.data ?? response.data
  return data.viewUrl ?? data.downloadUrl ?? data.url
}
