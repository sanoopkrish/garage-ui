export default {
  mounted(el: HTMLElement, binding: { value: () => void }) {
    el.__clickOutsideHandler = (event: MouseEvent) => {
      if (!el.contains(event.target as Node)) {
        binding.value()
      }
    }
    document.addEventListener('click', el.__clickOutsideHandler)
  },
  unmounted(el: HTMLElement) {
    if (el.__clickOutsideHandler) {
      document.removeEventListener('click', el.__clickOutsideHandler)
    }
  },
}

declare global {
  interface HTMLElement {
    __clickOutsideHandler?: (event: MouseEvent) => void
  }
}
