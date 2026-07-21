import { ref, watch } from 'vue'

const dark = ref(localStorage.getItem('theme') === 'dark')

watch(dark, (val) => {
  document.documentElement.classList.toggle('dark', val)
  localStorage.setItem('theme', val ? 'dark' : 'light')
}, { immediate: true })

export function useDarkMode() {
  const toggle = () => { dark.value = !dark.value }
  return { dark, toggle }
}
