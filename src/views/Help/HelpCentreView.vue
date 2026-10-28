<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BookOpen, ChevronRight, Smartphone } from 'lucide-vue-next'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiSearchInput from '@/components/Ui/UiSearchInput.vue'
import HelpMarkdown from '@/components/Help/HelpMarkdown.vue'
import { useHelpStore } from '@/stores/help.store'
import type { HelpPage, HelpPageMeta } from '@/api/help.api'

/**
 * Help Centre (Sprint 25): browse and search every help page the signed-in user may see.
 * `/help/:slug` deep-links a page; `#anchor` jumps to a heading (Settings tabs).
 */
const route = useRoute()
const router = useRouter()
const help = useHelpStore()

const search = ref('')
const page = ref<HelpPage | null>(null)
const pageLoading = ref(false)
const notFound = ref(false)

const currentSlug = computed(() => (route.params.slug as string | undefined) || null)
const sectionTitle = computed(() => help.sections.find((s) => s.key === page.value?.section)?.title ?? '')

const matches = (p: HelpPageMeta, q: string) =>
  p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.headings.some((h) => h.toLowerCase().includes(q))

const groups = computed(() => {
  const q = search.value.trim().toLowerCase()
  return help.pagesBySection
    .map((g) => ({ ...g, pages: q ? g.pages.filter((p) => matches(p, q)) : g.pages }))
    .filter((g) => g.pages.length)
})

const resultCount = computed(() => groups.value.reduce((n, g) => n + g.pages.length, 0))

async function loadPage(slug: string | null): Promise<void> {
  if (!slug) {
    page.value = null
    notFound.value = false
    return
  }
  pageLoading.value = true
  notFound.value = false
  try {
    const found = await help.fetchPage(slug)
    page.value = found
    notFound.value = !found
    if (!route.hash) document.querySelector('main')?.scrollTo({ top: 0 })
  } finally {
    pageLoading.value = false
  }
}

/** Called by HelpMarkdown once the page and its screenshots are in the DOM, so anchors land in the right place */
function scrollToHash(): void {
  const anchor = route.hash.replace(/^#/, '')
  if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: 'start' })
}

function open(slug: string, anchor: string | null = null): void {
  router.push({ path: `/help/${slug}`, hash: anchor ? `#${anchor}` : undefined })
}

onMounted(async () => {
  await help.fetchIndex()
  if (!currentSlug.value && help.pages.length) {
    router.replace(`/help/${help.pages[0].slug}`)
  } else {
    await loadPage(currentSlug.value)
  }
})

watch(currentSlug, (slug) => loadPage(slug))
watch(() => route.hash, (hash) => {
  const anchor = hash.replace(/^#/, '')
  if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
})
</script>

<template>
  <DefaultLayout>
    <div class="mb-6">
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <BookOpen class="w-5 h-5 text-brand-500" /> Help Centre
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">How to use Cruise, screen by screen. Click the question mark on any page for the help for that screen.</p>
    </div>

    <div v-if="help.error" class="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/40 p-4 text-sm text-red-700 dark:text-red-300">
      {{ help.error }}
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)] items-start">
      <!-- Navigation -->
      <aside class="lg:sticky lg:top-0 space-y-4">
        <UiSearchInput v-model="search" placeholder="Search help…" />
        <p v-if="search.trim()" class="text-xs text-slate-400">{{ resultCount }} {{ resultCount === 1 ? 'page' : 'pages' }} match</p>

        <nav class="bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-xl p-2 max-h-[calc(100vh-14rem)] overflow-y-auto">
          <p v-if="help.isLoading && !help.pages.length" class="text-sm text-slate-400 p-3">Loading…</p>
          <p v-else-if="!groups.length" class="text-sm text-slate-400 p-3">Nothing matches your search.</p>
          <section v-for="group in groups" :key="group.section.key" class="mb-2">
            <h4 class="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ group.section.title }}</h4>
            <ul>
              <li v-for="p in group.pages" :key="p.slug">
                <button
                  type="button"
                  :class="[
                    'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-sm transition-colors',
                    p.slug === currentSlug
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5',
                  ]"
                  @click="open(p.slug)"
                >
                  <Smartphone v-if="p.app === 'field'" class="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  <span class="truncate">{{ p.title }}</span>
                </button>
              </li>
            </ul>
          </section>
        </nav>
      </aside>

      <!-- Page -->
      <article class="bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-xl p-6 lg:p-8 min-w-0">
        <div v-if="pageLoading" class="py-16 text-center text-sm text-slate-400">Loading…</div>

        <div v-else-if="notFound" class="py-16 text-center">
          <p class="text-slate-700 dark:text-slate-200 font-medium">That help page is not available.</p>
          <p class="text-sm text-slate-400 mt-1">It may have moved, or your role cannot see that part of the system.</p>
        </div>

        <template v-else-if="page">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
            {{ sectionTitle }} <ChevronRight class="w-3 h-3" /> {{ page.title }}
          </p>
          <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">{{ page.title }}</h2>
          <HelpMarkdown :markdown="page.markdown" @navigate="open" @rendered="scrollToHash" />
        </template>

        <div v-else class="py-16 text-center text-sm text-slate-400">Pick a topic on the left.</div>
      </article>
    </div>
  </DefaultLayout>
</template>
