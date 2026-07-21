<script setup lang="ts">
import { reactive, ref } from 'vue'
import api from '@/api/client'
import { ToastService } from '@/services/toast.service'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = reactive({ password: '', confirm: '' })
const submitting = ref(false)

const submit = async () => {
  if (form.password !== form.confirm) {
    ToastService.error('Passwords do not match.')
    return
  }
  submitting.value = true
  try {
    await api.post('/auth/change-password', { password: form.password })
    ToastService.success('Password updated. Please sign in.')
    router.push('/auth/login')
  } catch (e: any) {
    ToastService.error(e.response?.data?.message || 'Failed to update password.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
      <h1 class="text-xl font-bold text-slate-800 mb-1">Set a new password</h1>
      <p class="text-sm text-slate-500 mb-6">Your account requires a password update before continuing.</p>
      <form @submit.prevent="submit" class="space-y-4">
        <input v-model="form.password" type="password" placeholder="New password" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400" />
        <input v-model="form.confirm" type="password" placeholder="Confirm password" class="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400" />
        <button type="submit" :disabled="submitting" class="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg transition-colors">
          {{ submitting ? 'Saving...' : 'Update password' }}
        </button>
      </form>
    </div>
  </div>
</template>
