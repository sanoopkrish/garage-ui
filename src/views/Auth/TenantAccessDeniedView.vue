<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ShieldX } from 'lucide-vue-next'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-dark-bg flex items-center justify-center px-4">
    <div class="max-w-md w-full text-center">
      <div class="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <ShieldX class="w-8 h-8 text-red-500" />
      </div>
      <h1 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Access Denied</h1>
      <p class="text-slate-500 dark:text-slate-400 mb-8">
        You don't have access to this workspace. Please check the URL or contact your administrator.
      </p>
      <button
        @click="router.push('/auth/login')"
        class="inline-flex items-center justify-center px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Back to Login
      </button>
    </div>
  </div>
</template>
