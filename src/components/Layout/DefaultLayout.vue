<script setup lang="ts">
import AppSidebar from './Sidebar/AppSidebar.vue'
import AppHeader from './Header/AppHeader.vue'
import HelpDrawer from '@/components/Help/HelpDrawer.vue'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const pageTitle = computed(() => String(route.meta.title || 'Dashboard'))
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50 dark:bg-dark-bg">
    <AppSidebar />

    <div class="flex flex-col flex-1 min-w-0">
      <AppHeader>
        <template #title>
          <span class="text-slate-700 dark:text-slate-200 font-semibold text-base">{{ pageTitle }}</span>
        </template>
      </AppHeader>

      <main class="flex-1 overflow-y-auto">
        <div class="max-w-screen-2xl mx-auto p-6">
          <slot />
        </div>
      </main>
    </div>

    <!-- Sprint 25 — contextual help opened from the header "?" -->
    <HelpDrawer />
  </div>
</template>
