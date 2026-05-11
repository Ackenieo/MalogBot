<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Trash2, Eye, BookOpen, Upload, FileText, Plus } from 'lucide-vue-next'
import { useKnowledgeStore } from '@/stores/knowledge'
import { useSettingsStore } from '@/stores/settings'
import type { KnowledgeBase } from '@/types'

const router = useRouter()
const knowledgeStore = useKnowledgeStore()
const settingsStore = useSettingsStore()

const newKbName = ref('')
const newKbDesc = ref('')
const currentKb = ref<KnowledgeBase | null>(null)
const documents = ref<import('@/types').Document[]>([])

async function handleCreate() {
  const name = newKbName.value.trim()
  if (!name) {
    alert('请输入知识库名称')
    return
  }
  try {
    await knowledgeStore.createKnowledgeBase(name, newKbDesc.value.trim())
    newKbName.value = ''
    newKbDesc.value = ''
  } catch (error) {
    alert('创建失败')
  }
}

async function handleDelete(kbId: string) {
  if (!confirm('确定要删除这个知识库吗？所有文档将被删除。')) return
  try {
    await knowledgeStore.deleteKnowledgeBase(kbId)
    if (settingsStore.knowledgeBaseId === kbId) {
      settingsStore.setKnowledgeBaseId(null)
    }
  } catch (error) {
    console.error('[KnowledgeManager] Delete error:', error)
  }
}

async function handleViewDocuments(kb: KnowledgeBase) {
  try {
    currentKb.value = kb
    await knowledgeStore.loadDocuments(kb.id)
    documents.value = knowledgeStore.documents
  } catch (error) {
    console.error('[KnowledgeManager] Load documents error:', error)
  }
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !currentKb.value) return
  try {
    await knowledgeStore.uploadDocument(currentKb.value.id, file)
    alert('上传成功！')
  } catch (error) {
    alert('上传失败')
  }
  input.value = ''
}

async function handleDeleteDocument(docId: string) {
  if (!confirm('确定要删除这个文档吗？')) return
  try {
    await knowledgeStore.deleteDocument(docId, currentKb.value?.id)
  } catch (error) {
    console.error('[KnowledgeManager] Delete document error:', error)
  }
}

function handleBack() {
  currentKb.value = null
  documents.value = []
}
</script>

<template>
  <div class="knowledge-page">
    <header class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="router.push('/')">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div class="title-icon">
          <BookOpen class="w-4 h-4" />
        </div>
        <h2 class="page-title">知识库管理</h2>
      </div>
    </header>

    <div class="page-body">
      <template v-if="currentKb">
        <button class="nav-back-btn" @click="handleBack">
          <ArrowLeft class="w-4 h-4" />
          返回知识库列表
        </button>

        <h3 class="section-title">{{ currentKb.name }} - 文档列表</h3>

        <label class="upload-btn">
          <Upload class="w-4 h-4" />
          上传文档
          <input type="file" accept=".txt,.md,.json,.csv,.pdf,.doc,.docx" class="hidden" @change="handleUpload" />
        </label>

        <div v-if="documents.length === 0" class="empty-state">
          <FileText class="w-12 h-12 mb-3 opacity-50" />
          <span>暂无文档</span>
        </div>
        <div v-else class="doc-list">
          <div v-for="doc in documents" :key="doc.id" class="doc-item">
            <div class="doc-info">
              <div class="doc-name">{{ doc.filename }}</div>
              <div class="doc-meta">{{ doc.chunk_count }} 个片段 · {{ doc.status }}</div>
            </div>
            <button class="btn-danger-sm" @click="handleDeleteDocument(doc.id)">
              删除
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="create-form">
          <input
            v-model="newKbName"
            type="text"
            placeholder="知识库名称"
            class="form-input flex-1"
          />
          <input
            v-model="newKbDesc"
            type="text"
            placeholder="描述（可选）"
            class="form-input flex-[2]"
          />
          <button class="btn-primary" @click="handleCreate">
            <Plus class="w-4 h-4 mr-1" />
            创建
          </button>
        </div>

        <div v-if="knowledgeStore.knowledgeBases.length === 0" class="empty-state">
          <BookOpen class="w-12 h-12 mb-3 opacity-50" />
          <span>暂无知识库</span>
        </div>

        <div v-else class="kb-list">
          <div v-for="kb in knowledgeStore.knowledgeBases" :key="kb.id" class="kb-card">
            <div class="kb-header">
              <div class="kb-info">
                <div class="kb-name">{{ kb.name }}</div>
                <div class="kb-meta">{{ kb.document_count }} 个文档 · {{ kb.chunk_count }} 个片段</div>
              </div>
              <div class="kb-actions">
                <button class="btn-secondary-sm" @click="handleViewDocuments(kb)">
                  <Eye class="w-3.5 h-3.5" />
                  查看文档
                </button>
                <button class="btn-danger-sm" @click="handleDelete(kb.id)">
                  <Trash2 class="w-3.5 h-3.5" />
                  删除
                </button>
              </div>
            </div>
            <div v-if="kb.description" class="kb-desc">
              {{ kb.description }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.knowledge-page {
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
  background: var(--gradient-brand);
  color: white;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-body {
  padding: 24px;
  max-width: 800px;
}

.nav-back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--primary-300);
  transition: color 150ms var(--ease-default);
}

.nav-back-btn:hover {
  color: var(--primary-400);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 14px;
  background: rgba(124, 58, 237, 0.12);
  border: 1px solid rgba(124, 58, 237, 0.2);
  color: var(--primary-300);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 200ms var(--ease-default);
}

.upload-btn:hover {
  background: rgba(124, 58, 237, 0.18);
}

.create-form {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.form-input {
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-size: 14px;
  transition: all 200ms var(--ease-default);
}

.form-input::placeholder {
  color: var(--text-faint);
}

.form-input:focus {
  border-color: rgba(139, 92, 246, 0.35);
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.doc-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 200ms var(--ease-default);
}

.doc-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.doc-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-secondary);
}

.doc-meta {
  font-size: 12px;
  color: var(--text-faint);
  margin-top: 2px;
}

.kb-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kb-card {
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 200ms var(--ease-default);
}

.kb-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
}

.kb-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kb-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-secondary);
}

.kb-meta {
  font-size: 12px;
  color: var(--text-faint);
  margin-top: 4px;
}

.kb-actions {
  display: flex;
  gap: 8px;
}

.kb-desc {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.15);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.btn-secondary-sm {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  transition: all 150ms var(--ease-default);
}

.btn-secondary-sm:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

.btn-danger-sm {
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.15);
  color: var(--danger-400);
  font-size: 12px;
  font-weight: 500;
  transition: all 150ms var(--ease-default);
}

.btn-danger-sm:hover {
  background: rgba(239, 68, 68, 0.15);
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
</style>
