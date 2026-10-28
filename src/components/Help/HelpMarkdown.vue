<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { getHelpAssetUrl } from '@/api/help.api'

/**
 * Renders a help page's Markdown.
 * - Screenshots are fetched through the authenticated asset endpoint and shown as object URLs.
 * - `help:slug#anchor` links become in-app navigation (emitted, so the drawer and the
 *   Help Centre can each decide how to open them).
 * - Headings get ids so Settings-style pages can be deep-linked per tab.
 */
const props = defineProps<{ markdown: string }>()
const emit = defineEmits<{ navigate: [slug: string, anchor: string | null]; rendered: [] }>()

const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const md = new MarkdownIt({ html: false, linkify: true })
const esc = md.utils.escapeHtml

md.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
  const inline = tokens[idx + 1]
  if (inline?.type === 'inline') tokens[idx].attrSet('id', slugify(inline.content))
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.image = (tokens, idx) => {
  const token = tokens[idx]
  const src = String(token.attrGet('src') ?? '')
  const alt = token.content
  if (/^https?:\/\//.test(src)) return `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`
  return `<figure class="help-figure"><img data-help-asset="${esc(src)}" src="${BLANK}" alt="${esc(alt)}" loading="lazy"><figcaption>${esc(alt)}</figcaption></figure>`
}

const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const href = String(token.attrGet('href') ?? '')
  if (href.startsWith('help:')) {
    const [slug, anchor] = href.slice(5).split('#')
    token.attrSet('href', `/help/${slug}${anchor ? `#${anchor}` : ''}`)
    token.attrSet('data-help-link', slug)
    if (anchor) token.attrSet('data-help-anchor', anchor)
  } else if (/^https?:\/\//.test(href)) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

const html = ref('')
const root = ref<HTMLElement | null>(null)

function render(): void {
  html.value = DOMPurify.sanitize(md.render(props.markdown ?? ''), {
    ADD_ATTR: ['target', 'rel', 'loading', 'data-help-asset', 'data-help-link', 'data-help-anchor'],
  })
  nextTick(async () => {
    await loadImages()
    emit('rendered')
  })
}

async function loadImages(): Promise<void> {
  const images = root.value?.querySelectorAll<HTMLImageElement>('img[data-help-asset]') ?? []
  await Promise.all(
    Array.from(images).map(async (img) => {
      const file = img.dataset.helpAsset
      if (!file) return
      try {
        img.src = await getHelpAssetUrl(file)
        img.classList.add('is-loaded')
      } catch {
        img.closest('figure')?.classList.add('is-missing')
      }
    }),
  )
}

function onClick(event: MouseEvent): void {
  const anchor = (event.target as HTMLElement).closest('a[data-help-link]') as HTMLAnchorElement | null
  if (!anchor) return
  event.preventDefault()
  emit('navigate', anchor.dataset.helpLink as string, anchor.dataset.helpAnchor ?? null)
}

watch(() => props.markdown, render, { immediate: true })
</script>

<template>
  <div ref="root" class="help-prose" @click="onClick" v-html="html" />
</template>

<style>
/* Hand-written prose styles (no typography plugin in this project). Global so v-html content is covered. */
.help-prose { font-size: 0.9375rem; line-height: 1.65; color: #334155; }
.dark .help-prose { color: #cbd5e1; }
.help-prose > :first-child { margin-top: 0; }
.help-prose h1 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 0.75rem; }
.help-prose h2 { font-size: 1.125rem; font-weight: 600; color: #0f172a; margin: 1.75rem 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #e2e8f0; scroll-margin-top: 1rem; }
.help-prose h3 { font-size: 1rem; font-weight: 600; color: #ea580c; margin: 1.25rem 0 0.375rem; scroll-margin-top: 1rem; }
.dark .help-prose h1, .dark .help-prose h2 { color: #f1f5f9; border-color: #334155; }
.dark .help-prose h3 { color: #fb923c; }
.help-prose p { margin: 0.5rem 0 0.875rem; }
.help-prose ul, .help-prose ol { margin: 0.5rem 0 0.875rem; padding-left: 1.375rem; }
.help-prose ul { list-style: disc; }
.help-prose ol { list-style: decimal; }
.help-prose li { margin: 0.25rem 0; }
.help-prose li > p { margin: 0.25rem 0; }
.help-prose strong { font-weight: 600; color: #0f172a; }
.dark .help-prose strong { color: #f8fafc; }
.help-prose a { color: #ea580c; text-decoration: none; font-weight: 500; }
.help-prose a:hover { text-decoration: underline; }
.help-prose code { font-size: 0.85em; background: #f1f5f9; padding: 0.1em 0.35em; border-radius: 0.25rem; color: #0f172a; }
.dark .help-prose code { background: rgba(255,255,255,0.08); color: #f1f5f9; }
.help-prose pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.75rem 1rem; overflow-x: auto; font-size: 0.8125rem; line-height: 1.5; margin: 0.75rem 0 1rem; }
.help-prose pre code { background: none; padding: 0; font-size: inherit; }
.dark .help-prose pre { background: rgba(255,255,255,0.04); border-color: #334155; }
.help-prose blockquote { border-left: 3px solid #fb923c; padding: 0.25rem 0 0.25rem 0.875rem; margin: 0.75rem 0; color: #475569; }
.dark .help-prose blockquote { color: #94a3b8; }
.help-prose hr { border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
.dark .help-prose hr { border-color: #334155; }
.help-prose table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin: 0.75rem 0 1rem; display: block; overflow-x: auto; }
.help-prose th, .help-prose td { border: 1px solid #e2e8f0; padding: 0.4rem 0.625rem; text-align: left; vertical-align: top; }
.help-prose th { background: #f8fafc; font-weight: 600; color: #0f172a; }
.dark .help-prose th, .dark .help-prose td { border-color: #334155; }
.dark .help-prose th { background: rgba(255,255,255,0.04); color: #f1f5f9; }
.help-prose .help-figure { margin: 0.75rem 0 1.25rem; }
.help-prose .help-figure img { display: block; width: 100%; max-width: 900px; min-height: 120px; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: #f8fafc; opacity: 0; transition: opacity 0.2s ease; }
.help-prose .help-figure img.is-loaded { opacity: 1; min-height: 0; }
.help-prose .help-figure.is-missing img { display: none; }
.help-prose .help-figure figcaption { font-size: 0.75rem; color: #94a3b8; margin-top: 0.375rem; }
.dark .help-prose .help-figure img { border-color: #334155; background: rgba(255,255,255,0.04); }
</style>
