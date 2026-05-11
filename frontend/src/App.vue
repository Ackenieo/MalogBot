<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from './components/layout/AppLayout.vue'
import ErrorBoundary from './components/common/ErrorBoundary.vue'
import { useChatStore } from './stores/chat'
import { useSettingsStore } from './stores/settings'
import { useKnowledgeStore } from './stores/knowledge'
import { sessionApi } from './api'
import { generateId } from './utils'

const router = useRouter()
const chatStore = useChatStore()
const settingsStore = useSettingsStore()
const knowledgeStore = useKnowledgeStore()

onMounted(async () => {
  console.log('[App] Initializing application...')
  await loadSessions()
  await loadKnowledgeBases()
  await loadWebSearchStatus()
})

async function loadSessions() {
  try {
    console.log('[App] Loading sessions...')
    const data = await sessionApi.list()
    chatStore.setSessions(data.sessions || [])

    if (data.current_session_id) {
      const currentSession = data.sessions?.find(
        (s) => s.session_id === data.current_session_id
      )
      if (currentSession && currentSession.message_count > 0) {
        chatStore.setSessionId(data.current_session_id)

        await loadSessionHistory(data.current_session_id)
        router.replace({ name: 'chat-session', params: { sessionId: data.current_session_id } })
        console.log('[App] Restored session:', data.current_session_id)
      }
    }
  } catch (error) {
    console.error('[App] Load sessions error:', error)
  }
}

async function loadSessionHistory(sessionId: string) {
  try {
    console.log('[App] Loading session history for:', sessionId)
    chatStore.clearMessages()
    const infoData = await sessionApi.info(sessionId)
    if (infoData.messages && Array.isArray(infoData.messages)) {
      const displayMessages = infoData.messages.filter(
        (msg: { role: string }) => msg.role === 'user' || msg.role === 'assistant'
      )
      displayMessages.forEach((msg: { role: string; content: string; timestamp?: string }) => {
        chatStore.addMessage({
          id: generateId(),
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
        })
      })
      console.log('[App] Loaded', displayMessages.length, 'messages')
    }
  } catch (error) {
    console.error('[App] Load session history error:', error)
  }
}

async function loadKnowledgeBases() {
  try {
    console.log('[App] Loading knowledge bases...')
    await knowledgeStore.loadKnowledgeBases()
  } catch (error) {
    console.error('[App] Load knowledge bases error:', error)
  }
}

async function loadWebSearchStatus() {
  try {
    const { webSearchApi } = await import('./api')
    const data = await webSearchApi.status()
    settingsStore.setWebSearchEnabled(data.enabled || false)
  } catch (error) {
    console.error('[App] Load web search status error:', error)
  }
}
</script>

<template>
  <ErrorBoundary>
    <AppLayout />
  </ErrorBoundary>
</template>
