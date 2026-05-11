import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { teamApi } from '@/api'

export function useTeamPolling() {
  const chatStore = useChatStore()
  const isPolling = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  function start(interval = 500) {
    stop()
    isPolling.value = true
    poll()
    timer = setInterval(poll, interval)
  }

  async function poll() {
    try {
      const data = await teamApi.status()
      if (data.team_status) {
        chatStore.updateTeamStatus(data.team_status)

        if (data.team_status.total_tasks > 0 && data.team_status.tasks?.length > 0) {
          const lastMessage = chatStore.messages[chatStore.messages.length - 1]
          if (lastMessage?.attachments?.teamPhase === 'init') {
            chatStore.setTeamPhase('running')
          }
        }

        if (data.team_status.status === 'completed') {
          stop()
        }
      }
    } catch (e) {
      console.error('[useTeamPolling] Error:', e)
    }
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    isPolling.value = false
  }

  return {
    isPolling,
    start,
    stop,
  }
}
