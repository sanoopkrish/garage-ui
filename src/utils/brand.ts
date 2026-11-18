/**
 * Sprint 28 — read the live brand colour for code that cannot use Tailwind classes
 * (chart libraries, map markers). The values come from the CSS variables the branding
 * store sets on <html>, so they follow the tenant's colour.
 */
export type BrandShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900

const FALLBACK: Record<BrandShade, string> = {
  50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c',
  500: '#f97316', 600: '#ea6c0a', 700: '#c2510a', 800: '#9a3e0e', 900: '#7c330f',
}

export function brandHex(shade: BrandShade = 500): string {
  if (typeof document === 'undefined') return FALLBACK[shade]
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--brand-${shade}`).trim()
  const parts = raw.split(/\s+/).map((n) => Number(n))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return FALLBACK[shade]
  return `#${parts.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')}`
}

/** `rgb(var(--brand-500))` for inline styles — resolves wherever the element is rendered */
export const brandVar = (shade: BrandShade = 500) => `rgb(var(--brand-${shade}))`
