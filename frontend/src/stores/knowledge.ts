import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { KnowledgeBase, Document } from '@/types'
import { knowledgeApi } from '@/api'

export const useKnowledgeStore = defineStore('knowledge', () => {
  const knowledgeBases = ref<KnowledgeBase[]>([])
  const currentKb = ref<KnowledgeBase | null>(null)
  const documents = ref<Document[]>([])

  const currentKnowledgeBase = computed(() => currentKb.value)

  function setKnowledgeBases(list: KnowledgeBase[]) {
    knowledgeBases.value = list
  }

  function setCurrentKb(kb: KnowledgeBase | null) {
    currentKb.value = kb
  }

  function setDocuments(docs: Document[]) {
    documents.value = docs
  }

  async function loadKnowledgeBases() {
    try {
      const data = await knowledgeApi.list()
      knowledgeBases.value = data.knowledge_bases || []
    } catch (error) {
      console.error('[KnowledgeStore] Load knowledge bases error:', error)
    }
  }

  async function createKnowledgeBase(name: string, description?: string) {
    try {
      await knowledgeApi.create(name, description)
      await loadKnowledgeBases()
    } catch (error) {
      console.error('[KnowledgeStore] Create knowledge base error:', error)
      throw error
    }
  }

  async function deleteKnowledgeBase(id: string) {
    try {
      await knowledgeApi.delete(id)
      await loadKnowledgeBases()
    } catch (error) {
      console.error('[KnowledgeStore] Delete knowledge base error:', error)
      throw error
    }
  }

  async function loadDocuments(kbId: string) {
    try {
      const data = await knowledgeApi.documents(kbId)
      documents.value = data.documents || []
    } catch (error) {
      console.error('[KnowledgeStore] Load documents error:', error)
    }
  }

  async function uploadDocument(kbId: string, file: File) {
    try {
      await knowledgeApi.uploadDocument(kbId, file)
      await loadDocuments(kbId)
      await loadKnowledgeBases()
    } catch (error) {
      console.error('[KnowledgeStore] Upload document error:', error)
      throw error
    }
  }

  async function deleteDocument(docId: string, kbId?: string) {
    try {
      await knowledgeApi.deleteDocument(docId)
      if (kbId) {
        await loadDocuments(kbId)
      }
      await loadKnowledgeBases()
    } catch (error) {
      console.error('[KnowledgeStore] Delete document error:', error)
      throw error
    }
  }

  return {
    knowledgeBases,
    currentKb,
    documents,
    currentKnowledgeBase,
    setKnowledgeBases,
    setCurrentKb,
    setDocuments,
    loadKnowledgeBases,
    createKnowledgeBase,
    deleteKnowledgeBase,
    loadDocuments,
    uploadDocument,
    deleteDocument,
  }
})
