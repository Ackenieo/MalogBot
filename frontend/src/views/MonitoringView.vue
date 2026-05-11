<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, AlertTriangle, Info, CheckCircle, Activity, Database, Search, Clock } from 'lucide-vue-next'

const router = useRouter()

interface BootstrapStats {
  count: number
  avg_usage_ratio: number
  avg_avg_score: number
  avg_items: number
  avg_used_tokens: number
  max_usage_ratio: number
  min_usage_ratio: number
  token_distribution: Record<string, number>
}

interface RetrievalStats {
  count: number
  avg_time_ms: number
  avg_score: number
  avg_result_count: number
  p50_time_ms: number
  p95_time_ms: number
  p99_time_ms: number
}

interface KnowledgeMetrics {
  total_items: number
  total_documents: number
  total_chunks: number
  avg_chunk_size: number
  embedding_coverage: number
}

interface Alert {
  level: string
  type: string
  message: string
  timestamp: string
  details: Record<string, any>
}

const bootstrapStats = ref<BootstrapStats | null>(null)
const retrievalStats = ref<RetrievalStats | null>(null)
const knowledgeMetrics = ref<KnowledgeMetrics | null>(null)
const alerts = ref<Alert[]>([])
const isLoading = ref(false)
const timeWindow = ref(24)

async function loadData() {
  isLoading.value = true
  try {
    const [bootstrapRes, retrievalRes, knowledgeRes, alertsRes] = await Promise.all([
      fetch(`/monitoring/bootstrap?hours=${timeWindow.value}`).then(r => r.json()),
      fetch(`/monitoring/retrieval?hours=${timeWindow.value}`).then(r => r.json()),
      fetch('/monitoring/knowledge').then(r => r.json()),
      fetch(`/monitoring/alerts?limit=20`).then(r => r.json()),
    ])

    if (bootstrapRes.status === 'ok') bootstrapStats.value = bootstrapRes.bootstrap_stats
    if (retrievalRes.status === 'ok') retrievalStats.value = retrievalRes.retrieval_stats
    if (knowledgeRes.status === 'ok') knowledgeMetrics.value = knowledgeRes.knowledge_metrics
    if (alertsRes.status === 'ok') alerts.value = alertsRes.alerts
  } catch (error) {
    console.error('[Monitoring] Load data error:', error)
  } finally {
    isLoading.value = false
  }
}

function getAlertIcon(level: string) {
  switch (level) {
    case 'warning': return AlertTriangle
    case 'error': return AlertTriangle
    case 'info': return Info
    default: return CheckCircle
  }
}

function getAlertColor(level: string) {
  switch (level) {
    case 'warning': return 'var(--warning-400)'
    case 'error': return 'var(--danger-400)'
    case 'info': return 'var(--cyan-400)'
    default: return 'var(--success-400)'
  }
}

function formatTime(timestamp: string) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(() => loadData())
</script>

<template>
  <div class="monitoring-page">
    <header class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="router.push('/')">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div class="title-icon" style="background: linear-gradient(135deg, #10B981, #06B6D4);">
          <Activity class="w-4 h-4" />
        </div>
        <h2 class="page-title">健康监控</h2>
      </div>
      <div class="header-right">
        <select v-model="timeWindow" class="time-select" @change="loadData">
          <option :value="1">最近 1 小时</option>
          <option :value="6">最近 6 小时</option>
          <option :value="24">最近 24 小时</option>
          <option :value="72">最近 3 天</option>
        </select>
        <button class="btn-icon" @click="loadData" :disabled="isLoading">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </header>

    <div class="page-body">
      <!-- 知识库状态 -->
      <section v-if="knowledgeMetrics" class="metric-section">
        <h3 class="section-title">
          <Database class="w-4 h-4" />
          知识库状态
        </h3>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-value">{{ knowledgeMetrics.total_documents }}</div>
            <div class="metric-label">文档数</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ knowledgeMetrics.total_chunks }}</div>
            <div class="metric-label">分块数</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ knowledgeMetrics.total_items }}</div>
            <div class="metric-label">知识条目</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ knowledgeMetrics.embedding_coverage?.toFixed(1) }}%</div>
            <div class="metric-label">向量化覆盖率</div>
          </div>
        </div>
      </section>

      <!-- Bootstrap 加载指标 -->
      <section v-if="bootstrapStats && bootstrapStats.count > 0" class="metric-section">
        <h3 class="section-title">
          <Activity class="w-4 h-4" />
          Bootstrap 加载
        </h3>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-value">{{ bootstrapStats.count }}</div>
            <div class="metric-label">加载次数</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ (bootstrapStats.avg_usage_ratio * 100).toFixed(1) }}%</div>
            <div class="metric-label">平均使用率</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ bootstrapStats.avg_items.toFixed(0) }}</div>
            <div class="metric-label">平均加载条目</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ bootstrapStats.avg_used_tokens.toFixed(0) }}</div>
            <div class="metric-label">平均 Token 数</div>
          </div>
        </div>
      </section>

      <!-- 检索指标 -->
      <section v-if="retrievalStats && retrievalStats.count > 0" class="metric-section">
        <h3 class="section-title">
          <Search class="w-4 h-4" />
          检索性能
        </h3>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-value">{{ retrievalStats.count }}</div>
            <div class="metric-label">检索次数</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ retrievalStats.avg_time_ms.toFixed(0) }}ms</div>
            <div class="metric-label">平均耗时</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ retrievalStats.avg_score.toFixed(2) }}</div>
            <div class="metric-label">平均相关度</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ retrievalStats.avg_result_count.toFixed(0) }}</div>
            <div class="metric-label">平均结果数</div>
          </div>
        </div>
      </section>

      <!-- 告警列表 -->
      <section class="metric-section">
        <h3 class="section-title">
          <AlertTriangle class="w-4 h-4" />
          告警记录
        </h3>
        <div v-if="alerts.length === 0" class="empty-alerts">
          <CheckCircle class="w-8 h-8" />
          <span>暂无告警</span>
        </div>
        <div v-else class="alerts-list">
          <div v-for="(alert, index) in alerts" :key="index" class="alert-item" :style="{ borderLeftColor: getAlertColor(alert.level) }">
            <component :is="getAlertIcon(alert.level)" class="alert-icon" :style="{ color: getAlertColor(alert.level) }" />
            <div class="alert-content">
              <div class="alert-message">{{ alert.message }}</div>
              <div class="alert-meta">
                <Clock class="w-3 h-3" />
                <span>{{ formatTime(alert.timestamp) }}</span>
                <span class="alert-type">{{ alert.type }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.monitoring-page {
  height: 100vh;
  overflow-y: auto;
  background: var(--bg-base);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
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

.title-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.time-select {
  padding: 6px 32px 6px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}

.time-select option {
  background: #1a1a2e;
  color: var(--text-primary);
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-icon:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-body {
  padding: 24px;
  max-width: 1000px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.metric-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.metric-label {
  font-size: 12px;
  color: var(--text-muted);
}

.empty-alerts {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: var(--success-400);
  font-size: 14px;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border-left: 3px solid;
}

.alert-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 2px;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.alert-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-faint);
}

.alert-type {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 11px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
