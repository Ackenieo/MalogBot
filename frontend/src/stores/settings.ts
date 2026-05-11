import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { webSearchApi } from '@/api'

export const useSettingsStore = defineStore('settings', () => {
  const webSearchEnabled = ref(false)
  const knowledgeBaseId = ref<string | null>(null)

  const currentKnowledgeBaseId = computed(() => knowledgeBaseId.value)

  function setWebSearchEnabled(value: boolean) {
    webSearchEnabled.value = value
  }

  function setKnowledgeBaseId(id: string | null) {
    knowledgeBaseId.value = id
  }

  async function loadWebSearchStatus() {
    try {
      const data = await webSearchApi.status()
      webSearchEnabled.value = data.enabled
    } catch (error) {
      console.error('[SettingsStore] Load web search status error:', error)
    }
  }

  async function toggleWebSearch(enabled: boolean) {
    try {
      await webSearchApi.toggle(enabled)
      webSearchEnabled.value = enabled
    } catch (error) {
      console.error('[SettingsStore] Toggle web search error:', error)
    }
  }

  return {
    webSearchEnabled,
    knowledgeBaseId,
    currentKnowledgeBaseId,
    setWebSearchEnabled,
    setKnowledgeBaseId,
    loadWebSearchStatus,
    toggleWebSearch,
  }
})
