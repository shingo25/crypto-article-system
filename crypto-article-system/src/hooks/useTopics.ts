'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

interface Topic {
  id: string
  title: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  score: number
  coins: string[]
  collectedAt: string
  source?: string
  sourceUrl?: string
}

interface TopicFilters {
  priority: string
  source: string
  sortBy: 'score' | 'time' | 'title'
}

export function useTopics() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<TopicFilters>({
    priority: '',
    source: '',
    sortBy: 'time'
  })
  const [offset, setOffset] = useState(0)
  const limit = 50

  // トピック一覧取得
  const {
    data: topicsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['topics', filters, offset],
    queryFn: async () => {
      const response = await apiClient.getTopics({
        limit,
        offset,
        sortBy: filters.sortBy,
        priority: filters.priority || undefined,
        source: filters.source || undefined
      })
      return response
    },
    staleTime: 30 * 1000, // 30秒間はキャッシュを使用
    refetchInterval: 5 * 60 * 1000, // 5分ごとに自動更新
    refetchIntervalInBackground: true, // バックグラウンドでも更新
  })

  // トピック削除ミューテーション
  const deleteMutation = useMutation({
    mutationFn: (topicId: string) => apiClient.deleteTopic(topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success('トピックを削除しました')
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // 複数トピック削除ミューテーション
  const deleteMultipleMutation = useMutation({
    mutationFn: (topicIds: string[]) => 
      Promise.all(topicIds.map(id => apiClient.deleteTopic(id))),
    onSuccess: (_, topicIds) => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success(`${topicIds.length}件のトピックを削除しました`)
    },
    onError: (error) => {
      toast.error(`一括削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // トピック優先度更新ミューテーション
  const updatePriorityMutation = useMutation({
    mutationFn: ({ topicId, priority }: { topicId: string; priority: string }) =>
      apiClient.updateTopicPriority(topicId, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success('優先度を更新しました')
    },
    onError: (error) => {
      toast.error(`更新に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // より多くのトピックを読み込み
  const loadMoreTopics = () => {
    if (topicsData?.pagination?.hasMore) {
      setOffset(prev => prev + limit)
    }
  }

  // フィルターリセット
  const resetFilters = () => {
    setFilters({
      priority: '',
      source: '',
      sortBy: 'time'
    })
    setOffset(0)
  }

  return {
    // データ
    topics: topicsData?.topics || [],
    hasMore: topicsData?.pagination?.hasMore || false,
    totalCount: topicsData?.pagination?.total || 0,
    
    // 状態
    isLoading,
    error,
    filters,
    
    // アクション
    setFilters,
    resetFilters,
    loadMoreTopics,
    refetch,
    deleteTopic: deleteMutation.mutate,
    deleteMultipleTopics: deleteMultipleMutation.mutate,
    updateTopicPriority: updatePriorityMutation.mutate,
    
    // ローディング状態
    isDeleting: deleteMutation.isPending,
    isDeletingMultiple: deleteMultipleMutation.isPending,
    isUpdatingPriority: updatePriorityMutation.isPending,
  }
}