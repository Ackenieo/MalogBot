<script setup lang="ts">
import { ref, computed, nextTick, watch, onUnmounted, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Globe, BookOpen, Send, Square, Bot } from 'lucide-vue-next'
import MessageList from '@/components/chat/MessageList.vue'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { useKnowledgeStore } from '@/stores/knowledge'
import { useChat } from '@/composables/useChat'
import { sessionApi } from '@/api'

const route = useRoute()
const chatStore = useChatStore()
const settingsStore = useSettingsStore()
const knowledgeStore = useKnowledgeStore()

const {
  inputText,
  sendMessage,
  handleConfirm,
  handleCancel,
  handleContinue,
  stopGeneration,
  toggleWebSearch,
  stopTeamPolling,
} = useChat()

const messageListRef = ref<HTMLElement | null>(null)

function loadSessionFromRoute() {
  const sessionId = route.params.sessionId as string
  if (sessionId && sessionId !== chatStore.sessionId) {
    chatStore.switchSession(sessionId)
    chatStore.loadSessionMessages(sessionId)
  }
}

onMounted(() => {
  loadSessionFromRoute()
})

watch(() => route.params.sessionId, (newId) => {
  if (newId) {
    loadSessionFromRoute()
  }
})

const selectedKnowledgeBase = computed({
  get: () => settingsStore.knowledgeBaseId || '',
  set: (value: string) => {
    settingsStore.setKnowledgeBaseId(value || null)
    if (chatStore.sessionId) {
      sessionApi.setKnowledgeBase(chatStore.sessionId, value || null).catch(console.error)
    }
  },
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSend() {
  const text = inputText.value.trim()
  if (text && !chatStore.isStreaming) {
    sendMessage(text, false)
  }
}

onUnmounted(() => {
  stopTeamPolling()
})

watch(() => chatStore.messages, () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}, { deep: true })
</script>

<template>
  <div class="chat-view">
    <div class="chat-bg" aria-hidden="true">
      <div class="glow glow-purple" />
      <div class="glow glow-cyan" />
    </div>

    <header class="chat-header">
      <div class="header-icon">
        <Bot class="w-4 h-4" />
      </div>
      <h1 class="header-title">MalogBot</h1>
      <span class="header-badge">AI 助手</span>
    </header>

    <MessageList
      ref="messageListRef"
      :messages="chatStore.messages"
      :is-streaming="chatStore.isStreaming"
      @confirm="handleConfirm"
      @cancel="handleCancel"
      @continue="handleContinue"
    />

    <footer class="chat-footer">
      <div class="input-bar">
        <button
          class="option-btn"
          :class="{ 'option-btn-active': settingsStore.webSearchEnabled }"
          @click="() => toggleWebSearch()"
        >
          <Globe class="w-4 h-4" />
          <span>联网搜索</span>
          <label class="toggle">
            <input type="checkbox" :checked="settingsStore.webSearchEnabled" class="sr-only" @change="() => toggleWebSearch()" />
            <span class="toggle-track" :class="{ 'toggle-track-on': settingsStore.webSearchEnabled }">
              <span class="toggle-thumb" :class="{ 'toggle-thumb-on': settingsStore.webSearchEnabled }" />
            </span>
          </label>
        </button>

        <div class="option-btn">
          <BookOpen class="w-4 h-4" />
          <select
            v-model="selectedKnowledgeBase"
            class="kb-select"
          >
            <option value="">不使用知识库</option>
            <option v-for="kb in knowledgeStore.knowledgeBases" :key="kb.id" :value="kb.id">
              {{ kb.name }} ({{ kb.document_count }}个文档)
            </option>
          </select>
        </div>

        <div class="input-group">
          <input
            v-model="inputText"
            type="text"
            class="input-field"
            :class="{ 'input-field-focused': inputText }"
            placeholder="输入消息..."
            autocomplete="off"
            :disabled="chatStore.isStreaming"
            @keydown="handleKeydown"
          />
          <button
            v-if="!chatStore.isStreaming"
            class="send-btn"
            :disabled="!inputText.trim()"
            @click="handleSend"
          >
            <Send class="w-4 h-4" />
          </button>
          <button
            v-else
            class="stop-btn"
            @click="stopGeneration"
          >
            <Square class="w-3.5 h-3.5" />
            <span>停止</span>
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.chat-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: var(--bg-base);
}

.chat-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(130px);
}

.glow-purple {
  top: -80px;
  right: -64px;
  width: 400px;
  height: 400px;
  background: rgba(124, 58, 237, 0.1);
}

.glow-cyan {
  bottom: -64px;
  left: -64px;
  width: 350px;
  height: 350px;
  background: rgba(6, 182, 212, 0.06);
}

.chat-header {
  position: relative;
  z-index: 10;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-icon {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-brand);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
  color: white;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.header-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 9999px;
  background: rgba(124, 58, 237, 0.12);
  color: var(--primary-300);
  border: 1px solid rgba(124, 58, 237, 0.2);
}

.chat-footer {
  position: relative;
  z-index: 10;
  padding: 12px 24px;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.input-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  max-width: 900px;
  margin: 0 auto;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text-dim);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms var(--ease-default);
}

.option-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}

.option-btn-active {
  background: rgba(124, 58, 237, 0.12);
  border-color: rgba(124, 58, 237, 0.25);
  color: var(--primary-300);
}

.kb-select {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  outline: none;
  max-width: 150px;
  appearance: none;
  padding-right: 4px;
}

.toggle {
  position: relative;
  width: 36px;
  height: 20px;
  cursor: pointer;
}

.toggle-track {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: var(--text-faint);
  transition: background 200ms var(--ease-default);
}

.toggle-track-on {
  background: var(--primary-600);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  box-shadow: var(--shadow-sm);
  transition: transform 200ms var(--ease-default);
}

.toggle-thumb-on {
  transform: translateX(16px);
}

.input-group {
  flex: 1;
  display: flex;
  gap: 10px;
  min-width: 220px;
}

.input-field {
  flex: 1;
  padding: 14px 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-size: 15px;
  transition: all 200ms var(--ease-default);
}

.input-field::placeholder {
  color: var(--text-faint);
}

.input-field-focused,
.input-field:focus {
  border-color: rgba(139, 92, 246, 0.35);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.1);
}

.send-btn {
  padding: 14px 20px;
  border-radius: 14px;
  background: var(--gradient-brand);
  color: white;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms var(--ease-default);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stop-btn {
  padding: 14px 20px;
  border-radius: 14px;
  background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
  color: white;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 200ms var(--ease-default);
}

.stop-btn:hover {
  transform: translateY(-2px);
}
</style>
