import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Session } from '@/types'
import { sessionApi } from '@/api'

export const useChatStore = defineStore('chat', () => {
  const sessionId = ref<string | null>(null)
  const sessions = ref<Session[]>([])
  const isWelcomeMode = ref(true)
  const messages = ref<import('@/types').Message[]>([])
  const isStreaming = ref(false)
  const abortController = ref<AbortController | null>(null)
  const originalUserMessage = ref('')
  const onboardingMode = ref(false)

  const currentSession = computed(() =>
    sessions.value.find(s => s.session_id === sessionId.value)
  )

  function setSessionId(id: string | null) {
    sessionId.value = id
    isWelcomeMode.value = id === null
  }

  function setSessions(list: Session[]) {
    sessions.value = list
  }

  function showWelcomeMode() {
    isWelcomeMode.value = true
    sessionId.value = null
  }

  function showChatMode() {
    isWelcomeMode.value = false
  }

  function addMessage(message: import('@/types').Message) {
    messages.value.push(message)
  }

  function updateLastMessage(content: string) {
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content = content
    }
  }

  function updateLastMessageAttachments(attachments: Partial<import('@/types').MessageAttachments>) {
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      if (!lastMessage.attachments) {
        lastMessage.attachments = {}
      }
      Object.assign(lastMessage.attachments, attachments)
    }
  }

  function clearLastMessageConfirmation() {
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.attachments) {
      lastMessage.attachments.confirmation = undefined
    }
  }

  function updateTeamStatus(status: import('@/types').TeamStatus | undefined) {
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      if (!lastMessage.attachments) {
        lastMessage.attachments = {}
      }
      lastMessage.attachments = {
        ...lastMessage.attachments,
        teamStatus: status
      }
    }
  }

  function setTeamPhase(phase: 'init' | 'running' | 'integrating' | 'done' | undefined) {
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      if (!lastMessage.attachments) {
        lastMessage.attachments = {}
      }
      lastMessage.attachments = {
        ...lastMessage.attachments,
        teamPhase: phase
      }
    }
  }

  function setIntegratingContent(content: string | undefined) {
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      if (!lastMessage.attachments) {
        lastMessage.attachments = {}
      }
      lastMessage.attachments = {
        ...lastMessage.attachments,
        integratingContent: content
      }
    }
  }

  function clearMessages() {
    messages.value = []
  }

  function setStreaming(value: boolean) {
    isStreaming.value = value
  }

  function setAbortController(controller: AbortController | null) {
    abortController.value = controller
  }

  function setOriginalUserMessage(message: string) {
    originalUserMessage.value = message
  }

  function setOnboardingMode(value: boolean) {
    onboardingMode.value = value
  }

  async function loadSessions() {
    try {
      const data = await sessionApi.list()
      setSessions(data.sessions || [])
      if (data.current_session_id) {
        setSessionId(data.current_session_id)
      }
    } catch (error) {
      console.error('[ChatStore] Load sessions error:', error)
    }
  }

  async function createSession() {
    try {
      const data = await sessionApi.create()
      setSessionId(data.session_id)
      showChatMode()
      return data.session_id
    } catch (error) {
      console.error('[ChatStore] Create session error:', error)
      return null
    }
  }

  async function deleteSession(id: string) {
    try {
      await sessionApi.delete(id)
      await loadSessions()
      if (sessionId.value === id) {
        showWelcomeMode()
        clearMessages()
      }
    } catch (error) {
      console.error('[ChatStore] Delete session error:', error)
    }
  }

  async function switchSession(id: string) {
    try {
      await sessionApi.switch(id)
      setSessionId(id)
      showChatMode()
    } catch (error) {
      console.error('[ChatStore] Switch session error:', error)
    }
  }

  async function loadSessionMessages(id: string) {
    try {
      const data = await sessionApi.info(id)
      messages.value = data.messages || []
    } catch (error) {
      console.error('[ChatStore] Load session messages error:', error)
    }
  }

  return {
    sessionId,
    sessions,
    isWelcomeMode,
    messages,
    isStreaming,
    abortController,
    originalUserMessage,
    onboardingMode,
    currentSession,
    setSessionId,
    setSessions,
    showWelcomeMode,
    showChatMode,
    addMessage,
    updateLastMessage,
    updateLastMessageAttachments,
    clearLastMessageConfirmation,
    updateTeamStatus,
    setTeamPhase,
    setIntegratingContent,
    clearMessages,
    setStreaming,
    setAbortController,
    setOriginalUserMessage,
    setOnboardingMode,
    loadSessions,
    createSession,
    deleteSession,
    switchSession,
    loadSessionMessages,
  }
})
