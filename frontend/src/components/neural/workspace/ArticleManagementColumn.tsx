'use client'

import React from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { ArticleList } from '@/components/ArticleList'
import { useArticles } from '@/hooks/useArticles'
import { FileText, RefreshCw } from 'lucide-react'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

export function ArticleManagementColumn() {
  const { 
    articles, 
    totalCount, 
    isLoading, 
    error, 
    refetch 
  } = useArticles()

  const handleRefresh = () => {
    refetch()
  }

  if (error) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠️</div>
          <div className="text-neural-text-secondary text-sm">
            記事の読み込みに失敗しました
          </div>
          <NeuralButton 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            再試行
          </NeuralButton>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-neural-elevated/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-neural-warning" />
            <div>
              <h3 className="font-semibold neural-title">記事管理</h3>
              <p className="text-xs text-neural-text-secondary">
                {totalCount > 0 ? `${totalCount}件の記事` : '記事がありません'}
              </p>
            </div>
          </div>
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </NeuralButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3 p-4 bg-neural-surface/50 rounded-lg">
                <div className="flex justify-between">
                  <LoadingSkeleton className="h-6 w-20" />
                  <LoadingSkeleton className="h-4 w-16" />
                </div>
                <LoadingSkeleton className="h-4 w-full" />
                <LoadingSkeleton className="h-4 w-3/4" />
                <div className="flex gap-2">
                  <LoadingSkeleton className="h-5 w-12" />
                  <LoadingSkeleton className="h-5 w-12" />
                </div>
                <div className="flex gap-2 pt-2">
                  <LoadingSkeleton className="h-8 flex-1" />
                  <LoadingSkeleton className="h-8 flex-1" />
                  <LoadingSkeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-neural-text-muted text-6xl mb-4">📄</div>
            <div className="text-neural-text-secondary text-lg mb-2">記事がまだありません</div>
            <div className="text-neural-text-muted text-sm">
              トピックから記事を生成するか、Market Overviewから記事を作成してください
            </div>
          </div>
        ) : (
          <ArticleList articles={articles} isLoading={isLoading} />
        )}
      </div>
    </div>
  )
}