import { ref } from 'vue'
import { AIFeatureType } from '@/types/generated/enums/ai'
import { getMyAIConfiguration, type AIConfiguration } from '@/api/ai.api'

// Cached once per session — AI availability doesn't change mid-session
let loaded = false
let loadPromise: Promise<void> | null = null
const config = ref<AIConfiguration | null>(null)

/** Which AI features may this company's UI show? (Server enforces regardless.) */
export function useAiFeatures() {
  if (!loaded && !loadPromise) {
    loadPromise = getMyAIConfiguration()
      .then((c) => {
        config.value = c
      })
      .catch(() => {
        config.value = null
      })
      .finally(() => {
        loaded = true
      })
  }

  function hasFeature(feature: AIFeatureType): boolean {
    const c = config.value
    return !!c && c.available !== false && c.enabled && !!c.features?.[feature]
  }

  return { config, hasFeature, ready: loadPromise }
}

export { AIFeatureType }
