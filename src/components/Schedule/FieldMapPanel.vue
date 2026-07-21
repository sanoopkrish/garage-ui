<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-vue-next'
import { getLivePositions, type LivePosition } from '@/api/ram-tracking.api'

const containerEl = ref<HTMLElement | null>(null)
const positions = ref<LivePosition[]>([])
const unavailable = ref(false)
const lastUpdated = ref<Date | null>(null)

let map: L.Map | null = null
let markers: L.Marker[] = []
let refreshInterval: ReturnType<typeof setInterval> | null = null

/** Brand-orange dot marker — avoids Leaflet's bundler-unfriendly default icons */
function vanIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
      <span style="background:#0f172a;color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:9999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">${label}</span>
      <span style="width:14px;height:14px;background:#f97316;border:3px solid #fff;border-radius:9999px;box-shadow:0 1px 4px rgba(0,0,0,.4);margin-top:2px"></span>
    </div>`,
    iconSize: [0, 0],
  })
}

function render() {
  if (!map) return
  markers.forEach((m) => m.remove())
  markers = positions.value.map((p) => {
    const label = p.technicianName ?? p.registration
    const marker = L.marker([p.lat, p.lng], { icon: vanIcon(label) }).addTo(map!)
    marker.bindPopup(
      `<strong>${p.registration}</strong>${p.makeModel ? ` · ${p.makeModel}` : ''}<br>` +
      `${p.technicianName ?? 'Unmapped van'}<br>` +
      `<span style="color:#64748b">${p.lastEvent ?? ''} ${p.lastEventAt ? new Date(p.lastEventAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}</span>`,
    )
    return marker
  })
}

async function refresh(fitBounds = false) {
  try {
    positions.value = await getLivePositions()
    unavailable.value = false
    lastUpdated.value = new Date()
    render()
    if (fitBounds && positions.value.length && map) {
      map.fitBounds(L.latLngBounds(positions.value.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 13 })
    }
  } catch {
    // Not configured / RAM unreachable — hide the panel content quietly
    unavailable.value = true
  }
}

onMounted(async () => {
  if (!containerEl.value) return
  map = L.map(containerEl.value, { scrollWheelZoom: false }).setView([52.04, -0.76], 11)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)
  await refresh(true)
  refreshInterval = setInterval(() => refresh(), 30_000)
})

onBeforeUnmount(() => {
  if (refreshInterval) clearInterval(refreshInterval)
  map?.remove()
  map = null
})
</script>

<template>
  <div class="card !p-0 overflow-hidden">
    <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-dark-border">
      <h3 class="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
        <MapPin class="w-5 h-5 text-brand-500" /> Field map
      </h3>
      <span v-if="lastUpdated && !unavailable" class="text-xs text-slate-400">
        {{ positions.length }} van{{ positions.length === 1 ? '' : 's' }} · updated {{ lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}
      </span>
    </div>
    <div v-if="unavailable" class="px-5 py-8 text-sm text-slate-400 text-center">
      Live tracking unavailable — connect RAM Tracking under Settings → Integrations.
    </div>
    <div v-show="!unavailable" ref="containerEl" class="h-96 w-full z-0"></div>
  </div>
</template>
