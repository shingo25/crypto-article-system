import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '@/lib/stores/workspaceStore'
import { apiClient } from '@/lib/api'
import { mockTopics } from '@/lib/mockData'
import toast from 'react-hot-toast'

export function useTopics() {
  const { topics, setTopics } = useWorkspaceStore()
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const loadTopics = async (isRefresh = false) => {
    try {
      setIsLoading(true)
      const currentOffset = isRefresh ? 0 : offset
      
      // 実際のAPIからトピックを取得
      const response = await apiClient.getTopics({
        limit: 20,
        offset: currentOffset,
        sortBy: 'created_at'
      })

      const newTopics = response.topics || []
      
      // ワークスペースストアの期待する形式に変換
      const formattedTopics = newTopics.map((topic: any) => ({
        id: topic.id || topic.title?.substring(0, 8) || Math.random().toString(36).substring(7),
        summary: topic.title || topic.summary || 'No title',
        coins: topic.coins || [],
        timestamp: topic.created_at || topic.timestamp || new Date().toISOString(),
        status: topic.status || 'active',
        priority: topic.priority || 'medium',
        tags: topic.tags || [],
        source: topic.source
      }))

      if (isRefresh) {
        setTopics(formattedTopics)
        setOffset(formattedTopics.length)
      } else {
        setTopics([...topics, ...formattedTopics])
        setOffset(offset + formattedTopics.length)
      }

      setHasMore(formattedTopics.length === 20) // 20件取得できた場合はまだ続きがある

    } catch (error) {
      console.error('Failed to load topics:', error)
      toast.error('トピックの読み込みに失敗しました')
      
      // フォールバックとしてモックデータを使用
      if (topics.length === 0) {
        const formattedMockTopics = mockTopics.map(topic => ({
          ...topic,
          timestamp: topic.timestamp || new Date().toISOString()
        }))
        setTopics(formattedMockTopics)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // 初回読み込み
    loadTopics(true)
  }, [])

  const loadMoreTopics = async () => {
    if (!isLoading && hasMore) {
      await loadTopics(false)
    }
  }

  const refreshTopics = async () => {
    await loadTopics(true)
  }

  return {
    topics,
    isLoading,
    hasMore,
    loadMoreTopics,
    refreshTopics
  }
}