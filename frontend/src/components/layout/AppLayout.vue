<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useChatStore } from '@/stores/chat'
import { sessionApi } from '@/api'

const router = useRouter()
const chatStore = useChatStore()

function handleNewChat() {
  chatStore.showWelcomeMode()
  router.push('/')
}

function handleOpenMCP() {
  router.push('/mcp')
}

function handleOpenKnowledge() {
  router.push('/knowledge')
}

async function handleSelectSession(sessionId: string) {
  try {
    await sessionApi.switch(sessionId)
    router.push({ name: 'chat-session', params: { sessionId } })
  } catch (error) {
    console.error('[AppLayout] Switch session error:', error)
  }
}
</script>

<template>
  <div class="app-container">
    <AppSidebar
      class="flex-shrink-0"
      @new-chat="handleNewChat"
      @open-m-c-p="handleOpenMCP"
      @open-knowledge="handleOpenKnowledge"
      @select-session="handleSelectSession"
    />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  background: var(--bg-base);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
