<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Plus, RefreshCw, Download, Upload, Trash2, TestTube, Plug, Zap, Globe, Radio, Terminal, X } from 'lucide-vue-next'
import { useMcpStore } from '@/stores/mcp'

const router = useRouter()
const mcpStore = useMcpStore()

const showAddModal = ref(false)
const formData = ref({
  name: '',
  display_name: '',
  transport_type: 'streamable-http' as 'streamable-http' | 'http' | 'sse' | 'stdio',
  url: '',
  command: '',
  args: '',
  description: '',
  category: '',
})
const isSubmitting = ref(false)

onMounted(() => mcpStore.loadServers())

function openAddModal() {
  showAddModal.value = true
  formData.value = {
    name: '',
    display_name: '',
    transport_type: 'streamable-http',
    url: '',
    command: '',
    args: '',
    description: '',
    category: '',
  }
}

function closeAddModal() {
  showAddModal.value = false
}

async function handleSubmit() {
  if (!formData.value.name) {
    alert('请输入服务名称')
    return
  }
  if (formData.value.transport_type !== 'stdio' && !formData.value.url) {
    alert('请输入服务 URL')
    return
  }
  if (formData.value.transport_type === 'stdio' && !formData.value.command) {
    alert('请输入启动命令')
    return
  }

  isSubmitting.value = true
  try {
    const payload: Record<string, any> = {
      name: formData.value.name,
      transport_type: formData.value.transport_type,
      display_name: formData.value.display_name || formData.value.name,
      description: formData.value.description,
      category: formData.value.category,
    }

    if (formData.value.transport_type !== 'stdio') {
      payload.url = formData.value.url
    } else {
      payload.command = formData.value.command
      if (formData.value.args) {
        payload.args = formData.value.args.split(' ').filter(Boolean)
      }
    }

    await mcpStore.createServer(payload)
    closeAddModal()
    alert('服务添加成功！')
  } catch (error) {
    console.error('[MCPManager] Create server error:', error)
    alert('添加服务失败')
  } finally {
    isSubmitting.value = false
  }
}

async function handleToggle(name: string, enabled: boolean) {
  try {
    if (enabled) {
      await mcpStore.enableServer(name)
    } else {
      await mcpStore.disableServer(name)
    }
  } catch (error) {
    console.error('[MCPManager] Toggle error:', error)
  }
}

async function handleTest(name: string) {
  try {
    const data = await mcpStore.testServer(name)
    if (data.success) {
      alert(`连接成功！发现 ${data.tools_count} 个工具`)
      await mcpStore.loadServers()
    } else {
      alert(`连接失败: ${data.message}`)
    }
  } catch (error) {
    console.error('[MCPManager] Test error:', error)
    alert('测试失败')
  }
}

async function handleRefresh(name: string) {
  try {
    await mcpStore.refreshServer(name)
    alert('刷新成功')
  } catch (error) {
    alert('刷新失败')
  }
}

async function handleRefreshAll() {
  try {
    await mcpStore.refreshAll()
    alert('全部刷新完成')
  } catch (error) {
    alert('刷新失败')
  }
}

async function handleDelete(name: string) {
  if (!confirm(`确定要删除服务 "${name}" 吗？`)) return
  try {
    await mcpStore.deleteServer(name)
  } catch (error) {
    alert('删除失败')
  }
}

async function handleExport() {
  try {
    const data = await mcpStore.exportConfig()
    const blob = new Blob([JSON.stringify(data.config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mcp_servers_config.json'
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    alert('导出失败')
  }
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const config = JSON.parse(text)
      const data = await mcpStore.importConfig(config)
      alert(`导入完成: 成功 ${data.success_count} 个，失败 ${data.fail_count} 个`)
    } catch (error) {
      alert('导入失败')
    }
  }
  input.click()
}

function getTypeInfo(type: string): { icon: any; label: string; gradient: string } {
  const map: Record<string, { icon: any; label: string; gradient: string }> = {
    'streamable-http': {
      icon: Zap,
      label: 'Streamable HTTP',
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.2))'
    },
    http: {
      icon: Globe,
      label: 'HTTP',
      gradient: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(52,211,153,0.15))'
    },
    sse: {
      icon: Radio,
      label: 'SSE',
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(251,191,36,0.15))'
    },
    stdio: {
      icon: Terminal,
      label: 'STDIO',
      gradient: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))'
    }
  }
  return map[type] || { icon: Plug, label: type, gradient: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))' }
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    enabled: '#10B981',
    connected: '#06B6D4',
    error: '#EF4444',
    disabled: '#6B7280'
  }
  return colors[status] || '#6B7280'
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    enabled: '已启用',
    connected: '已连接',
    error: '连接错误',
    disabled: '已禁用'
  }
  return texts[status] || status
}
</script>

<template>
  <div class="mcp-page">
    <header class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="router.push('/')">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div class="title-icon" style="background: linear-gradient(135deg, #8B5CF6, #6366F1);">
          <Plug class="w-4 h-4" />
        </div>
        <h2 class="page-title">MCP 服务管理</h2>
      </div>
    </header>

    <div class="page-body">
      <div class="action-bar">
        <button class="btn-primary" @click="openAddModal">
          <Plus class="w-4 h-4" />
          添加服务
        </button>
        <button class="btn-secondary" @click="handleRefreshAll">
          <RefreshCw class="w-4 h-4" />
          刷新全部
        </button>
        <button class="btn-secondary" @click="handleImport">
          <Upload class="w-4 h-4" />
          导入配置
        </button>
        <button class="btn-secondary" @click="handleExport">
          <Download class="w-4 h-4" />
          导出配置
        </button>
      </div>

      <div v-if="mcpStore.stats" class="stats-bar">
        <span>总服务: <strong>{{ mcpStore.stats.total_services }}</strong></span>
        <span class="stat-success">已启用: {{ mcpStore.stats.enabled_services }}</span>
        <span class="stat-info">已连接: {{ mcpStore.stats.connected_services }}</span>
        <span class="stat-danger">错误: {{ mcpStore.stats.error_services }}</span>
        <span>工具总数: <strong>{{ mcpStore.stats.total_tools }}</strong></span>
      </div>

      <div v-if="mcpStore.servers.length === 0" class="empty-state">
        <Plug class="w-12 h-12 mb-3 opacity-50" />
        <span>暂无 MCP 服务</span>
        <span class="text-xs mt-1 block opacity-70">点击"添加服务"注册新的 MCP 服务</span>
      </div>

      <div v-else class="server-list">
        <div v-for="server in mcpStore.servers" :key="server.name" class="server-card">
          <div class="server-header" :class="{ 'server-disabled': !server.enabled }">
            <div class="server-main">
              <div class="server-icon" :style="{ background: getTypeInfo(server.transport_type).gradient }">
                <component :is="getTypeInfo(server.transport_type).icon" class="w-5 h-5 text-white" />
              </div>
              <div class="server-info">
                <div class="server-name">
                  {{ server.display_name || server.name }}
                  <span v-if="!server.enabled" class="disabled-badge">已禁用</span>
                </div>
                <div class="server-meta">
                  <span>{{ getTypeInfo(server.transport_type).label }}</span>
                  <span class="separator">|</span>
                  <span>{{ server.tools_count || 0 }} 个工具</span>
                  <span
                    class="status-badge"
                    :style="{
                      color: getStatusColor(server.status),
                      background: `${getStatusColor(server.status)}15`,
                      borderColor: `${getStatusColor(server.status)}30`
                    }"
                  >
                    {{ getStatusText(server.status) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="server-actions">
              <button class="btn-icon-sm" title="测试连接" @click="handleTest(server.name)">
                <TestTube class="w-3.5 h-3.5" />
              </button>
              <button class="btn-icon-sm" title="刷新工具" @click="handleRefresh(server.name)">
                <RefreshCw class="w-3.5 h-3.5" />
              </button>
              <button
                :class="server.enabled ? 'btn-warning-sm' : 'btn-success-sm'"
                @click="handleToggle(server.name, !server.enabled)"
              >
                {{ server.enabled ? '禁用' : '启用' }}
              </button>
              <button class="btn-icon-sm" title="删除" @click="handleDelete(server.name)">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div v-if="server.description" class="server-desc">
            {{ server.description }}
          </div>
          <div v-if="server.last_error" class="server-error">
            错误: {{ server.last_error }}
          </div>
        </div>
      </div>
    </div>

    <!-- 添加服务弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">添加 MCP 服务</h3>
          <button class="modal-close" @click="closeAddModal">
            <X class="w-4 h-4" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">服务名称 <span class="required">*</span></label>
            <input v-model="formData.name" class="form-input" placeholder="例如: tavily-search" />
          </div>
          <div class="form-group">
            <label class="form-label">显示名称</label>
            <input v-model="formData.display_name" class="form-input" placeholder="可选，默认使用服务名称" />
          </div>
          <div class="form-group">
            <label class="form-label">传输类型 <span class="required">*</span></label>
            <select v-model="formData.transport_type" class="form-input">
              <option value="streamable-http">Streamable HTTP</option>
              <option value="http">HTTP</option>
              <option value="sse">SSE</option>
              <option value="stdio">STDIO</option>
            </select>
          </div>
          <div v-if="formData.transport_type !== 'stdio'" class="form-group">
            <label class="form-label">服务 URL <span class="required">*</span></label>
            <input v-model="formData.url" class="form-input" placeholder="https://example.com/mcp" />
          </div>
          <div v-if="formData.transport_type === 'stdio'" class="form-group">
            <label class="form-label">启动命令 <span class="required">*</span></label>
            <input v-model="formData.command" class="form-input" placeholder="npx" />
          </div>
          <div v-if="formData.transport_type === 'stdio'" class="form-group">
            <label class="form-label">命令参数</label>
            <input v-model="formData.args" class="form-input" placeholder="-y @modelcontextprotocol/server-tavily" />
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="formData.description" class="form-input form-textarea" placeholder="服务描述（可选）"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">分类</label>
            <input v-model="formData.category" class="form-input" placeholder="例如: search" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeAddModal">取消</button>
          <button class="btn-primary" :disabled="isSubmitting" @click="handleSubmit">
            {{ isSubmitting ? '添加中...' : '确认添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mcp-page {
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

.page-body {
  padding: 24px;
  max-width: 900px;
}

.action-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stats-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  gap-y: 4px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(124, 58, 237, 0.06);
  border: 1px solid rgba(124, 58, 237, 0.1);
  font-size: 13px;
  color: var(--text-muted);
}

.stats-bar strong {
  color: var(--text-secondary);
}

.stat-success { color: var(--success-400); }
.stat-info { color: var(--cyan-400); }
.stat-danger { color: var(--danger-400); }

.server-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.server-card {
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 200ms var(--ease-default);
}

.server-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
}

.server-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.server-disabled {
  background: rgba(0, 0, 0, 0.15);
}

.server-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.server-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.server-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.disabled-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-faint);
}

.server-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-faint);
}

.separator { color: rgba(255, 255, 255, 0.15); }

.status-badge {
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid;
}

.server-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.server-desc {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.15);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.server-error {
  padding: 10px 16px;
  font-size: 12px;
  color: var(--danger-400);
  background: rgba(239, 68, 68, 0.06);
  border-top: 1px solid rgba(239, 68, 68, 0.1);
}

.btn-icon-sm {
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: var(--text-muted);
  transition: all 150ms var(--ease-default);
}

.btn-icon-sm:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

.btn-warning-sm {
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: var(--warning-400);
  font-size: 12px;
  font-weight: 500;
  transition: all 150ms var(--ease-default);
}

.btn-warning-sm:hover {
  background: rgba(245, 158, 11, 0.15);
}

.btn-success-sm {
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: var(--success-400);
  font-size: 12px;
  font-weight: 500;
  transition: all 150ms var(--ease-default);
}

.btn-success-sm:hover {
  background: rgba(16, 185, 129, 0.15);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  color: var(--text-faint);
  text-align: center;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 150ms ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal {
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
  animation: slideUp 200ms ease;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 150ms ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.required {
  color: var(--danger-400);
}

.form-input {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: all 150ms ease;
}

.form-input:focus {
  border-color: rgba(139, 92, 246, 0.5);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.form-input::placeholder {
  color: var(--text-faint);
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

select.form-input {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

select.form-input option {
  background: #1a1a2e;
  color: var(--text-primary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
