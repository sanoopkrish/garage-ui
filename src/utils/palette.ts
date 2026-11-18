/**
 * Sprint 28 — the same shade generator as the API (garage-api/src/shared/branding/palette.util.ts),
 * used only for the live preview in the Branding settings card. The server's result is what is saved.
 */
export type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
export const SHADES: Shade[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

export const CRUISE_ORANGE: Record<Shade, string> = {
  50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c',
  500: '#f97316', 600: '#ea6c0a', 700: '#c2510a', 800: '#9a3e0e', 900: '#7c330f',
}

export const isHexColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim())

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.trim().slice(1)
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const rgbToHex = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`
const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const linearToSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function rgbToOklch([r8, g8, b8]: [number, number, number]) {
  const r = srgbToLinear(r8 / 255), g = srgbToLinear(g8 / 255), b = srgbToLinear(b8 / 255)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  let H = (Math.atan2(bb, a) * 180) / Math.PI
  if (H < 0) H += 360
  return { L, C: Math.sqrt(a * a + bb * bb), H }
}
function oklchToLinear(L: number, C: number, H: number): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}
function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  let c = Math.max(0, C)
  for (let i = 0; i < 40; i++) {
    if (oklchToLinear(L, c, H).every((v) => v >= -0.0005 && v <= 1.0005)) break
    c *= 0.92
  }
  const lin = oklchToLinear(L, c, H).map((v) => Math.max(0, Math.min(1, v)))
  return [linearToSrgb(lin[0]) * 255, linearToSrgb(lin[1]) * 255, linearToSrgb(lin[2]) * 255]
}
const luminance = ([r, g, b]: [number, number, number]) => 0.2126 * srgbToLinear(r / 255) + 0.7152 * srgbToLinear(g / 255) + 0.0722 * srgbToLinear(b / 255)
export function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a)), lb = luminance(hexToRgb(b))
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

const REF = Object.fromEntries(SHADES.map((s) => [s, rgbToOklch(hexToRgb(CRUISE_ORANGE[s]))])) as Record<Shade, { L: number; C: number; H: number }>

export interface Palette { hex: Record<Shade, string>; rgb: Record<Shade, string>; contrastOn500: 'light' | 'dark'; contrast: { white: number; dark: number } }

export function generatePalette(primaryHex: string): Palette {
  const input = primaryHex.trim().toLowerCase()
  if (!isHexColor(input)) throw new Error(`Not a hex colour: ${primaryHex}`)
  const { L: Li, C: Ci, H } = rgbToOklch(hexToRgb(input))
  const L500 = REF[500].L, C500 = REF[500].C
  const Ltop = Math.min(0.985, Li + (REF[50].L - L500) * ((1 - Li) / (1 - L500)))
  const Lbottom = Math.max(0.1, Math.min(0.45, Li - (L500 - REF[900].L) * (Li / L500)))
  const hex = {} as Record<Shade, string>
  for (const s of SHADES) {
    if (s === 500) { hex[s] = input; continue }
    const ref = REF[s]
    const L = s < 500 ? Li + ((ref.L - L500) / (REF[50].L - L500)) * (Ltop - Li) : Li - ((L500 - ref.L) / (L500 - REF[900].L)) * (Li - Lbottom)
    hex[s] = rgbToHex(oklchToRgb(L, Ci * (ref.C / C500), H))
  }
  const white = contrastRatio(input, '#ffffff'), dark = contrastRatio(input, '#0f172a')
  const rgb = Object.fromEntries(SHADES.map((s) => [s, hexToRgb(hex[s]).join(' ')])) as Record<Shade, string>
  return { hex, rgb, contrastOn500: white >= 2.5 ? 'light' : 'dark', contrast: { white, dark } }
}
