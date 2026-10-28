<script setup lang="ts">
import { ref, watch } from 'vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { getKioskStaff, setStaffKioskPin, clearStaffKioskPin, type KioskStaffPin } from '@/api/kiosk.api'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/** Manager screen: who has a kiosk PIN, set / reset / remove one. The PIN itself is never shown back. */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const staff = ref<KioskStaffPin[]>([])
const loading = ref(false)
const editingId = ref<string | null>(null)
const pin = ref('')
const saving = ref(false)

function apiError(err: any, fallback: string) {
  const message = err?.response?.data?.message
  ToastService.error(Array.isArray(message) ? message.join('; ') : (message ?? fallback))
}

async function load() {
  loading.value = true
  try { staff.value = await getKioskStaff() } catch (err) { apiError(err, 'Failed to load staff') } finally { loading.value = false }
}
watch(() => props.open, (open) => { if (open) { editingId.value = null; pin.value = ''; load() } })

function startEdit(row: KioskStaffPin) { editingId.value = row.userId; pin.value = '' }
function suggest() { pin.value = String(Math.floor(1000 + Math.random() * 9000)) }

async function save(row: KioskStaffPin) {
  if (!/^\d{4,6}$/.test(pin.value)) { ToastService.error('A PIN is 4 to 6 digits'); return }
  saving.value = true
  try {
    await setStaffKioskPin(row.userId, pin.value)
    ToastService.success(`PIN set for ${row.name} — tell them: ${pin.value}`)
    editingId.value = null
    await load()
  } catch (err) { apiError(err, 'Failed to set the PIN') } finally { saving.value = false }
}

async function remove(row: KioskStaffPin) {
  const result = await showConfirmDialog(`Remove ${row.name}'s kiosk PIN? They will not be able to use the kiosk until a new one is set.`, false, 'Remove')
  if (!result.isConfirmed) return
  try {
    await clearStaffKioskPin(row.userId)
    ToastService.success('PIN removed')
    await load()
  } catch (err) { apiError(err, 'Failed to remove the PIN') }
}
</script>

<template>
  <UiModal :open="open" title="Kiosk PINs" size="lg" @close="emit('close')">
    <p class="text-sm text-slate-500 mb-4">
      Office and workshop staff clock in at the kiosk with a 4–6 digit PIN. Staff can also set their own under My Profile.
      PINs are stored encrypted and cannot be read back.
    </p>
    <p v-if="loading" class="text-sm text-slate-400 animate-pulse">Loading…</p>
    <div v-else class="divide-y divide-slate-100 dark:divide-dark-border max-h-[420px] overflow-y-auto">
      <div v-for="row in staff" :key="row.userId" class="py-2.5 flex items-center gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{{ row.name }}</p>
          <p class="text-xs text-slate-400 truncate">{{ row.email }}</p>
        </div>
        <template v-if="editingId === row.userId">
          <input v-model="pin" type="text" inputmode="numeric" maxlength="6" placeholder="PIN"
            class="w-24 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-400"
            @keydown.enter="save(row)" />
          <button class="text-xs text-brand-600 hover:underline" @click="suggest">Suggest</button>
          <UiButton size="sm" :loading="saving" @click="save(row)">Save</UiButton>
          <UiButton size="sm" variant="ghost" @click="editingId = null">Cancel</UiButton>
        </template>
        <template v-else>
          <UiBadge :variant="row.hasPin ? 'done' : 'pending'">{{ row.hasPin ? 'PIN set' : 'No PIN' }}</UiBadge>
          <UiButton size="sm" variant="secondary" @click="startEdit(row)">{{ row.hasPin ? 'Reset' : 'Set PIN' }}</UiButton>
          <button v-if="row.hasPin" class="text-xs text-slate-400 hover:text-red-500" @click="remove(row)">Remove</button>
        </template>
      </div>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Close</UiButton>
    </template>
  </UiModal>
</template>
