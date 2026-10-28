import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getHelpForRoute, getHelpIndex, getHelpPage, type HelpPage, type HelpPageMeta, type HelpSection } from '@/api/help.api'

/**
 * Help centre state: the role-filtered index, a page cache, and the contextual
 * drawer opened from the "?" in the headers.
 */
export const useHelpStore = defineStore('help', () => {
  const sections = ref<HelpSection[]>([])
  const pages = ref<HelpPageMeta[]>([])
  const pageCache = ref<Record<string, HelpPage>>({})
  const indexLoaded = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Contextual drawer
  const drawerOpen = ref(false)
  const drawerSlug = ref<string | null>(null)
  const drawerLoading = ref(false)

  const pagesBySection = computed(() =>
    sections.value
      .map((s) => ({ section: s, pages: pages.value.filter((p) => p.section === s.key) }))
      .filter((g) => g.pages.length),
  )

  const drawerPage = computed(() => (drawerSlug.value ? pageCache.value[drawerSlug.value] ?? null : null))

  async function fetchIndex(force = false): Promise<void> {
    if (indexLoaded.value && !force) return
    isLoading.value = true
    error.value = null
    try {
      const index = await getHelpIndex()
      sections.value = index.sections
      pages.value = index.pages
      indexLoaded.value = true
    } catch (err: any) {
      error.value = err?.response?.data?.message || 'Could not load the help centre'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchPage(slug: string): Promise<HelpPage | null> {
    const cached = pageCache.value[slug]
    if (cached) return cached
    try {
      const page = await getHelpPage(slug)
      pageCache.value = { ...pageCache.value, [slug]: page }
      return page
    } catch (err: any) {
      if (err?.response?.status === 404) return null
      throw err
    }
  }

  /** Open the drawer on the page for a UI route; falls back to the index when there is none */
  async function openForRoute(routeName: string | null | undefined): Promise<void> {
    drawerOpen.value = true
    drawerLoading.value = true
    drawerSlug.value = null
    try {
      await fetchIndex()
      const hit = routeName ? await getHelpForRoute(String(routeName)) : null
      if (hit) {
        await fetchPage(hit.slug)
        drawerSlug.value = hit.slug
      }
    } catch {
      drawerSlug.value = null
    } finally {
      drawerLoading.value = false
    }
  }

  /** Show another page inside the open drawer (help: links, index fallback) */
  async function showInDrawer(slug: string): Promise<void> {
    drawerLoading.value = true
    try {
      const page = await fetchPage(slug)
      drawerSlug.value = page ? slug : null
    } finally {
      drawerLoading.value = false
    }
  }

  function closeDrawer(): void {
    drawerOpen.value = false
  }

  return {
    sections, pages, pageCache, indexLoaded, isLoading, error,
    drawerOpen, drawerSlug, drawerLoading, drawerPage, pagesBySection,
    fetchIndex, fetchPage, openForRoute, showInDrawer, closeDrawer,
  }
})
