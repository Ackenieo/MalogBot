import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { chatApi, sessionApi, webSearchApi, teamApi } from '@/api'
import { useStream } from '@/composables/useStream'
import { generateId } from '@/utils'
import type { StreamEvent } from '@/types'

export function useChat() {
  const chatStore = useChatStore()
  const settingsStore = useSettingsStore()
  const { streamEvents, abort, createAbortController, reset } = useStream()

  const inputText = ref('')
  let teamPollingTimer: ReturnType<typeof setInterval> | null = null
  let accumulatedContent = ''

  async function sendMessage(content: string, isNewSession = false) {
    if (!content.trim()) return
    chatStore.setOriginalUserMessage(content)
    accumulatedContent = ''

    if (chatStore.onboardingMode) {
      await handleOnboardingReply(content)
      return
    }

    if (isNewSession || !chatStore.sessionId) {
      await createNewSession()
      if (settingsStore.knowledgeBaseId && chatStore.sessionId) {
        try {
          await sessionApi.setKnowledgeBase(chatStore.sessionId, settingsStore.knowledgeBaseId)
        } catch (e) {
          console.error('[useChat] Sync knowledge base error:', e)
        }
      }
    }

    chatStore.addMessage({
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    })
    inputText.value = ''
    chatStore.setStreaming(true)

    const controller = createAbortController()
    chatStore.setAbortController(controller)

    try {
      const response = await chatApi.stream(content, controller.signal)
      if (!response.ok) {
        chatStore.updateLastMessage(`请求失败: ${response.status} ${response.statusText}`)
        return
      }

      chatStore.addMessage({
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      })

      for await (const event of streamEvents(response)) {
        if (!chatStore.abortController) break
        handleStreamEvent(event)
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name !== 'AbortError') {
          chatStore.updateLastMessage(`发生错误: ${error.message}`)
        }
      } else {
        chatStore.updateLastMessage('发生错误，请重试')
      }
    } finally {
      chatStore.setStreaming(false)
      chatStore.setAbortController(null)
      reset()
    }

    await chatStore.loadSessions()
  }

  function handleStreamEvent(event: StreamEvent) {
    switch (event.type) {
      case 'content':
        if (typeof event.accumulated === 'string') {
          accumulatedContent = event.accumulated
          chatStore.updateLastMessage(accumulatedContent)
        } else if (typeof event.content === 'string') {
          accumulatedContent += event.content
          chatStore.updateLastMessage(accumulatedContent)
        }
        break

      case 'tool_result':
        if (typeof event.content === 'string') {
          accumulatedContent += '\n\n' + event.content
          chatStore.updateLastMessage(accumulatedContent)
        }
        break

      case 'cancelled':
        if (typeof event.content === 'string' && event.content) {
          chatStore.updateLastMessage(event.content)
        } else if (accumulatedContent) {
          chatStore.updateLastMessage(accumulatedContent)
        }
        break

      case 'confirmation_required':
      case 'dangerous_command':
        if (accumulatedContent) {
          chatStore.updateLastMessage(accumulatedContent)
        }
        chatStore.updateLastMessageAttachments({
          confirmation: {
            command: event.command || '',
            working_dir: event.working_dir || '',
            is_dangerous: event.is_dangerous || false,
            reason: event.reason || '',
            command_type: event.command_type || '',
            operation: event.operation || '',
          }
        })
        chatStore.setStreaming(false)
        chatStore.setAbortController(null)
        break

      case 'recursion_limit_reached':
      case 'context_limit_reached':
        if (accumulatedContent) {
          chatStore.updateLastMessage(accumulatedContent)
        }
        chatStore.updateLastMessageAttachments({
          recursionLimit: {
            message: (event.message as string) || '已达到最大执行步数限制',
            partial_output: (event.partial_output as string) || accumulatedContent,
          }
        })
        chatStore.setStreaming(false)
        chatStore.setAbortController(null)
        break

      case 'done':
        if (typeof event.content === 'string' && event.content) {
          chatStore.updateLastMessage(event.content)
        } else if (accumulatedContent) {
          chatStore.updateLastMessage(accumulatedContent)
        }
        {
          const lastMsg = chatStore.messages[chatStore.messages.length - 1]
          const isInTeamMode = lastMsg?.attachments?.teamPhase !== undefined
          if (!isInTeamMode) {
            stopTeamPolling()
            chatStore.setTeamPhase(undefined)
          }
        }
        break

      case 'error':
        {
          const errorMsg = (event.content as string) || (event.output as string) || '发生错误'
          if (accumulatedContent) {
            chatStore.updateLastMessage(accumulatedContent + '\n\n❌ ' + errorMsg)
          } else {
            chatStore.updateLastMessage('❌ ' + errorMsg)
          }
        }
        break

      case 'onboarding_required':
        if (typeof event.message === 'string') {
          chatStore.updateLastMessage(event.message)
        }
        chatStore.setStreaming(false)
        chatStore.setOnboardingMode(true)
        break

      case 'team_mode_start':
        chatStore.setTeamPhase('running')
        chatStore.updateTeamStatus({
          status: 'active',
          total_tasks: (event.total_tasks as number) || 0,
          parallel_groups: (event.parallel_groups as number) || 0,
          completed: 0,
          in_progress: 0,
          tasks: [],
          complexity_score: ((event.decision as Record<string, unknown>)?.complexity_score as number) || undefined,
        })
        startTeamPolling()
        break

      case 'team_start':
        chatStore.setTeamPhase('running')
        chatStore.updateTeamStatus({
          status: 'active',
          total_tasks: (event.total_tasks as number) || 0,
          parallel_groups: (event.parallel_groups as number) || 0,
          completed: 0,
          in_progress: 0,
          tasks: [],
        })
        break

      case 'group_start':
      case 'task_complete':
      case 'group_complete':
      case 'task_decomposition':
        break

      case 'team_integrating':
        stopTeamPolling()
        chatStore.setTeamPhase('integrating')
        break

      case 'single_agent_mode':
        stopTeamPolling()
        chatStore.setTeamPhase(undefined)
        break

      case 'team_progress':
        {
          const stage = event.stage as string
          if (stage === 'start') {
            chatStore.setTeamPhase('running')
            chatStore.updateTeamStatus({
              status: 'active',
              total_tasks: (event.total_tasks as number) || 0,
              parallel_groups: (event.parallel_groups as number) || 0,
              completed: 0,
              in_progress: 0,
              tasks: [],
            })
          } else if (stage === 'group_start') {
            const lastMessage = chatStore.messages[chatStore.messages.length - 1]
            if (lastMessage?.attachments?.teamPhase !== 'running') {
              chatStore.setTeamPhase('running')
            }
          } else if (stage === 'integrating') {
            stopTeamPolling()
            chatStore.setTeamPhase('integrating')
          }
        }
        break

      case 'team_integrating_content':
        stopTeamPolling()
        chatStore.setTeamPhase('integrating')
        if (typeof event.accumulated === 'string') {
          chatStore.setIntegratingContent(event.accumulated)
          chatStore.updateLastMessage(event.accumulated)
        } else if (typeof event.content === 'string') {
          chatStore.setIntegratingContent(event.content)
        }
        break

      case 'team_complete':
        stopTeamPolling()
        if (typeof event.content === 'string') {
          chatStore.updateLastMessage(event.content)
        }
        chatStore.setTeamPhase('done')
        break

      default:
        if (typeof event.content === 'string') {
          accumulatedContent += event.content
          chatStore.updateLastMessage(accumulatedContent)
        }
    }
  }

  function startTeamPolling() {
    if (teamPollingTimer) {
      clearInterval(teamPollingTimer)
    }
    pollTeamStatus()
    teamPollingTimer = setInterval(pollTeamStatus, 500)
  }

  async function pollTeamStatus() {
    try {
      const data = await teamApi.status()
      if (data.team_status) {
        chatStore.updateTeamStatus(data.team_status)
        if (data.team_status.total_tasks > 0 && data.team_status.tasks && data.team_status.tasks.length > 0) {
          const lastMessage = chatStore.messages[chatStore.messages.length - 1]
          if (lastMessage?.attachments?.teamPhase === 'init') {
            chatStore.setTeamPhase('running')
          }
        }
        if (data.team_status.status === 'completed') {
          stopTeamPolling()
        }
      }
    } catch (e) {
      console.error('[useChat] Team polling error:', e)
    }
  }

  function stopTeamPolling() {
    if (teamPollingTimer) {
      clearInterval(teamPollingTimer)
      teamPollingTimer = null
    }
  }

  async function handleConfirm(command: string, userMessage: string) {
    chatStore.clearLastMessageConfirmation()
    chatStore.setStreaming(true)
    accumulatedContent = ''

    const controller = createAbortController()
    chatStore.setAbortController(controller)

    try {
      const response = await chatApi.confirm(command, userMessage, controller.signal)
      chatStore.addMessage({
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      })
      for await (const event of streamEvents(response)) {
        if (!chatStore.abortController) break
        handleStreamEvent(event)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        chatStore.updateLastMessage('执行命令失败: ' + error.message)
      }
    } finally {
      chatStore.setStreaming(false)
      chatStore.setAbortController(null)
      reset()
    }

    await chatStore.loadSessions()
  }

  async function handleCancel(command: string, userMessage: string) {
    chatStore.clearLastMessageConfirmation()
    chatStore.setStreaming(true)
    accumulatedContent = ''

    const controller = createAbortController()
    chatStore.setAbortController(controller)

    try {
      const response = await chatApi.cancel(command, userMessage, controller.signal)
      chatStore.addMessage({
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      })
      for await (const event of streamEvents(response)) {
        if (!chatStore.abortController) break
        handleStreamEvent(event)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        chatStore.updateLastMessage('取消命令失败')
      }
    } finally {
      chatStore.setStreaming(false)
      chatStore.setAbortController(null)
      reset()
    }
  }

  async function handleContinue() {
    chatStore.updateLastMessageAttachments({ recursionLimit: undefined })
    chatStore.setStreaming(true)
    accumulatedContent = ''

    const controller = createAbortController()
    chatStore.setAbortController(controller)

    try {
      const response = await chatApi.continue(controller.signal)
      for await (const event of streamEvents(response)) {
        if (!chatStore.abortController) break
        handleStreamEvent(event)
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        chatStore.updateLastMessage('继续执行失败')
      }
    } finally {
      chatStore.setStreaming(false)
      chatStore.setAbortController(null)
      reset()
    }

    await chatStore.loadSessions()
  }

  async function handleOnboardingReply(message: string) {
    chatStore.setOnboardingMode(false)
    chatStore.addMessage({
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    })
    inputText.value = ''
    chatStore.setStreaming(true)

    try {
      const data = await chatApi.onboardingReply(message)
      chatStore.setStreaming(false)

      if (data.type === 'response') {
        chatStore.addMessage({
          id: generateId(),
          role: 'assistant',
          content: data.output || '',
          timestamp: new Date().toISOString()
        })
      } else if (data.type === 'onboarding_required' && data.need_retry) {
        chatStore.addMessage({
          id: generateId(),
          role: 'assistant',
          content: data.message || '',
          timestamp: new Date().toISOString()
        })
        chatStore.setOnboardingMode(true)
      } else if (data.type === 'error') {
        chatStore.addMessage({
          id: generateId(),
          role: 'assistant',
          content: '错误: ' + (data.output || '未知错误'),
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      chatStore.setStreaming(false)
      chatStore.addMessage({
        id: generateId(),
        role: 'assistant',
        content: '发生错误，请重试',
        timestamp: new Date().toISOString()
      })
    }
  }

  async function createNewSession() {
    try {
      const data = await sessionApi.create()
      if (data.session_id) {
        chatStore.setSessionId(data.session_id)
        chatStore.clearMessages()
        if (settingsStore.webSearchEnabled) {
          await toggleWebSearch(true)
        }
      }
    } catch (error) {
      console.error('[useChat] Create session error:', error)
    }
  }

  async function stopGeneration() {
    if (chatStore.abortController) {
      try {
        await chatApi.stop()
      } catch (e) {
        console.error('[useChat] Stop request error:', e)
      }
      abort()
    }
    stopTeamPolling()
    chatStore.setStreaming(false)
    chatStore.setAbortController(null)
  }

  async function toggleWebSearch(enabled?: boolean) {
    const newValue = enabled ?? !settingsStore.webSearchEnabled
    settingsStore.setWebSearchEnabled(newValue)
    if (chatStore.sessionId) {
      try {
        await webSearchApi.toggle(newValue)
      } catch (e) {
        console.error('[useChat] Toggle web search error:', e)
      }
    }
  }

  return {
    inputText,
    sendMessage,
    handleConfirm,
    handleCancel,
    handleContinue,
    stopGeneration,
    toggleWebSearch,
    startTeamPolling,
    stopTeamPolling,
  }
}
