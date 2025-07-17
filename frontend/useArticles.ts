'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

interface Article {
  id: string
  title: string
  type: string
  wordCount: number
  status: 'draft' | 'published' | 'pending'
  generatedAt: string
  coins: string[]
  source?: string
  sourceUrl?: string
}

export function useArticles() {
  const queryClient = useQueryClient()

  // 記事一覧取得
  const {
    data: articlesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const response = await apiClient.getArticles({ limit: 10 })
      return response
    },
    staleTime: 60 * 1000, // 1分間はキャッシュを使用
  })

  // 記事生成ミューテーション
  const generateMutation = useMutation({
    mutationFn: (config: any) => apiClient.generateArticleWithConfig(config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['topics'] }) // トピックも更新される可能性
      toast.success('記事を生成しました')
      return data
    },
    onError: (error) => {
      toast.error(`記事生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // 記事削除ミューテーション
  const deleteMutation = useMutation({
    mutationFn: (articleId: string) => apiClient.deleteArticle(articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      toast.success('記事を削除しました')
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // 記事公開ミューテーション
  const publishMutation = useMutation({
    mutationFn: (articleId: string) => apiClient.publishArticle(articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      toast.success('記事をWordPressに公開しました')
    },
    onError: (error) => {
      toast.error(`公開に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // 記事更新ミューテーション
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Article> }) =>
      apiClient.updateArticle(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      toast.success('記事を更新しました')
    },
    onError: (error) => {
      toast.error(`更新に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // 楽観的更新付きの記事ステータス変更
  const updateStatusOptimistic = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Article['status'] }) =>
      apiClient.updateArticle(id, { status }),
    onMutate: async ({ id, status }) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['articles'] })
      
      // 前の値を保存
      const previousArticles = queryClient.getQueryData(['articles'])
      
      // 楽観的更新
      queryClient.setQueryData(['articles'], (old: any) => {
        if (!old?.articles) return old
        return {
          ...old,
          articles: old.articles.map((article: Article) =>
            article.id === id ? { ...article, status } : article
          )
        }
      })
      
      return { previousArticles }
    },
    onError: (err, variables, context) => {
      // エラー時は元に戻す
      if (context?.previousArticles) {
        queryClient.setQueryData(['articles'], context.previousArticles)
      }
      toast.error(`ステータス更新に失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`)
    },
    onSuccess: () => {
      toast.success('ステータスを更新しました')
    },
    onSettled: () => {
      // 最終的に最新データを取得
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    }
  })

  return {
    // データ
    articles: articlesData?.articles || [],
    totalCount: articlesData?.pagination?.total || 0,
    
    // 状態
    isLoading,
    error,
    
    // アクション
    refetch,
    generateArticle: generateMutation.mutate,
    deleteArticle: deleteMutation.mutate,
    publishArticle: publishMutation.mutate,
    updateArticle: updateMutation.mutate,
    updateArticleStatus: updateStatusOptimistic.mutate,
    
    // ローディング状態
    isGenerating: generateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPublishing: publishMutation.isPending,
    isUpdating: updateMutation.isPending,
    isUpdatingStatus: updateStatusOptimistic.isPending,
    
    // 生成結果
    generatedArticle: generateMutation.data,
    isGenerationSuccess: generateMutation.isSuccess,
  }
}