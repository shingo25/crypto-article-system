'use client'

import React, { useCallback, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useArticles } from '@/hooks/useArticles'
import { LoadingSkeleton } from './LoadingSkeleton'
import { ArticleEditor } from './ArticleEditor'
import { apiClient } from '@/lib/api'
import { FileText, Eye, Trash2, Upload, Edit3, Clock, ExternalLink } from 'lucide-react'
import DOMPurify from 'dompurify'

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

interface ArticleListProps {
  articles: Article[]
  isLoading: boolean
}

const ArticleCard = React.memo(({ 
  article, 
  onDelete, 
  onPublish, 
  onStatusUpdate,
  onEdit,
  isDeleting,
  isPublishing,
  isUpdatingStatus
}: {
  article: Article
  onDelete: (id: string) => void
  onPublish: (id: string) => void
  onStatusUpdate: (id: string, status: Article['status']) => void
  onEdit: (article: Article) => void
  isDeleting: boolean
  isPublishing: boolean
  isUpdatingStatus: boolean
}) => {
  const handleDelete = useCallback(() => {
    onDelete(article.id)
  }, [article.id, onDelete])

  const handlePublish = useCallback(() => {
    onPublish(article.id)
  }, [article.id, onPublish])

  const handleStatusChange = useCallback((status: Article['status']) => {
    onStatusUpdate(article.id, status)
  }, [article.id, onStatusUpdate])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500 text-white'
      case 'pending':
        return 'bg-yellow-500 text-black'
      case 'draft':
        return 'bg-gray-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return '公開済み'
      case 'pending':
        return '承認待ち'
      case 'draft':
        return '下書き'
      default:
        return '不明'
    }
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/30 hover:border-slate-600/50 backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <Badge className={getStatusColor(article.status)}>
            {getStatusText(article.status)}
          </Badge>
          <div className="text-right text-xs text-slate-400">
            <div>{article.wordCount} 文字</div>
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              {new Date(article.generatedAt).toLocaleString('ja-JP')}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-white font-medium mb-2 line-clamp-2 leading-relaxed">
            {DOMPurify.sanitize(article.title, { ALLOWED_TAGS: [] })}
          </h3>
          
          <div className="flex flex-wrap gap-1 mb-3">
            <Badge variant="outline" className="text-xs border-purple-400 text-purple-400">
              {DOMPurify.sanitize(article.type, { ALLOWED_TAGS: [] })}
            </Badge>
            {article.coins.map(coin => (
              <Badge key={coin} variant="outline" className="text-xs border-blue-400 text-blue-400">
                {DOMPurify.sanitize(coin, { ALLOWED_TAGS: [] })}
              </Badge>
            ))}
          </div>
          
          {/* 引用元情報 */}
          {article.source && (
            <div className="flex items-center gap-2 mt-2">
              {article.sourceUrl ? (
                <a 
                  href={DOMPurify.sanitize(article.sourceUrl, { ALLOWED_TAGS: [] })} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  引用元: {DOMPurify.sanitize(article.source, { ALLOWED_TAGS: [] })}
                </a>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <ExternalLink className="h-3 w-3" />
                  引用元: {DOMPurify.sanitize(article.source, { ALLOWED_TAGS: [] })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ステータス変更ボタン */}
        {article.status !== 'published' && (
          <div className="flex gap-1 flex-wrap">
            {article.status !== 'draft' && (
              <Button
                onClick={() => handleStatusChange('draft')}
                disabled={isUpdatingStatus}
                size="sm"
                variant="outline"
                className="text-xs border-gray-500 text-gray-400 hover:bg-gray-600"
              >
                下書きに戻す
              </Button>
            )}
            {article.status !== 'pending' && (
              <Button
                onClick={() => handleStatusChange('pending')}
                disabled={isUpdatingStatus}
                size="sm"
                variant="outline"
                className="text-xs border-yellow-500 text-yellow-400 hover:bg-yellow-600"
              >
                承認待ちにする
              </Button>
            )}
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2 pt-2 border-t border-slate-700">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Eye className="h-3 w-3 mr-1" />
            プレビュー
          </Button>
          
          <Button
            onClick={() => onEdit(article)}
            size="sm"
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            disabled={isUpdatingStatus || loadingArticleContent}
          >
            <Edit3 className="h-3 w-3 mr-1" />
            {loadingArticleContent ? '読み込み中...' : '編集'}
          </Button>
          
          {article.status !== 'published' && (
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Upload className="h-3 w-3 mr-1" />
              {isPublishing ? '公開中...' : '公開'}
            </Button>
          )}
          
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            size="sm"
            variant="destructive"
            className="px-3"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

ArticleCard.displayName = 'ArticleCard'

export function ArticleList({ articles, isLoading }: ArticleListProps) {
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [loadingArticleContent, setLoadingArticleContent] = useState(false)
  const [articleContent, setArticleContent] = useState<string>('')
  
  const { 
    deleteArticle, 
    publishArticle, 
    updateArticleStatus,
    isDeleting, 
    isPublishing,
    isUpdatingStatus
  } = useArticles()

  const handleEdit = async (article: Article) => {
    setLoadingArticleContent(true)
    try {
      const response = await apiClient.getArticleContent(article.id)
      setArticleContent(response.content || '')
      setEditingArticle(article)
    } catch (error) {
      console.error('記事コンテンツの取得に失敗しました:', error)
      setArticleContent('')
      setEditingArticle(article)
    } finally {
      setLoadingArticleContent(false)
    }
  }

  const handleCloseEditor = () => {
    setEditingArticle(null)
    setArticleContent('')
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 p-4 bg-slate-800/50 rounded-lg">
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
    )
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 text-lg mb-2">📄</div>
        <div className="text-slate-300">記事がまだありません</div>
        <div className="text-slate-400 text-sm">トピックから記事を生成してください</div>
      </div>
    )
  }

  return (
    <>
      {/* エディターモーダル */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-auto">
            <ArticleEditor
              articleId={editingArticle.id}
              initialTitle={editingArticle.title}
              initialContent={articleContent}
              initialType={editingArticle.type}
              initialCoins={editingArticle.coins}
              onClose={handleCloseEditor}
              onSave={handleCloseEditor}
            />
          </div>
        </div>
      )}
      
      {/* 記事一覧 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            onDelete={deleteArticle}
            onPublish={publishArticle}
            onStatusUpdate={updateArticleStatus}
            onEdit={handleEdit}
            isDeleting={isDeleting}
            isPublishing={isPublishing}
            isUpdatingStatus={isUpdatingStatus}
          />
        ))}
      </div>
    </>
  )
}