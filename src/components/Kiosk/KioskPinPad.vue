<script setup lang="ts">
// Ported from cms-ui components/Kiosk/KioskPinPad.vue. Change from Cara: PINs can be 4–6 digits,
// so instead of auto-submitting at 4 there is an Enter key (and auto-submit at the max length).
import { ref, computed, watch } from 'vue'
import { Delete, X, CornerDownLeft } from 'lucide-vue-next'

const props = defineProps<{ maxLength?: number; error?: string | null; isLoading?: boolean }>()
const emit = defineEmits<{ submit: [pin: string] }>()

const maxLen = computed(() => props.maxLength ?? 6)
const pin = ref('')
const dots = computed(() => ({ filled: pin.value.length, empty: Math.max(0, 4 - pin.value.length) }))

function submit() {
  if (pin.value.length < 4 || props.isLoading) return
  emit('submit', pin.value)
}
function addDigit(digit: string) {
  if (pin.value.length >= maxLen.value || props.isLoading) return
  pin.value += digit
  if (pin.value.length === maxLen.value) setTimeout(submit, 150)
}
function removeDigit() { pin.value = pin.value.slice(0, -1) }
function clear() { pin.value = '' }

// a wrong PIN clears the pad for the next try
watch(() => props.error, (error) => { if (error) clear() })
defineExpose({ clear })

const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']
</script>

<template>
  <div class="flex flex-col items-center gap-7">
    <div class="flex items-center gap-3 h-5">
      <span v-for="i in dots.filled" :key="'filled-' + i" class="h-4 w-4 rounded-full bg-white transition-all duration-150" />
      <span v-for="i in dots.empty" :key="'empty-' + i" class="h-4 w-4 rounded-full border-2 border-white/40 transition-all duration-150" />
    </div>

    <p class="text-sm text-red-400 text-center min-h-[20px]">{{ error }}</p>

    <div class="grid grid-cols-3 gap-4">
      <template v-for="btn in buttons" :key="btn">
        <button v-if="btn === 'clear'" :disabled="isLoading" aria-label="Clear" class="kiosk-pin-btn flex items-center justify-center rounded-full border-2 border-white/20 text-white/70 hover:border-white/40 hover:text-white active:bg-white/10 transition-all disabled:opacity-40" @click="clear">
          <X class="h-6 w-6" />
        </button>
        <button v-else-if="btn === 'back'" :disabled="isLoading" aria-label="Delete" class="kiosk-pin-btn flex items-center justify-center rounded-full border-2 border-white/20 text-white/70 hover:border-white/40 hover:text-white active:bg-white/10 transition-all disabled:opacity-40" @click="removeDigit">
          <Delete class="h-6 w-6" />
        </button>
        <button v-else :disabled="isLoading" class="kiosk-pin-btn flex items-center justify-center rounded-full border-2 border-white/30 text-white text-2xl font-semibold hover:bg-white/10 hover:border-white/50 active:bg-white/20 transition-all disabled:opacity-40" @click="addDigit(btn)">
          {{ btn }}
        </button>
      </template>
    </div>

    <button
      :disabled="pin.length < 4 || isLoading"
      class="w-full max-w-[290px] inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-lg font-semibold py-4 transition-colors disabled:opacity-30"
      @click="submit"
    >
      <CornerDownLeft class="h-5 w-5" /> {{ isLoading ? 'Checking…' : 'Enter' }}
    </button>
  </div>
</template>

<style scoped>
.kiosk-pin-btn {
  width: 80px;
  height: 80px;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}
@media (min-width: 768px) {
  .kiosk-pin-btn { width: 90px; height: 90px; }
}
</style>
