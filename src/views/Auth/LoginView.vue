<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, email, minLength } from '@vuelidate/validators'
import { useAuthStore } from '@/stores/auth'
import { useValidation } from '@/composables/useValidation'
import { Gauge, Eye, EyeOff } from 'lucide-vue-next'

const authStore = useAuthStore()
const isMock = import.meta.env.VITE_MOCK_AUTH === 'true'

const form = reactive({ email: isMock ? 'admin@garage.com' : '', password: isMock ? 'demo123' : '' })
const rules = {
  email: { required, email },
  password: { required, minLength: minLength(6) },
}
const v$ = useVuelidate(rules, form)
const { fieldError, validate } = useValidation(v$)

const showPassword = ref(false)
const submitting = ref(false)

const submit = async () => {
  if (!(await validate())) return
  submitting.value = true
  try {
    await authStore.login(form.email, form.password)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
    <!-- Background pattern -->
    <div class="absolute inset-0 opacity-5" style="background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');" />

    <div class="relative w-full max-w-md">
      <!-- Card -->
      <div class="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl overflow-hidden">
        <!-- Top accent bar -->
        <div class="h-1.5 bg-gradient-to-r from-brand-500 to-amber-400" />

        <div class="px-8 py-10">
          <!-- Logo -->
          <div class="flex items-center justify-center gap-3 mb-8">
            <div class="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg">
              <Gauge class="w-6 h-6 text-white" />
            </div>
            <div>
              <p class="text-xl font-bold text-slate-800">GarageOS</p>
              <p class="text-xs text-slate-400 -mt-0.5">Workshop Management System</p>
            </div>
          </div>

          <h1 class="text-center text-2xl font-bold text-slate-800 mb-1">Welcome back</h1>
          <p class="text-center text-sm text-slate-500 mb-6">Sign in to your account</p>

          <!-- Demo credentials banner -->
          <div v-if="isMock" class="mb-5 p-3 bg-brand-50 border border-brand-200 rounded-lg text-xs text-brand-700 text-center">
            <strong>Template mode</strong> — any credentials work. Demo: <span class="font-mono">admin@garage.com / demo123</span>
          </div>

          <!-- Error -->
          <div v-if="authStore.error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
            <span class="flex-shrink-0">⚠</span> {{ authStore.error }}
          </div>

          <form @submit.prevent="submit" class="space-y-5">
            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Email address</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="you@example.com"
                @blur="v$.email.$touch()"
                :class="[
                  'w-full px-3.5 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2',
                  v$.email.$error ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-brand-300 focus:border-brand-400',
                ]"
              />
              <p v-if="fieldError('email')" class="mt-1 text-xs text-red-500">{{ fieldError('email') }}</p>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div class="relative">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  @blur="v$.password.$touch()"
                  :class="[
                    'w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2',
                    v$.password.$error ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-brand-300 focus:border-brand-400',
                  ]"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <Eye v-if="!showPassword" class="w-4 h-4" />
                  <EyeOff v-else class="w-4 h-4" />
                </button>
              </div>
              <p v-if="fieldError('password')" class="mt-1 text-xs text-red-500">{{ fieldError('password') }}</p>
            </div>

            <!-- Remember / Forgot -->
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" class="rounded border-slate-300 text-brand-500 focus:ring-brand-400" />
                Remember me
              </label>
              <a href="#" class="text-sm text-brand-600 hover:text-brand-700 font-medium">Forgot password?</a>
            </div>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="submitting"
              class="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-1 flex items-center justify-center gap-2"
            >
              <svg v-if="submitting" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {{ submitting ? 'Signing in...' : 'Sign in' }}
            </button>
          </form>
        </div>
      </div>

      <p class="mt-6 text-center text-xs text-slate-500">
        &copy; {{ new Date().getFullYear() }} GarageOS. All rights reserved.
      </p>
    </div>
  </div>
</template>
