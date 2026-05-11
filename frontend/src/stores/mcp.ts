import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MCPServer, MCPStats } from '@/types'
import { mcpApi } from '@/api'

export const useMcpStore = defineStore('mcp', () => {
  const servers = ref<MCPServer[]>([])
  const stats = ref<MCPStats>({
    total_services: 0,
    enabled_services: 0,
    connected_services: 0,
    error_services: 0,
    total_tools: 0,
  })
  const isLoading = ref(false)

  const enabledServers = computed(() => servers.value.filter(s => s.enabled))
  const connectedServers = computed(() => servers.value.filter(s => s.status === 'connected'))

  function setServers(list: MCPServer[]) {
    servers.value = list
  }

  function setStats(data: MCPStats) {
    stats.value = data
  }

  async function loadServers() {
    isLoading.value = true
    try {
      const data = await mcpApi.list()
      servers.value = data.servers || []
      stats.value = data.stats || stats.value
    } catch (error) {
      console.error('[McpStore] Load servers error:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function createServer(data: Partial<MCPServer>) {
    try {
      await mcpApi.create(data)
      await loadServers()
    } catch (error) {
      console.error('[McpStore] Create server error:', error)
      throw error
    }
  }

  async function updateServer(name: string, data: Partial<MCPServer>) {
    try {
      await mcpApi.update(name, data)
      await loadServers()
    } catch (error) {
      console.error('[McpStore] Update server error:', error)
      throw error
    }
  }

  async function deleteServer(name: string) {
    try {
      await mcpApi.delete(name)
      await loadServers()
    } catch (error) {
      console.error('[McpStore] Delete server error:', error)
      throw error
    }
  }

  async function enableServer(name: string) {
    try {
      await mcpApi.enable(name)
      await loadServers()
    } catch (error) {
      console.error('[McpStore] Enable server error:', error)
    }
  }

  async function disableServer(name: string) {
    try {
      await mcpApi.disable(name)
      await loadServers()
    } catch (error) {
      console.error('[McpStore] Disable server error:', error)
    }
  }

  async function testServer(name: string) {
    try {
      return await mcpApi.test(name)
    } catch (error) {
      console.error('[McpStore] Test server error:', error)
      throw error
    }
  }

  async function refreshServer(name: string) {
    try {
      return await mcpApi.refresh(name)
    } catch (error) {
      console.error('[McpStore] Refresh server error:', error)
      throw error
    }
  }

  async function refreshAll() {
    try {
      return await mcpApi.refreshAll()
    } catch (error) {
      console.error('[McpStore] Refresh all error:', error)
      throw error
    }
  }

  async function importConfig(config: unknown) {
    try {
      const result = await mcpApi.importConfig(config)
      await loadServers()
      return result
    } catch (error) {
      console.error('[McpStore] Import config error:', error)
      throw error
    }
  }

  async function exportConfig() {
    try {
      return await mcpApi.exportConfig()
    } catch (error) {
      console.error('[McpStore] Export config error:', error)
      throw error
    }
  }

  return {
    servers,
    stats,
    isLoading,
    enabledServers,
    connectedServers,
    setServers,
    setStats,
    loadServers,
    createServer,
    updateServer,
    deleteServer,
    enableServer,
    disableServer,
    testServer,
    refreshServer,
    refreshAll,
    importConfig,
    exportConfig,
  }
})
