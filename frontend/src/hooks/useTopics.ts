import { useState, useEffect, useCallback } from 'react'
import { useWorkspaceStore } from '@/lib/stores/workspaceStore'
import { apiClient } from '@/lib/api'
import { mockTopics } from '@/lib/mockData'
import toast from 'react-hot-toast'
import { Topic, TopicsResponse } from '@/lib/types'

export function useTopics() {
  const { topics, setTopics } = useWorkspaceStore()
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const loadTopics = useCallback(async (isRefresh = false) => {
    try {
      setIsLoading(true)
      const currentOffset = isRefresh ? 0 : offset
      
      
      // 実際のAPIからトピックを取得
      const response: TopicsResponse = await apiClient.getTopics({
        limit: 20,
        offset: currentOffset,
        sortBy: 'created_at'
      })

      const newTopics = response.topics || []
      
      // TopicList.tsxの期待する形式に変換
      const formattedTopics: Topic[] = newTopics.map((topic: any): Topic => ({
        id: topic.id || topic.title?.substring(0, 8) || Math.random().toString(36).substring(7),
        title: topic.title || topic.summary || 'No title', // TopicListが期待するtitleプロパティ
        summary: topic.summary || topic.title || 'No summary',
        coins: topic.coins || [],
        collectedAt: topic.collectedAt || topic.created_at || topic.timestamp || new Date().toISOString(), // TopicListが期待するcollectedAtプロパティ
        timestamp: topic.collectedAt || topic.created_at || topic.timestamp || new Date().toISOString(),
        status: topic.status || 'active',
        priority: topic.priority || 'medium',
        tags: topic.tags || [],
        source: topic.source,
        sourceUrl: topic.sourceUrl,
        // ハイブリッド型トピックの追加フィールド
        type: topic.type || 'standard',
        question: topic.question,
        analysisAngles: topic.analysisAngles,
        suggestedStructure: topic.suggestedStructure,
        primaryData: topic.primaryData,
        estimatedReadTime: topic.estimatedReadTime,
        score: topic.score || Math.floor(Math.random() * 100) + 1 // TopicListが期待するscoreプロパティ
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
  }, [offset, topics, setTopics])

  useEffect(() => {
    // 初回読み込み
    loadTopics(true)
  }, [loadTopics])

  const loadMoreTopics = useCallback(async () => {
    if (!isLoading && hasMore) {
      await loadTopics(false)
    }
  }, [isLoading, hasMore, loadTopics])

  const refreshTopics = useCallback(async () => {
    await loadTopics(true)
  }, [loadTopics])

  return {
    topics,
    isLoading,
    hasMore,
    loadMoreTopics,
    refreshTopics
  }
}