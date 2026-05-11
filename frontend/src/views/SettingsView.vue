<script setup lang="ts">
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { webSearchApi } from '@/api'
import { Globe, ArrowLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
const chatStore = useChatStore()
const settingsStore = useSettingsStore()

async function toggleWebSearch() {
  const newValue = !settingsStore.webSearchEnabled
  settingsStore.setWebSearchEnabled(newValue)
  if (chatStore.sessionId) {
    try {
      await webSearchApi.toggle(newValue)
    } catch (error) {
      console.error('[SettingsView] Toggle web search error:', error)
      settingsStore.setWebSearchEnabled(!newValue)
    }
  }
}
</script>

<template>
  <div class="settings-page">
    <header class="settings-header">
      <button class="back-btn" @click="router.push('/')">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h1 class="settings-title">设置</h1>
    </header>

    <div class="settings-content">
      <section class="settings-section">
        <h2 class="section-title">功能设置</h2>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">
              <Globe class="w-4 h-4" />
              联网搜索
            </div>
            <p class="setting-desc">启用后，AI 将使用网络搜索获取最新信息</p>
          </div>
          <label class="toggle">
            <input type="checkbox" :checked="settingsStore.webSearchEnabled" class="sr-only" @change="toggleWebSearch" />
            <span class="toggle-track" :class="{ 'toggle-track-on': settingsStore.webSearchEnabled }">
              <span class="toggle-thumb" :class="{ 'toggle-thumb-on': settingsStore.webSearchEnabled }" />
            </span>
          </label>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  height: 100vh;
  overflow-y: auto;
  background: var(--bg-base, #0a0e1a);
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-dim);
  transition: all 200ms ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
}

.settings-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.settings-content {
  padding: 24px;
  max-width: 640px;
}

.settings-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-faint);
  margin-bottom: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.setting-info {
  flex: 1;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 12px;
  color: var(--text-faint);
}

.toggle {
  position: relative;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle-track {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: var(--text-faint);
  transition: background 200ms ease;
}

.toggle-track-on {
  background: var(--primary-600, #7c3aed);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 200ms ease;
}

.toggle-thumb-on {
  transform: translateX(20px);
}
</style>
