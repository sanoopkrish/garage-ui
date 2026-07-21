<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, email, minLength } from '@vuelidate/validators'
import { useAuthStore } from '@/stores/auth'
import { useValidation } from '@/composables/useValidation'
import { Gauge, Eye, EyeOff } from 'lucide-vue-next'

const authStore = useAuthStore()

const form = reactive({ email: '', password: '' })
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
    await authStore.login(form.email, form.password, '/field')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Brand -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 mb-4">
          <Gauge class="w-9 h-9 text-white" />
        </div>
        <h1 class="text-white font-bold text-2xl tracking-tight">GarageOS <span class="text-brand-400">Field</span></h1>
        <p class="text-slate-400 text-sm mt-1">Field engineer sign in</p>
      </div>

      <!-- Card -->
      <div class="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl overflow-hidden">
        <div class="h-1.5 bg-gradient-to-r from-brand-500 to-amber-400" />
        <div class="px-6 py-8">
          <div v-if="authStore.error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
            <span class="flex-shrink-0">⚠</span> {{ authStore.error }}
          </div>

          <form @submit.prevent="submit" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email address</label>
              <input
                v-model="form.email"
                type="email"
                autocomplete="username"
                placeholder="you@example.com"
                @blur="v$.email.$touch()"
                :class="[
                  'w-full px-3.5 py-3 text-base rounded-lg border transition-colors focus:outline-none focus:ring-2 dark:bg-dark-bg dark:text-slate-100',
                  v$.email.$error ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 dark:border-dark-border focus:ring-brand-300 focus:border-brand-400',
                ]"
              />
              <p v-if="fieldError('email')" class="mt-1 text-xs text-red-500">{{ fieldError('email') }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div class="relative">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  @blur="v$.password.$touch()"
                  :class="[
                    'w-full px-3.5 py-3 text-base rounded-lg border transition-colors focus:outline-none focus:ring-2 pr-11 dark:bg-dark-bg dark:text-slate-100',
                    v$.password.$error ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 dark:border-dark-border focus:ring-brand-300 focus:border-brand-400',
                  ]"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                >
                  <EyeOff v-if="showPassword" class="w-5 h-5" />
                  <Eye v-else class="w-5 h-5" />
                </button>
              </div>
              <p v-if="fieldError('password')" class="mt-1 text-xs text-red-500">{{ fieldError('password') }}</p>
            </div>

            <button
              type="submit"
              :disabled="submitting"
              class="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-lg disabled:opacity-60 transition-colors"
            >
              {{ submitting ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>
        </div>
      </div>

      <p class="text-center text-slate-500 text-xs mt-6">
        Office staff? <router-link to="/auth/login" class="text-brand-400 hover:underline">Sign in here</router-link>
      </p>
    </div>
  </div>
</template>
