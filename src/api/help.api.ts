import api from '@/api/client'

/**
 * In-app help centre (Sprint 25). Mirrors garage-api src/help.
 * Everything is behind the session token; screenshots come back as blobs
 * and are shown through object URLs so no help URL works without a login.
 */

export interface HelpSection {
  key: string
  title: string
  description?: string
}

export interface HelpPageMeta {
  slug: string
  title: string
  section: string
  order: number
  routes: string[]
  permissionKey: string | null
  feature: 'purchasing' | 'bills' | 'stock' | null
  app: 'office' | 'field'
  excerpt: string
  headings: string[]
  updatedAt: string
}

export interface HelpPage extends HelpPageMeta {
  markdown: string
}

export interface HelpIndex {
  sections: HelpSection[]
  pages: HelpPageMeta[]
}

export async function getHelpIndex(): Promise<HelpIndex> {
  const r = await api.get<HelpIndex>('/help/index')
  return r.data
}

export async function getHelpPage(slug: string): Promise<HelpPage> {
  const r = await api.get<HelpPage>(`/help/pages/${encodeURIComponent(slug)}`)
  return r.data
}

/** The page documenting a UI route, or null when there is none (404) */
export async function getHelpForRoute(routeName: string): Promise<{ slug: string; title: string } | null> {
  try {
    const r = await api.get<{ slug: string; title: string }>(`/help/for-route/${encodeURIComponent(routeName)}`)
    return r.data
  } catch (err: any) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

const assetUrls = new Map<string, Promise<string>>()

/** Object URL for a help screenshot, fetched once per session with the auth header */
export function getHelpAssetUrl(file: string): Promise<string> {
  let pending = assetUrls.get(file)
  if (!pending) {
    pending = api
      .get<Blob>(`/help/assets/${encodeURIComponent(file)}`, { responseType: 'blob' })
      .then((r) => URL.createObjectURL(r.data))
      .catch((err) => {
        assetUrls.delete(file)
        throw err
      })
    assetUrls.set(file, pending)
  }
  return pending
}
