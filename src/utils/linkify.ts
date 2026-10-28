/**
 * Render untrusted text as HTML with URLs turned into clickable links.
 * Escapes ALL HTML first (notification messages can embed user-typed text,
 * e.g. the panic note), then wraps http(s) URLs in anchors.
 */
const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const URL_RE = /(https?:\/\/[^\s<]+)/g

export function linkifyHtml(text: string): string {
  return escapeHtml(text).replace(
    URL_RE,
    (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-brand-600 underline break-all" onclick="event.stopPropagation()">${url}</a>`,
  )
}
