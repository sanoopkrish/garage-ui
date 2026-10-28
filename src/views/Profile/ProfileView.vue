<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiButton from '@/components/Ui/UiButton.vue'
import UiInput from '@/components/Ui/UiInput.vue'
import UiBadge from '@/components/Ui/UiBadge.vue'
import { Camera, KeyRound, Loader2, Pencil, X, Briefcase, User as UserIcon } from 'lucide-vue-next'
import {
  getMyProfile, updateMyProfile, getProfilePhotoUrl, uploadProfilePhoto, changeMyPassword,
  type MyProfile,
} from '@/api/profile.api'
import { useAuthStore } from '@/stores/auth'
import { getMyKioskPin, setMyKioskPin } from '@/api/kiosk.api'
import { ToastService } from '@/services/toast.service'

const authStore = useAuthStore()

const me = ref<MyProfile | null>(null)
const photoUrl = ref('')
const loading = ref(true)
const saving = ref(false)
const uploadingPhoto = ref(false)
const editing = ref(false)

const form = reactive({
  firstName: '',
  middleName: '',
  lastName: '',
  phoneNumber: '',
  dateOfBirth: '',
  addressLine: '',
  city: '',
  postcode: '',
})

const fullName = computed(() =>
  [me.value?.firstName, me.value?.middleName, me.value?.lastName].filter(Boolean).join(' '),
)
const initials = computed(() =>
  `${me.value?.firstName?.[0] ?? ''}${me.value?.lastName?.[0] ?? ''}`.toUpperCase(),
)

function populateForm() {
  if (!me.value) return
  form.firstName = me.value.firstName
  form.middleName = me.value.middleName
  form.lastName = me.value.lastName
  form.phoneNumber = me.value.phoneNumber
  form.dateOfBirth = me.value.dateOfBirth ? String(me.value.dateOfBirth).slice(0, 10) : ''
  form.addressLine = me.value.address?.line1 ?? me.value.address?.street ?? ''
  form.city = me.value.address?.city ?? ''
  form.postcode = me.value.address?.postcode ?? me.value.address?.zipCode ?? ''
}

async function load() {
  loading.value = true
  try {
    me.value = await getMyProfile()
    populateForm()
    if (me.value.profilePicUploaded) {
      photoUrl.value = await getProfilePhotoUrl(me.value.id).catch(() => '')
    }
  } catch {
    ToastService.error('Failed to load your profile')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    me.value = await updateMyProfile({
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim(),
      lastName: form.lastName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      dateOfBirth: form.dateOfBirth || undefined,
      address: { line1: form.addressLine.trim(), city: form.city.trim(), postcode: form.postcode.trim() },
    })
    populateForm()
    editing.value = false
    ToastService.success('Profile updated')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to update profile')
  } finally {
    saving.value = false
  }
}

async function onPhotoPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingPhoto.value = true
  try {
    await uploadProfilePhoto(file)
    photoUrl.value = ''
    if (me.value) photoUrl.value = await getProfilePhotoUrl(me.value.id)
    // Header avatar reads from the auth store — refresh it so the new photo shows immediately
    await authStore.fetchProfile()
    ToastService.success('Profile photo updated')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Photo upload failed')
  } finally {
    uploadingPhoto.value = false
    input.value = ''
  }
}

// ---- Password ----
const pw = reactive({ newPassword: '', confirmPassword: '' })
const changingPw = ref(false)

// Kiosk PIN (Sprint 18) — shown only when the workshop uses kiosk clocking
const kiosk = reactive({ enabled: false, hasPin: false, pin: '', saving: false })
async function loadKiosk() {
  try {
    const info = await getMyKioskPin()
    kiosk.enabled = info.kioskEnabled
    kiosk.hasPin = info.hasPin
  } catch { /* card stays hidden */ }
}
async function saveKioskPin() {
  if (!/^\d{4,6}$/.test(kiosk.pin)) { ToastService.error('A PIN is 4 to 6 digits'); return }
  kiosk.saving = true
  try {
    await setMyKioskPin(kiosk.pin)
    ToastService.success('Kiosk PIN saved')
    kiosk.pin = ''
    kiosk.hasPin = true
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Could not save the PIN')
  } finally {
    kiosk.saving = false
  }
}
onMounted(loadKiosk)

async function changePassword() {
  if (pw.newPassword.length < 8) {
    ToastService.error('Password must be at least 8 characters')
    return
  }
  if (pw.newPassword !== pw.confirmPassword) {
    ToastService.error('Passwords do not match')
    return
  }
  changingPw.value = true
  try {
    await changeMyPassword(pw.newPassword, pw.confirmPassword)
    pw.newPassword = ''
    pw.confirmPassword = ''
    ToastService.success('Password changed')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message ?? 'Failed to change password')
  } finally {
    changingPw.value = false
  }
}

function formatDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

onMounted(load)
</script>

<template>
  <DefaultLayout>
    <div class="max-w-3xl mx-auto space-y-5">
      <div v-if="loading" class="card h-40 animate-pulse bg-slate-100 dark:bg-white/5" />

      <template v-else-if="me">
        <!-- Header card -->
        <div class="card flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div class="relative flex-shrink-0">
            <img
              v-if="photoUrl"
              :src="photoUrl"
              :alt="fullName"
              class="w-24 h-24 rounded-full object-cover border-2 border-brand-500/30"
            />
            <div
              v-else
              class="w-24 h-24 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-3xl font-bold"
            >
              {{ initials }}
            </div>
            <label
              class="absolute -bottom-1 -right-1 p-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white cursor-pointer transition-colors shadow"
              :class="uploadingPhoto ? 'opacity-60 pointer-events-none' : ''"
              aria-label="Change profile photo"
            >
              <Loader2 v-if="uploadingPhoto" class="w-3.5 h-3.5 animate-spin" />
              <Camera v-else class="w-3.5 h-3.5" />
              <input type="file" accept="image/*" class="hidden" @change="onPhotoPicked" />
            </label>
          </div>

          <div class="text-center sm:text-left flex-1">
            <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ fullName }}</h1>
            <p class="text-sm text-slate-500 mt-0.5">
              {{ [me.jobTitle, me.department].filter(Boolean).join(' · ') || me.email }}
            </p>
            <p class="text-sm text-slate-400">{{ me.email }}</p>
            <div class="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2.5">
              <UiBadge v-for="role in me.systemRoles" :key="role.id" variant="open">{{ role.name }}</UiBadge>
              <UiBadge v-for="skill in me.skills" :key="skill.id" variant="done">{{ skill.name }}</UiBadge>
            </div>
          </div>
        </div>

        <!-- Personal information -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <UserIcon class="w-4 h-4 text-brand-500" /> Personal Information
            </h2>
            <button
              class="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
              @click="editing ? ((editing = false), populateForm()) : (editing = true)"
            >
              <X v-if="editing" class="w-3.5 h-3.5" />
              <Pencil v-else class="w-3.5 h-3.5" />
              {{ editing ? 'Cancel' : 'Edit' }}
            </button>
          </div>

          <template v-if="!editing">
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div><dt class="text-slate-400">Full name</dt><dd class="text-slate-700 dark:text-slate-200 mt-0.5">{{ fullName }}</dd></div>
              <div><dt class="text-slate-400">Phone</dt><dd class="text-slate-700 dark:text-slate-200 mt-0.5">{{ me.phoneNumber || '—' }}</dd></div>
              <div><dt class="text-slate-400">Date of birth</dt><dd class="text-slate-700 dark:text-slate-200 mt-0.5">{{ formatDate(me.dateOfBirth) }}</dd></div>
              <div>
                <dt class="text-slate-400">Address</dt>
                <dd class="text-slate-700 dark:text-slate-200 mt-0.5">
                  {{ [me.address?.line1 ?? me.address?.street, me.address?.city, me.address?.postcode ?? me.address?.zipCode].filter(Boolean).join(', ') || '—' }}
                </dd>
              </div>
            </dl>
          </template>

          <template v-else>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UiInput v-model="form.firstName" label="First name" required />
              <UiInput v-model="form.lastName" label="Last name" required />
              <UiInput v-model="form.middleName" label="Middle name" />
              <UiInput v-model="form.phoneNumber" label="Phone" type="tel" />
              <UiInput v-model="form.dateOfBirth" label="Date of birth" type="date" />
              <UiInput v-model="form.addressLine" label="Address line" />
              <UiInput v-model="form.city" label="City" />
              <UiInput v-model="form.postcode" label="Postcode" />
            </div>
            <div class="flex justify-end mt-4">
              <UiButton :disabled="saving || !form.firstName.trim() || !form.lastName.trim()" @click="save">
                <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
                {{ saving ? 'Saving…' : 'Save changes' }}
              </UiButton>
            </div>
          </template>
        </div>

        <!-- Employment (admin-managed, read-only) -->
        <div class="card">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Briefcase class="w-4 h-4 text-brand-500" /> Employment
          </h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div><dt class="text-slate-400">Department</dt><dd class="text-slate-700 dark:text-slate-200 mt-0.5">{{ me.department || '—' }}</dd></div>
            <div><dt class="text-slate-400">Job title</dt><dd class="text-slate-700 dark:text-slate-200 mt-0.5">{{ me.jobTitle || '—' }}</dd></div>
            <div><dt class="text-slate-400">Employment type</dt><dd class="text-slate-700 dark:text-slate-200 mt-0.5">{{ me.employmentType || '—' }}</dd></div>
            <div><dt class="text-slate-400">Hire date</dt><dd class="text-slate-700 dark:text-slate-200 mt-0.5">{{ formatDate(me.hireDate) }}</dd></div>
          </dl>
          <p class="text-xs text-slate-400 mt-4">Employment details are managed by your administrator.</p>
        </div>

        <!-- Kiosk PIN -->
        <div v-if="kiosk.enabled" class="card">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-1">
            <KeyRound class="w-4 h-4 text-brand-500" /> Kiosk PIN
          </h2>
          <p class="text-sm text-slate-500 mb-4">{{ kiosk.hasPin ? 'You have a PIN for clocking in at the kiosk. Enter a new one to change it.' : 'Choose a 4–6 digit PIN to clock in and out at the kiosk.' }}</p>
          <div class="flex items-end gap-3 max-w-lg">
            <div class="w-40"><UiInput v-model="kiosk.pin" label="New PIN" type="password" placeholder="4–6 digits" /></div>
            <UiButton variant="secondary" :disabled="kiosk.saving || !kiosk.pin" @click="saveKioskPin">{{ kiosk.hasPin ? 'Change PIN' : 'Set PIN' }}</UiButton>
          </div>
        </div>

        <!-- Password -->
        <div class="card">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <KeyRound class="w-4 h-4 text-brand-500" /> Change Password
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <UiInput v-model="pw.newPassword" label="New password" type="password" placeholder="Min. 8 characters" />
            <UiInput v-model="pw.confirmPassword" label="Confirm password" type="password" />
          </div>
          <div class="flex justify-end mt-4 max-w-lg">
            <UiButton variant="secondary" :disabled="changingPw || !pw.newPassword" @click="changePassword">
              <Loader2 v-if="changingPw" class="w-4 h-4 animate-spin" />
              {{ changingPw ? 'Changing…' : 'Change password' }}
            </UiButton>
          </div>
        </div>
      </template>
    </div>
  </DefaultLayout>
</template>
