import { ref } from 'vue'
import { AIFeatureType } from '@/types/generated/enums/ai'
import { getMyAIConfiguration, type AIConfiguration } from '@/api/ai.api'

/**
 * AI availability for the current company.
 *
 * Previously cached once per browser session, which meant switching a feature on
 * (owner → Companies → AI) did nothing for users already logged in until they
 * reloaded. Now the config is refetched when it is older than STALE_MS, so a
 * change shows up on the next screen that asks for it.
 */
const STALE_MS = 60_000

let loadedAt = 0
let loadPromise: Promise<void> | null = null
const config = ref<AIConfiguration | null>(null)

function load(): Promise<void> {
  if (loadPromise) return loadPromise
  loadPromise = getMyAIConfiguration()
    .then((c) => {
      config.value = c
    })
    .catch(() => {
      config.value = null
    })
    .finally(() => {
      loadedAt = Date.now()
      loadPromise = null
    })
  return loadPromise
}

/** Force a refetch — call after saving AI settings so the same session picks them up. */
export function refreshAiFeatures(): Promise<void> {
  loadedAt = 0
  return load()
}

/** Which AI features may this company's UI show? (Server enforces regardless.) */
export function useAiFeatures() {
  const ready = Date.now() - loadedAt > STALE_MS ? load() : Promise.resolve()

  function hasFeature(feature: AIFeatureType): boolean {
    const c = config.value
    return !!c && c.available !== false && c.enabled && !!c.features?.[feature]
  }

  return { config, hasFeature, ready }
}

export { AIFeatureType }
