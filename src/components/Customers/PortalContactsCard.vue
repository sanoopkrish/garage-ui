<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiModal from '@/components/Ui/UiModal.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiSelect from '@/components/Ui/UiSelect.vue'
import UiToggle from '@/components/Ui/UiToggle.vue'
import { Globe, Plus, Pencil, Link2, KeyRound, LogOut, Trash2, Copy, Loader2, Ban, CheckCircle2 } from 'lucide-vue-next'
import {
  getPortalContacts, createPortalContact, updatePortalContact, deletePortalContact,
  sendPortalLink, invitePortalContact, signOutPortalContactEverywhere,
  type PortalContact, type CreatePortalContactDto,
} from '@/api/portal.api'
import { PortalContactRole, PortalContactRoleLabels, PortalContactStatus } from '@/types/generated/enums/portal'
import { CustomerType } from '@/types/generated/enums/customer'
import { usePermissions } from '@/composables/usePermissions'
import { ToastService } from '@/services/toast.service'
import { showConfirmDialog } from '@/utils/alert'

/**
 * Sprint 29 — who can sign in to the customer portal for this customer. Private customers
 * normally have one contact (sign-in link by email or text); trade accounts have several,
 * each with a role, and may use a password instead.
 */
const props = defineProps<{ customerId: string; customerType?: CustomerType }>()

const { hasPermission: canRead } = usePermissions('menus.crm.portal.read')
const { hasPermission: canUpdate } = usePermissions('menus.crm.portal.update')

const loading = ref(true)
const items = ref<PortalContact[]>([])
const portalUrl = ref('')
const portalEnabled = ref(true)
const busyId = ref<string | null>(null)

const isTrade = computed(() => props.customerType === CustomerType.B2B)
const roleOptions = Object.values(PortalContactRole).map((r) => ({ value: r, label: PortalContactRoleLabels[r] }))

// ---- add / edit form
const open = ref(false)
const editing = ref<PortalContact | null>(null)
const saving = ref(false)
const form = reactive<{ name: string; email: string; phone: string; role: PortalContactRole; isPrimary: boolean; invite: boolean }>({ name: '', email: '', phone: '', role: PortalContactRole.OTHER, isPrimary: false, invite: false })
const formError = ref('')

function startAdd() {
  editing.value = null
  Object.assign(form, { name: '', email: '', phone: '', role: items.value.length ? PortalContactRole.OTHER : PortalContactRole.PRIMARY, isPrimary: !items.value.length, invite: false })
  formError.value = ''
  open.value = true
}
function startEdit(c: PortalContact) {
  editing.value = c
  Object.assign(form, { name: c.name, email: c.email ?? '', phone: c.phone ?? '', role: c.role, isPrimary: c.isPrimary, invite: false })
  formError.value = ''
  open.value = true
}

async function load() {
  if (!canRead.value) return
  loading.value = true
  try {
    const res = await getPortalContacts(props.customerId)
    items.value = res.items
    portalUrl.value = res.portalUrl
    portalEnabled.value = res.portalEnabled
  } catch {
    /* card keeps its empty state */
  } finally {
    loading.value = false
  }
}

const apiMessage = (e: any, fallback: string) => {
  const m = e?.response?.data?.message
  return Array.isArray(m) ? m.join('; ') : m ?? fallback
}

async function save() {
  formError.value = ''
  if (!form.name.trim()) { formError.value = 'A name is needed'; return }
  if (!form.email && !form.phone) { formError.value = 'Give an email address or a mobile number'; return }
  saving.value = true
  try {
    if (editing.value) {
      const updated = await updatePortalContact(props.customerId, editing.value.id, {
        name: form.name, email: form.email || null, phone: form.phone || null, role: form.role, isPrimary: form.isPrimary,
      })
      items.value = items.value.map((c) => (c.id === updated.id ? updated : form.isPrimary ? { ...c, isPrimary: false } : c))
      ToastService.success('Contact updated')
    } else {
      const dto: CreatePortalContactDto = { name: form.name, role: form.role, isPrimary: form.isPrimary, invite: form.invite, email: form.email || null, phone: form.phone || null }
      const created = await createPortalContact(props.customerId, dto)
      if (form.isPrimary) items.value = items.value.map((c) => ({ ...c, isPrimary: false }))
      items.value.push(created)
      ToastService.success(form.invite ? 'Contact added and invitation sent' : 'Contact added')
    }
    open.value = false
  } catch (e: any) {
    formError.value = apiMessage(e, 'Could not save the contact')
  } finally {
    saving.value = false
  }
}

async function sendLink(c: PortalContact) {
  busyId.value = c.id
  try {
    const r = await sendPortalLink(props.customerId, c.id)
    ToastService.success(r.sent ? `Sign-in link sent by ${r.channel === 'sms' ? 'text message' : 'email'} (valid ${r.expiresMinutes} minutes)` : 'The link could not be sent — check the company email settings')
  } catch (e: any) {
    ToastService.error(apiMessage(e, 'Could not send the link'))
  } finally {
    busyId.value = null
  }
}

async function invite(c: PortalContact) {
  busyId.value = c.id
  try {
    const r = await invitePortalContact(props.customerId, c.id)
    ToastService.success(r.sent ? `Invitation emailed (link valid ${r.expiresHours} hours)` : 'The invitation could not be sent — check the company email settings')
    await load()
  } catch (e: any) {
    ToastService.error(apiMessage(e, 'Could not send the invitation'))
  } finally {
    busyId.value = null
  }
}

async function toggleDisabled(c: PortalContact) {
  const disabling = c.status !== PortalContactStatus.DISABLED
  if (disabling) {
    const ok = await showConfirmDialog(`${c.name} will no longer be able to sign in, and any open sessions end now.`, false, 'Disable')
    if (!ok.isConfirmed) return
  }
  busyId.value = c.id
  try {
    const updated = await updatePortalContact(props.customerId, c.id, { status: disabling ? PortalContactStatus.DISABLED : PortalContactStatus.ACTIVE })
    items.value = items.value.map((x) => (x.id === updated.id ? updated : x))
    ToastService.success(disabling ? 'Contact disabled' : 'Contact re-enabled')
  } catch (e: any) {
    ToastService.error(apiMessage(e, 'Could not change the contact'))
  } finally {
    busyId.value = null
  }
}

async function signOut(c: PortalContact) {
  busyId.value = c.id
  try {
    const r = await signOutPortalContactEverywhere(props.customerId, c.id)
    items.value = items.value.map((x) => (x.id === c.id ? { ...x, activeSessions: 0 } : x))
    ToastService.success(r.revoked ? `Signed out of ${r.revoked} device${r.revoked === 1 ? '' : 's'}` : 'No open sessions')
  } catch (e: any) {
    ToastService.error(apiMessage(e, 'Could not sign the contact out'))
  } finally {
    busyId.value = null
  }
}

async function remove(c: PortalContact) {
  const ok = await showConfirmDialog(`Remove ${c.name} from online access? Their messages on jobs stay on record.`, false, 'Remove')
  if (!ok.isConfirmed) return
  busyId.value = c.id
  try {
    await deletePortalContact(props.customerId, c.id)
    items.value = items.value.filter((x) => x.id !== c.id)
    ToastService.success('Contact removed')
  } catch (e: any) {
    ToastService.error(apiMessage(e, 'Could not remove the contact'))
  } finally {
    busyId.value = null
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(portalUrl.value)
    ToastService.success('Portal address copied')
  } catch {
    ToastService.error('Could not copy — select the address and copy it by hand')
  }
}

function when(iso: string | null): string {
  if (!iso) return 'never'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

onMounted(load)
watch(() => props.customerId, load)
</script>

<template>
  <div v-if="canRead" class="card">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <Globe class="w-4 h-4 text-brand-500" />
        <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Customer portal</h2>
        <span v-if="items.length" class="text-xs text-slate-400">{{ items.length }}</span>
      </div>
      <UiButton v-if="canUpdate && portalEnabled" size="sm" variant="secondary" @click="startAdd">
        <Plus class="w-3.5 h-3.5" /> Add contact
      </UiButton>
    </div>

    <div v-if="loading" class="h-16 animate-pulse bg-slate-100 dark:bg-white/5 rounded-lg" />

    <template v-else>
      <p v-if="!portalEnabled" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300 rounded-lg px-3 py-2 mb-3">
        The customer portal is switched off for this garage. Turn it on under Settings → Portal to let customers sign in.
      </p>

      <p class="text-xs text-slate-400 mb-3">
        People who can see this customer's jobs online.
        <template v-if="isTrade">Trade contacts can be invited to set a password; everyone can also use a one-time sign-in link.</template>
        <template v-else>Private customers sign in with a one-time link sent by email or text, no password needed.</template>
      </p>

      <p v-if="!items.length" class="text-sm text-slate-400 mb-3">No portal contacts yet.</p>
      <ul v-else class="divide-y divide-slate-100 dark:divide-dark-border mb-3">
        <li v-for="c in items" :key="c.id" class="py-2.5 flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ c.name }}</span>
              <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">{{ PortalContactRoleLabels[c.role] }}</span>
              <span v-if="c.isPrimary" class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">Primary</span>
              <span v-if="c.status === PortalContactStatus.DISABLED" class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300">Disabled</span>
              <span v-else-if="c.status === PortalContactStatus.INVITED" class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Invited</span>
              <span v-if="c.hasPassword" class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400">Password set</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 truncate">
              <span v-if="c.email">{{ c.email }}</span><span v-if="c.email && c.phone"> · </span><span v-if="c.phone">{{ c.phone }}</span>
            </p>
            <p class="text-[11px] text-slate-400">
              Last signed in {{ when(c.lastLoginAt) }}<template v-if="c.activeSessions"> · {{ c.activeSessions }} device{{ c.activeSessions === 1 ? '' : 's' }} signed in</template>
            </p>
          </div>
          <div v-if="canUpdate" class="flex items-center gap-0.5 flex-shrink-0">
            <Loader2 v-if="busyId === c.id" class="w-4 h-4 animate-spin text-slate-400 mx-1" />
            <template v-else>
              <button class="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-white/5" title="Send a sign-in link" :disabled="!portalEnabled || c.status === PortalContactStatus.DISABLED" @click="sendLink(c)"><Link2 class="w-4 h-4" /></button>
              <button v-if="isTrade && c.email" class="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-white/5" :title="c.hasPassword ? 'Send a reset-password link' : 'Invite to set a password'" :disabled="!portalEnabled || c.status === PortalContactStatus.DISABLED" @click="invite(c)"><KeyRound class="w-4 h-4" /></button>
              <button v-if="c.activeSessions" class="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-white/5" title="Sign out everywhere" @click="signOut(c)"><LogOut class="w-4 h-4" /></button>
              <button class="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-white/5" title="Edit" @click="startEdit(c)"><Pencil class="w-4 h-4" /></button>
              <button class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-white/5" :title="c.status === PortalContactStatus.DISABLED ? 'Re-enable' : 'Disable sign-in'" @click="toggleDisabled(c)">
                <CheckCircle2 v-if="c.status === PortalContactStatus.DISABLED" class="w-4 h-4" /><Ban v-else class="w-4 h-4" />
              </button>
              <button class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5" title="Remove" @click="remove(c)"><Trash2 class="w-4 h-4" /></button>
            </template>
          </div>
        </li>
      </ul>

      <div v-if="portalEnabled" class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 rounded-lg px-3 py-2">
        <span class="truncate">Portal address: <span class="font-mono text-slate-600 dark:text-slate-300">{{ portalUrl }}</span></span>
        <button class="ml-auto p-1 rounded text-slate-400 hover:text-brand-500 flex-shrink-0" title="Copy" @click="copyUrl"><Copy class="w-3.5 h-3.5" /></button>
      </div>
    </template>

    <UiModal :open="open" :title="editing ? 'Edit portal contact' : 'Add portal contact'" size="md" @close="open = false">
      <div class="space-y-4">
        <UiInput v-model="form.name" label="Name" placeholder="Jane Smith" required />
        <UiInput v-model="form.email" label="Email address" type="email" placeholder="jane@example.com" />
        <UiInput v-model="form.phone" label="Mobile number" placeholder="07700 900123" />
        <UiSelect v-model="form.role" label="Role on the account" :options="roleOptions" />
        <UiToggle v-model="form.isPrimary" label="Primary contact" description="Shown first; one per customer." />
        <UiToggle v-if="!editing && isTrade" v-model="form.invite" label="Send invitation now" description="Emails a link to choose a password. Needs an email address." :disabled="!form.email" />
        <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <UiButton variant="secondary" @click="open = false">Cancel</UiButton>
          <UiButton :disabled="saving" @click="save">
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            {{ editing ? 'Save' : 'Add contact' }}
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
