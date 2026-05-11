<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Home, AlertTriangle } from 'lucide-vue-next'

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <div class="not-found-icon">
        <AlertTriangle class="w-16 h-16" />
      </div>
      <h1 class="not-found-title">404</h1>
      <p class="not-found-subtitle">页面未找到</p>
      <p class="not-found-desc">您访问的页面不存在，请检查 URL 是否正确</p>
      <button class="not-found-btn" @click="goHome">
        <Home class="w-4 h-4" />
        返回首页
      </button>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--bg-base, #0a0e1a);
}

.not-found-content {
  text-align: center;
  padding: 32px;
}

.not-found-icon {
  color: var(--primary-400, #a78bfa);
  margin-bottom: 24px;
  opacity: 0.6;
}

.not-found-title {
  font-size: 6rem;
  font-weight: 700;
  background: linear-gradient(135deg, #C4B5FD, #67E8F9);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
  margin-bottom: 8px;
}

.not-found-subtitle {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary, #f3f4f6);
  margin-bottom: 8px;
}

.not-found-desc {
  font-size: 14px;
  color: var(--text-muted, #9ca3af);
  margin-bottom: 32px;
}

.not-found-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 14px;
  background: var(--gradient-brand, linear-gradient(135deg, #7c3aed, #06b6d4));
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms ease;
}

.not-found-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);
}
</style>
