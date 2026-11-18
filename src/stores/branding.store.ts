import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api/client'
import { getBranding, type Branding } from '@/api/company.api'

/**
 * Sprint 28 — the tenant's logo, colour and app name, applied as CSS variables on <html>
 * so every `brand-*` class follows it. Loaded before the app mounts (login page included),
 * refreshed after a save in Settings. Falls back to the Cruise look on any error.
 */
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const
const CRUISE_RGB: Record<string, string> = {
  50: '255 247 237', 100: '255 237 213', 200: '254 215 170', 300: '253 186 116', 400: '251 146 60',
  500: '249 115 22', 600: '234 108 10', 700: '194 81 10', 800: '154 62 14', 900: '124 51 15',
}
export const POWERED_BY = 'A-soft - Tconsult Technologies'

export const useBrandingStore = defineStore('branding', () => {
  const branding = ref<Branding | null>(null)
  const loaded = ref(false)
  let request: Promise<Branding | null> | null = null

  const branded = computed(() => !!branding.value?.branded)
  const appName = computed(() => (branding.value?.branded && branding.value.appName) || 'Cruise')
  const companyName = computed(() => branding.value?.name ?? '')
  const logos = computed(() => branding.value?.logos ?? { header: null, login: null, report: null, mark: null, dark: null, favicon: null, icon192: null, icon512: null })
  /** Logo for dark backgrounds (sidebar, field header), falling back through the others */
  const darkLogo = computed(() => (branded.value ? logos.value.dark || logos.value.header || logos.value.login : null))
  const lightLogo = computed(() => (branded.value ? logos.value.login || logos.value.header : null))
  const mark = computed(() => (branded.value ? logos.value.mark || logos.value.dark || logos.value.header : null))
  const primaryColor = computed(() => branding.value?.primaryColor ?? '#f97316')

  function applyToDocument(b: Branding | null) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const rgb = b?.branded ? b.paletteRgb : CRUISE_RGB
    for (const shade of SHADES) root.style.setProperty(`--brand-${shade}`, rgb[String(shade)] ?? CRUISE_RGB[String(shade)])
    root.style.setProperty('--brand-contrast', b?.branded && b.contrastOn500 === 'dark' ? '15 23 42' : '255 255 255')

    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (icon) {
      const href = b?.branded && b.logos.favicon ? b.logos.favicon : '/favicon.svg'
      if (icon.href !== href) { icon.href = href; icon.type = href.endsWith('.svg') ? 'image/svg+xml' : 'image/png' }
    }
    let theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!theme) { theme = document.createElement('meta'); theme.name = 'theme-color'; document.head.appendChild(theme) }
    theme.content = b?.branded ? b.primaryColor : '#f97316'

    // Installed field app: the per-tenant manifest carries the garage's name, colour and icons
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (manifest && b?.branded) manifest.href = `${(api.defaults.baseURL ?? '/api/v1').replace(/\/$/, '')}/company/branding/manifest.webmanifest`
  }

  function apply(b: Branding | null) {
    branding.value = b
    applyToDocument(b)
    loaded.value = true
    // The first route's title was set before branding arrived — fix its suffix now
    if (typeof document !== 'undefined' && / \| /.test(document.title)) {
      document.title = `${document.title.split(' | ')[0]} | ${appName.value}`
    }
  }

  /** Loaded once and shared; `force` after a save in Settings → Business */
  async function load(force = false): Promise<Branding | null> {
    if (loaded.value && !force) return branding.value
    if (!request || force) {
      request = getBranding()
        .then((b) => { apply(b); return b })
        .catch(() => { apply(null); return null })
        .finally(() => { request = null })
    }
    return request
  }

  return { branding, loaded, branded, appName, companyName, logos, darkLogo, lightLogo, mark, primaryColor, poweredBy: POWERED_BY, load, apply }
})
