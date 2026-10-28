<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/** One pin — where a piece of kit was last placed / seen */
const props = defineProps<{ lat: number; lng: number; label: string }>()
const containerEl = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null

function pin(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="background:#f97316;color:#fff;font-size:11px;font-weight:600;padding:3px 8px;border-radius:12px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">${props.label}</div>`,
    iconAnchor: [20, 12],
  })
}
function render() {
  if (!map) return
  if (marker) marker.remove()
  marker = L.marker([props.lat, props.lng], { icon: pin() }).addTo(map)
  map.setView([props.lat, props.lng], 15)
}
onMounted(() => {
  if (!containerEl.value) return
  map = L.map(containerEl.value, { scrollWheelZoom: false }).setView([props.lat, props.lng], 15)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map)
  render()
  setTimeout(() => map?.invalidateSize(), 150) // the slider is still animating open
})
watch(() => [props.lat, props.lng], render)
onBeforeUnmount(() => { map?.remove(); map = null })
</script>

<template>
  <div ref="containerEl" class="h-56 rounded-lg overflow-hidden border border-slate-200 dark:border-dark-border" />
</template>
