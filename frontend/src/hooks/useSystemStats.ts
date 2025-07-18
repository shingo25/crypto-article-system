'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'
import { useEffect, useRef } from 'react'

interface SystemStats {
  articlesGenerated: number
  topicsCollected: number
  templatesCount: number
  systemStatus: 'running' | 'stopped' | 'error'
  lastRun: string
  dailyQuota: {
    used: number
    total: number
  }
  scheduler: {
    isRunning: boolean
    isCollecting: boolean
    lastCollectionTime: string | null
    collectionCount: number
    errorCount: number
    nextRunTime: string | null
  }
}

export function useSystemStats() {
  const queryClient = useQueryClient()

  // システム統計取得
  const {
    data: stats,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['systemStats'],
    queryFn: async () => {
      const response = await apiClient.getSystemStats()
      return response
    },
    staleTime: 30 * 1000, // 30秒間はキャッシュを使用
    refetchInterval: 60 * 1000, // 1分ごとに自動更新
  })

  // システム制御ミューテーション
  const controlMutation = useMutation({
    mutationFn: (action: 'start' | 'stop' | 'restart') =>
      apiClient.systemControl(action),
    onSuccess: (data, action) => {
      queryClient.invalidateQueries({ queryKey: ['systemStats'] })
      const actionName = {
        start: '開始',
        stop: '停止',
        restart: '再起動'
      }[action]
      toast.success(`システムを${actionName}しました`)
    },
    onError: (error, action) => {
      const actionName = {
        start: '開始',
        stop: '停止',
        restart: '再起動'
      }[action]
      toast.error(`システム${actionName}に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // トピック収集開始ミューテーション
  const collectTopicsMutation = useMutation({
    mutationFn: () => apiClient.collectTopics(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemStats'] })
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success('トピック収集を開始しました')
    },
    onError: (error) => {
      toast.error(`トピック収集に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // システム状態チェック
  const checkSystemHealth = () => {
    refetch()
  }

  return {
    // データ
    stats: stats || {
      articlesGenerated: 0,
      topicsCollected: 0,
      templatesCount: 0,
      systemStatus: 'stopped' as const,
      lastRun: '',
      dailyQuota: { used: 0, total: 50 },
      scheduler: {
        isRunning: false,
        isCollecting: false,
        lastCollectionTime: null,
        collectionCount: 0,
        errorCount: 0,
        nextRunTime: null
      }
    },
    
    // 状態
    isLoading,
    error,
    
    // アクション
    refetch: checkSystemHealth,
    startSystem: () => controlMutation.mutate('start'),
    stopSystem: () => controlMutation.mutate('stop'),
    restartSystem: () => controlMutation.mutate('restart'),
    collectTopics: collectTopicsMutation.mutate,
    
    // ローディング状態
    isControlling: controlMutation.isPending,
    isCollecting: collectTopicsMutation.isPending,
  }
}