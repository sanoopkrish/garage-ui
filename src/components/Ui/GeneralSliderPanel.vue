<template>
  <Teleport to="body">
  <!-- Slider Overlay -->
  <div
    v-if="modelValue"
    class="fixed inset-0 z-9999 overflow-hidden"
    @click="handleBackdropClick"
  >
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black transition-opacity duration-300"
      :class="{
        'bg-opacity-50': isVisible && !noBackdrop,
        'bg-opacity-0': !isVisible || noBackdrop
      }"
    ></div>
    
    <!-- Slider Panel -->
    <div
      class="absolute top-0 h-full bg-white dark:bg-dark-surface shadow-xl transition-transform duration-300 ease-in-out flex flex-col"
      :class="[
        sliderClasses,
        sizeClasses,
        {
          'translate-x-0': isVisible && position === 'right',
          'translate-x-full': !isVisible && position === 'right',
          '-translate-x-0': isVisible && position === 'left',
          '-translate-x-full': !isVisible && position === 'left'
        }
      ]"
    >
      <!-- Header -->
      <div 
        v-if="!hideHeader"
        class="flex items-center justify-between border-b border-slate-200 dark:border-dark-border px-6 py-4 flex-shrink-0"
        :class="headerClass"
      >
        <div class="flex items-center space-x-3">
          <!-- Icon Slot -->
          <div v-if="$slots.icon" class="flex-shrink-0">
            <slot name="icon"></slot>
          </div>
          
          <!-- Title and Subtitle -->
          <div>
            <h2 v-if="title" class="text-xl font-semibold text-slate-700 dark:text-slate-200">
              {{ title }}
            </h2>
            <slot v-else name="title"></slot>
            
            <p v-if="subtitle" class="text-sm text-slate-500 dark:text-slate-400">
              {{ subtitle }}
            </p>
            <slot v-else name="subtitle"></slot>
          </div>
        </div>
        
        <!-- Header Actions -->
        <div class="flex items-center space-x-2">
          <slot name="headerActions"></slot>
          
          <button
            v-if="!hideCloseButton"
            @click="handleClose"
            class="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-dark-border p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
            :aria-label="closeButtonLabel"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div 
        class="flex-1 overflow-y-auto"
        :class="[
          contentClass,
          { 'p-6': !noPadding }
        ]"
      >
        <slot></slot>
      </div>
      
      <!-- Footer -->
      <div 
        v-if="$slots.footer"
        class="border-t border-slate-200 dark:border-dark-border px-6 py-4 flex-shrink-0"
        :class="footerClass"
      >
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue';

interface Props {
  modelValue: boolean;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'left' | 'right';
  hideHeader?: boolean;
  hideCloseButton?: boolean;
  closeButtonLabel?: string;
  headerClass?: string;
  contentClass?: string;
  footerClass?: string;
  noBackdrop?: boolean;
  noPadding?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  persistent?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
  (e: 'open'): void;
  (e: 'beforeClose'): void;
  (e: 'afterClose'): void;
  (e: 'beforeOpen'): void;
  (e: 'afterOpen'): void;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  position: 'right',
  hideHeader: false,
  hideCloseButton: false,
  closeButtonLabel: 'Close',
  headerClass: '',
  contentClass: '',
  footerClass: '',
  noBackdrop: false,
  noPadding: false,
  closeOnBackdrop: true,
  closeOnEscape: true,
  persistent: false
});

const emit = defineEmits<Emits>();

const isVisible = ref(false);

// Computed classes
const sliderClasses = computed(() => {
  return {
    'right-0': props.position === 'right',
    'left-0': props.position === 'left'
  };
});

const sizeClasses = computed(() => {
  const sizeMap = {
    sm: 'w-80 max-w-sm',
    md: 'w-96 max-w-md',
    lg: 'w-full max-w-lg',
    xl: 'w-full max-w-2xl',
    full: 'w-full'
  };
  return sizeMap[props.size];
});

// Watch for visibility changes
watch(() => props.modelValue, async (newVal) => {
  if (newVal) {
    emit('beforeOpen');
    await nextTick();
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      isVisible.value = true;
      setTimeout(() => {
        emit('afterOpen');
      }, 300); // Match transition duration
    }, 10);
  } else {
    emit('beforeClose');
    isVisible.value = false;
    setTimeout(() => {
      emit('afterClose');
    }, 300); // Match transition duration
  }
}, { immediate: true });

// Methods
const handleClose = () => {
  if (props.persistent) return;
  
  isVisible.value = false;
  setTimeout(() => {
    emit('update:modelValue', false);
    emit('close');
  }, 300);
};

const handleBackdropClick = (event: MouseEvent) => {
  if (props.closeOnBackdrop && event.target === event.currentTarget) {
    handleClose();
  }
};

// Keyboard handling
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.closeOnEscape && props.modelValue) {
    handleClose();
  }
};

// Focus trap (basic implementation)
const trapFocus = (event: KeyboardEvent) => {
  if (!props.modelValue || event.key !== 'Tab') return;
  
  const slider = event.currentTarget as HTMLElement;
  const focusableElements = slider.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      lastElement?.focus();
      event.preventDefault();
    }
  } else {
    if (document.activeElement === lastElement) {
      firstElement?.focus();
      event.preventDefault();
    }
  }
};

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

// Expose methods for parent component
defineExpose({
  close: handleClose
});
</script>

<style scoped>
/* Additional styles for scroll behavior */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgb(156 163 175) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgb(156 163 175);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgb(107 114 128);
}
</style>