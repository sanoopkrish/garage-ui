<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpen, ChevronRight } from 'lucide-vue-next'
import GeneralSliderPanel from '@/components/Ui/GeneralSliderPanel.vue'
import HelpMarkdown from './HelpMarkdown.vue'
import { useHelpStore } from '@/stores/help.store'

/** Contextual help: the "?" in the header opens this with the page for the current screen */
const help = useHelpStore()
const router = useRouter()

const page = computed(() => help.drawerPage)
const sectionTitle = computed(() => help.sections.find((s) => s.key === page.value?.section)?.title ?? 'Help Centre')

function openCentre(): void {
  const to = page.value ? `/help/${page.value.slug}` : '/help'
  help.closeDrawer()
  router.push(to)
}

const pendingAnchor = ref<string | null>(null)

async function navigate(slug: string, anchor: string | null): Promise<void> {
  pendingAnchor.value = anchor
  await help.showInDrawer(slug)
}

/** Fires once the page and its screenshots are in the DOM */
function onRendered(): void {
  const anchor = pendingAnchor.value
  pendingAnchor.value = null
  if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <GeneralSliderPanel
    :model-value="help.drawerOpen"
    :title="page?.title ?? 'Help'"
    :subtitle="sectionTitle"
    size="lg"
    @update:model-value="(v: boolean) => !v && help.closeDrawer()"
    @close="help.closeDrawer()"
  >
    <div v-if="help.drawerLoading" class="py-12 text-center text-sm text-slate-400">Loading…</div>

    <HelpMarkdown v-else-if="page" :markdown="page.markdown" @navigate="navigate" @rendered="onRendered" />

    <!-- No page for this screen: offer the index -->
    <div v-else class="space-y-5">
      <p class="text-sm text-slate-500 dark:text-slate-400">There is no help page for this screen yet. Pick a topic:</p>
      <section v-for="group in help.pagesBySection" :key="group.section.key">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">{{ group.section.title }}</h4>
        <ul class="space-y-1">
          <li v-for="p in group.pages" :key="p.slug">
            <button
              type="button"
              class="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              @click="navigate(p.slug, null)"
            >
              <span class="truncate">{{ p.title }}</span>
              <ChevronRight class="w-4 h-4 text-slate-300 flex-shrink-0" />
            </button>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          @click="openCentre"
        >
          <BookOpen class="w-4 h-4" /> Open in Help Centre
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          @click="help.closeDrawer()"
        >
          Close
        </button>
      </div>
    </template>
  </GeneralSliderPanel>
</template>
