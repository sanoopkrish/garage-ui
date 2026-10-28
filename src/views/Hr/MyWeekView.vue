<script setup lang="ts">
import DefaultLayout from '@/components/Layout/DefaultLayout.vue'
import UiPageHeader from '@/components/Ui/UiPageHeader.vue'
import MyWeekPanel from '@/components/Hr/MyWeekPanel.vue'
</script>

<template>
  <DefaultLayout>
    <UiPageHeader title="My Week" subtitle="Your attendance for the week — check it and submit for approval." />
    <div class="max-w-2xl">
      <MyWeekPanel />
    </div>
  </DefaultLayout>
</template>
