<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import { Upload, Trash2, Check, AlertTriangle, RotateCcw } from 'lucide-vue-next'
import { getBranding, updateBranding, uploadBrandingLogo, removeBrandingLogo, type Branding, type LogoType } from '@/api/company.api'
import { useBrandingStore } from '@/stores/branding.store'
import { usePermissions } from '@/composables/usePermissions'
import { generatePalette, isHexColor, CRUISE_ORANGE, SHADES } from '@/utils/palette'
import { ToastService } from '@/services/toast.service'

/**
 * Sprint 28 — Branding card. Used twice: Settings → Business (tenant, no prop) and the owner's
 * Companies → Edit → Branding tab (`companyId` set, writes to /company/:id/branding and does
 * not restyle the owner's own screen).
 */
const props = defineProps<{ companyId?: string }>()
const ownerMode = computed(() => !!props.companyId)

const { hasPermission: canUpdateTenant } = usePermissions('menus.administration.settings.business.update')
const canUpdate = computed(() => ownerMode.value || canUpdateTenant.value)

const brandStore = useBrandingStore()
const loading = ref(true)
const saving = ref(false)
const uploading = ref<LogoType | null>(null)
const branding = ref<Branding | null>(null)
const form = reactive({ primaryColor: CRUISE_ORANGE[500], appName: '' })

const SWATCHES = [
  { hex: '#f97316', label: 'Cruise orange' }, { hex: '#2563eb', label: 'Blue' }, { hex: '#dc2626', label: 'Red' }, { hex: '#16a34a', label: 'Green' },
  { hex: '#0891b2', label: 'Teal' }, { hex: '#7c3aed', label: 'Purple' }, { hex: '#ca8a04', label: 'Gold' }, { hex: '#0f172a', label: 'Navy black' },
]

const SLOTS: { type: LogoType; label: string; hint: string; dark: boolean }[] = [
  { type: 'header', label: 'Header logo', hint: 'Sidebar and emails. Wide, transparent background, about 400 × 100 px.', dark: true },
  { type: 'login', label: 'Login logo', hint: 'Sign-in pages, shown on white. Falls back to the header logo.', dark: false },
  { type: 'report', label: 'Report logo', hint: 'Quotes, invoices, statements and certificates (PDF). Falls back to the header logo.', dark: false },
  { type: 'mark', label: 'Square mark', hint: 'Collapsed sidebar, browser tab and the installed field app icon. Square, 512 × 512 px or SVG. The favicon and app icons are made from it.', dark: false },
  { type: 'dark', label: 'Dark-background variant', hint: 'Optional: a light version of the header logo for the dark sidebar and the field app.', dark: true },
]

const previewPalette = computed(() => {
  try { return generatePalette(isHexColor(form.primaryColor) ? form.primaryColor : CRUISE_ORANGE[500]) } catch { return generatePalette(CRUISE_ORANGE[500]) }
})
const previewStyle = computed(() => {
  const style: Record<string, string> = {}
  for (const s of SHADES) style[`--brand-${s}`] = previewPalette.value.rgb[s]
  style['--brand-contrast'] = previewPalette.value.contrastOn500 === 'dark' ? '15 23 42' : '255 255 255'
  return style
})
const isCruiseOrange = computed(() => form.primaryColor.toLowerCase() === CRUISE_ORANGE[500])
const colorValid = computed(() => isHexColor(form.primaryColor))

function setFromBranding(b: Branding) {
  branding.value = b
  form.primaryColor = b.primaryColor
  form.appName = b.branded && b.appName !== b.name ? b.appName : ''
  if (!ownerMode.value) brandStore.apply(b)
}

async function load() {
  loading.value = true
  try {
    setFromBranding(await getBranding(props.companyId))
  } catch (e: any) {
    ToastService.error(e?.response?.data?.message ?? 'Could not load branding')
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!colorValid.value) { ToastService.error('Enter a colour as #rrggbb'); return }
  saving.value = true
  try {
    setFromBranding(await updateBranding({ primaryColor: isCruiseOrange.value ? null : form.primaryColor.toLowerCase(), appName: form.appName.trim() || null }, props.companyId))
    ToastService.success(ownerMode.value ? 'Branding saved for this company' : 'Branding saved — everyone sees it on their next page load')
  } catch (e: any) {
    const message = e?.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Failed to save branding'))
  } finally {
    saving.value = false
  }
}

function reset() { form.primaryColor = CRUISE_ORANGE[500] }

async function onPick(type: LogoType, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 1024 * 1024) { ToastService.error('Logos must be 1 MB or smaller'); return }
  uploading.value = type
  try {
    setFromBranding(await uploadBrandingLogo(type, file, props.companyId))
    ToastService.success(`${SLOTS.find((s) => s.type === type)?.label ?? 'Logo'} updated`)
  } catch (e: any) {
    const message = e?.response?.data?.message
    ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? 'Upload failed'))
  } finally {
    uploading.value = null
  }
}

async function onRemove(type: LogoType) {
  uploading.value = type
  try {
    setFromBranding(await removeBrandingLogo(type, props.companyId))
    ToastService.success('Logo removed')
  } catch (e: any) {
    ToastService.error(e?.response?.data?.message ?? 'Could not remove the logo')
  } finally {
    uploading.value = null
  }
}

watch(() => props.companyId, () => load())
onMounted(load)
</script>

<template>
  <div>
    <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Branding</h2>
    <p class="text-sm text-slate-500 mb-5">Your logo and colour across the app, the field app, emails and PDFs. A small "Powered by" line is always shown.</p>

    <div v-if="loading" class="h-40 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <div v-else-if="branding" class="space-y-8">
      <!-- Logos -->
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Logos</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="slot in SLOTS" :key="slot.type" class="rounded-lg border border-slate-200 dark:border-dark-border p-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ slot.label }}</p>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ slot.hint }}</p>
              </div>
            </div>
            <div :class="['mt-3 h-20 rounded-md flex items-center justify-center overflow-hidden', slot.dark ? 'bg-sidebar' : 'bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-dark-border']">
              <img v-if="branding.logos[slot.type]" :src="branding.logos[slot.type]!" :alt="slot.label" class="max-h-16 max-w-[90%] object-contain" />
              <span v-else :class="['text-xs', slot.dark ? 'text-slate-500' : 'text-slate-400']">No {{ slot.label.toLowerCase() }} yet</span>
            </div>
            <div v-if="canUpdate" class="mt-2 flex items-center gap-2">
              <label class="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline cursor-pointer">
                <Upload class="w-3.5 h-3.5" /> {{ branding.logos[slot.type] ? 'Replace' : 'Upload' }}
                <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp,image/svg+xml" :disabled="uploading !== null" @change="onPick(slot.type, $event)" />
              </label>
              <button v-if="branding.logos[slot.type]" :disabled="uploading !== null" class="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500" @click="onRemove(slot.type)">
                <Trash2 class="w-3.5 h-3.5" /> Remove
              </button>
              <span v-if="uploading === slot.type" class="text-xs text-slate-400">Working…</span>
            </div>
          </div>
        </div>
        <p class="text-[11px] text-slate-400 mt-2">PNG, JPEG, WebP or SVG, up to 1 MB. Photos are resized to 1024 px and stripped of metadata; SVGs with scripts are refused.</p>
      </div>

      <!-- Colour -->
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Colour</p>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <input v-model="form.primaryColor" type="color" :disabled="!canUpdate" class="w-11 h-11 rounded-lg border border-slate-200 dark:border-dark-border bg-transparent cursor-pointer disabled:cursor-not-allowed" aria-label="Pick a colour" />
              <div class="flex-1"><UiInput v-model="form.primaryColor" label="Primary colour" placeholder="#f97316" :disabled="!canUpdate" :error="colorValid ? undefined : 'Use #rrggbb'" /></div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="sw in SWATCHES"
                :key="sw.hex"
                type="button"
                :disabled="!canUpdate"
                :title="sw.label"
                :class="['w-7 h-7 rounded-full border-2 transition-transform hover:scale-110', form.primaryColor.toLowerCase() === sw.hex ? 'border-slate-800 dark:border-white' : 'border-white dark:border-dark-surface shadow']"
                :style="{ background: sw.hex }"
                @click="form.primaryColor = sw.hex"
              />
              <button v-if="canUpdate && !isCruiseOrange" type="button" class="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 ml-1" @click="reset"><RotateCcw class="w-3 h-3" /> Reset to Cruise orange</button>
            </div>
            <p :class="['text-xs inline-flex items-center gap-1', previewPalette.contrastOn500 === 'light' ? 'text-emerald-600' : 'text-amber-600']">
              <Check v-if="previewPalette.contrast.white >= 2.5 || previewPalette.contrast.dark >= 4.5" class="w-3.5 h-3.5" /><AlertTriangle v-else class="w-3.5 h-3.5" />
              Text on buttons: {{ previewPalette.contrastOn500 === 'light' ? 'white' : 'dark' }} ({{ previewPalette.contrastOn500 === 'light' ? previewPalette.contrast.white : previewPalette.contrast.dark }}:1)
            </p>
            <UiInput v-model="form.appName" label="App name (optional)" :placeholder="branding.name" :disabled="!canUpdate" />
            <p class="text-[11px] text-slate-400 -mt-1">Short name for the browser tab and the installed field app. Blank uses the company name.</p>
          </div>

          <!-- Live preview -->
          <div class="rounded-lg border border-slate-200 dark:border-dark-border p-4 space-y-3" :style="previewStyle">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Preview</p>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-3 py-1.5 rounded-lg bg-brand-500 text-brand-contrast text-sm font-medium">Save Changes</span>
              <span class="px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-sm font-medium border border-brand-200">Secondary</span>
              <a class="text-sm text-brand-600 underline">A link</a>
              <span class="badge bg-brand-100 text-brand-700">On-site</span>
            </div>
            <div class="flex gap-1">
              <div v-for="s in SHADES" :key="s" class="flex-1 h-6 rounded" :style="{ background: previewPalette.hex[s] }" :title="`${s} ${previewPalette.hex[s]}`" />
            </div>
            <div class="rounded-md bg-sidebar p-3 flex items-center gap-3">
              <img v-if="branding.logos.dark || branding.logos.header" :src="(branding.logos.dark || branding.logos.header)!" alt="" class="h-6 max-w-[120px] object-contain" />
              <span v-else class="text-white font-bold text-sm">{{ form.appName || branding.name }}</span>
              <span class="ml-auto text-[10px] text-slate-500">Powered by <span class="text-slate-400 font-semibold">A-soft - Tconsult Technologies</span></span>
            </div>
            <div class="rounded-md bg-white border border-slate-200 p-3">
              <div class="border-b-2 pb-1 mb-1" :style="{ borderColor: previewPalette.hex[500] }"><span class="font-bold text-sm" :style="{ color: previewPalette.hex[500] }">{{ branding.name }}</span></div>
              <p class="text-[10px] text-slate-400">PDF heading · Powered by Cruise · A-soft</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="canUpdate" class="flex items-center gap-3">
        <UiButton :loading="saving" @click="save">Save Branding</UiButton>
        <span class="text-xs text-slate-400">Logos are saved as soon as they are uploaded.</span>
      </div>
    </div>
  </div>
</template>
