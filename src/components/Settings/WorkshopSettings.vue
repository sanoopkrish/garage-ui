<script setup lang="ts">
import { onMounted, ref } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import { getCompanySettings, updateCompanySettings } from '@/api/company.api'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'

/**
 * Settings → Workshop (Sprint 26): how jobs flow through the workshop.
 * Sprint 27 adds the automatic status rules to this tab.
 */
const { hasPermission: canUpdate } = usePermissions('menus.administration.settings.business.update')

const loading = ref(true)
const saving = ref(false)
const quoteRequired = ref(false)

async function load() {
  loading.value = true
  try {
    const settings = await getCompanySettings()
    quoteRequired.value = !!settings.quoteRequired
  } catch {
    ToastService.error('Failed to load workshop settings')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await updateCompanySettings({ quoteRequired: quoteRequired.value })
    ToastService.success('Workshop settings saved')
  } catch (e: any) {
    const message = e.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to save'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Workshop</h2>
    <p class="text-sm text-slate-500 mb-5">How jobs move from booking to collection.</p>

    <div v-if="loading" class="h-24 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <div v-else class="space-y-6 max-w-lg">
      <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Quotes</p>
        <UiToggle
          v-model="quoteRequired"
          :disabled="!canUpdate"
          label="Jobs need a quote before work starts"
          description="Off: a checked-in job can be approved straight away. On: it must be quoted and the quote accepted first. Individual customers and jobs can override this."
        />
      </div>

      <div v-if="canUpdate" class="pt-2">
        <UiButton :loading="saving" @click="save">Save Changes</UiButton>
      </div>
    </div>
  </div>
</template>
