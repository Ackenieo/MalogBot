<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { AlertTriangle, RefreshCw } from 'lucide-vue-next'

const hasError = ref(false)
const errorMessage = ref('')

onErrorCaptured((err: Error) => {
  console.error('[ErrorBoundary] Caught error:', err)
  hasError.value = true
  errorMessage.value = err.message || '未知错误'
  return false
})

function handleRetry() {
  hasError.value = false
  errorMessage.value = ''
}
</script>

<template>
  <slot v-if="!hasError" />
  <div v-else class="error-boundary">
    <div class="error-content">
      <div class="error-icon">
        <AlertTriangle class="w-12 h-12" />
      </div>
      <h2 class="error-title">页面出现错误</h2>
      <p class="error-message">{{ errorMessage }}</p>
      <button class="error-retry-btn" @click="handleRetry">
        <RefreshCw class="w-4 h-4" />
        重试
      </button>
    </div>
  </div>
</template>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  padding: 32px;
}

.error-content {
  text-align: center;
  max-width: 400px;
}

.error-icon {
  color: var(--danger-400, #f87171);
  margin-bottom: 16px;
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #f3f4f6);
  margin-bottom: 8px;
}

.error-message {
  font-size: 14px;
  color: var(--text-muted, #9ca3af);
  margin-bottom: 24px;
  line-height: 1.6;
}

.error-retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 12px;
  background: var(--primary-600, #7c3aed);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms ease;
}

.error-retry-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
