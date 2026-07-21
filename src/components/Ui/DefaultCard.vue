<template>
  <div class="card p-0">
      <div class="border-b border-slate-200 py-4 px-7 dark:border-dark-border flex items-center justify-between">
          <h3 class="font-medium text-slate-800 dark:text-slate-100">{{ cardTitle }}</h3>
          <div class="header-right">
              <slot name="header-right"></slot>
          </div>
      </div>
      <div class="p-7">
          <slot></slot>
      </div>
  </div>
</template>
<script setup lang="ts">
defineProps({
  cardTitle: {
      type: String
  }
})
</script>