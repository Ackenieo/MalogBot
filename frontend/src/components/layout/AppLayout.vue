<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useChatStore } from '@/stores/chat'
import { sessionApi } from '@/api'

const router = useRouter()
const chatStore = useChatStore()
const isSidebarCollapsed = ref(false)

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

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
    <aside
      :class="['sidebar-wrapper', { 'sidebar-collapsed': isSidebarCollapsed }]"
    >
      <AppSidebar
        class="flex-shrink-0"
        @new-chat="handleNewChat"
        @open-m-c-p="handleOpenMCP"
        @open-knowledge="handleOpenKnowledge"
        @select-session="handleSelectSession"
      />
    </aside>
    <button
      class="sidebar-toggle"
      :class="{ 'sidebar-toggle-collapsed': isSidebarCollapsed }"
      :title="isSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
      :aria-label="isSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
      @click="toggleSidebar"
    >
      <ChevronRight v-if="isSidebarCollapsed" class="w-4 h-4 toggle-icon" />
      <ChevronLeft v-else class="w-4 h-4 toggle-icon" />
    </button>
    <main class="main-content">
      <!-- 背景装饰 -->
      <div class="main-bg" aria-hidden="true">
        <div class="glow glow-purple" />
        <div class="glow glow-cyan" />
        <div class="glow glow-emerald" />
        <div class="grid-pattern" />
      </div>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  background: var(--bg-base);
  overflow: hidden;
}

.sidebar-wrapper {
  position: relative;
  width: 280px;
  flex-shrink: 0;
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1),
              margin 300ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.sidebar-wrapper.sidebar-collapsed {
  width: 0;
  min-width: 0;
  margin: 0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.sidebar-toggle {
  position: fixed;
  z-index: 100;
  top: 50%;
  left: 280px;
  transform: translateY(-50%);
  width: 20px;
  height: 48px;
  border: none;
  border-radius: 8px 0 0 8px;
  color: var(--text-dim);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-toggle:hover {
  color: var(--primary-400);
  transform: translateY(-50%) scale(1.05);
}

.sidebar-toggle:active {
  transform: translateY(-50%) scale(0.95);
}

.sidebar-toggle-collapsed {
  left: 0 !important;
  border-radius: 0 8px 8px 0;
}

.toggle-icon {
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-toggle:hover .toggle-icon {
  transform: scale(1.1);
}

/* 主内容背景装饰 */
.main-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.main-bg .glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(140px);
}

.main-bg .glow-purple {
  top: -20%;
  left: -10%;
  width: 600px;
  height: 600px;
  background: rgba(124, 58, 237, 0.15);
}

.main-bg .glow-cyan {
  top: 30%;
  right: -15%;
  width: 500px;
  height: 500px;
  background: rgba(6, 182, 212, 0.1);
}

.main-bg .glow-emerald {
  bottom: -20%;
  left: 30%;
  width: 450px;
  height: 450px;
  background: rgba(16, 185, 129, 0.08);
}

.main-bg .grid-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 60px 60px;
}
</style>
