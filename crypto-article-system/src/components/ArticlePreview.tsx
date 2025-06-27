'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Edit, Eye, Trash2, Download, Send } from "lucide-react"

interface Article {
  id: string
  title: string
  type: string
  wordCount: number
  status: string
  generatedAt: string
  coins: string[]
  content?: string
  htmlContent?: string
}

interface ArticlePreviewProps {
  articles: Article[]
  onUpdateArticle: (articleId: string, updates: Partial<Article>) => Promise<void>
  onDeleteArticle: (articleId: string) => Promise<void>
  onPublishArticle: (articleId: string) => Promise<void>
  onRefreshArticles: () => Promise<void>
}

export default function ArticlePreview({ 
  articles, 
  onUpdateArticle, 
  onDeleteArticle,
  onPublishArticle,
  onRefreshArticles 
}: ArticlePreviewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [editingArticle, setEditingArticle] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Article>>({})
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [previewMode, setPreviewMode] = useState<'text' | 'html'>('text')

  // フィルタリング
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.coins.some(coin => coin.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = !filterType || article.type === filterType
    const matchesStatus = !filterStatus || article.status === filterStatus
    
    return matchesSearch && matchesType && matchesStatus
  })

  const handlePreview = async (article: Article) => {
    try {
      // 記事内容を取得
      const response = await fetch(`/api/articles/${article.id}/content`)
      const data = await response.json()
      
      setSelectedArticle({
        ...article,
        content: data.content,
        htmlContent: data.htmlContent
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : '記事の取得に失敗しました')
    }
  }

  const handleEditStart = (article: Article) => {
    setEditingArticle(article.id)
    setEditForm({
      title: article.title,
      type: article.type,
      status: article.status
    })
    setError(null)
  }

  const handleEditSave = async () => {
    if (!editingArticle) return

    try {
      await onUpdateArticle(editingArticle, editForm)
      setEditingArticle(null)
      setEditForm({})
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : '記事の更新に失敗しました')
    }
  }

  const handleEditCancel = () => {
    setEditingArticle(null)
    setEditForm({})
    setError(null)
  }

  const handleDelete = async (articleId: string) => {
    if (!confirm('この記事を削除してもよろしいですか？')) return

    try {
      await onDeleteArticle(articleId)
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : '記事の削除に失敗しました')
    }
  }

  const handlePublish = async (articleId: string) => {
    if (!confirm('この記事をWordPressに投稿しますか？')) return

    try {
      await onPublishArticle(articleId)
      setError(null)
      alert('記事を投稿しました')
    } catch (error) {
      setError(error instanceof Error ? error.message : '記事の投稿に失敗しました')
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefreshArticles()
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : '記事の更新に失敗しました')
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500 text-white'
      case 'draft': return 'bg-yellow-500 text-white'
      case 'pending': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'breaking_news': '速報',
      'analysis': '分析',
      'technical': '技術',
      'market_overview': '市場概況',
      'educational': '教育',
      'opinion': 'オピニオン'
    }
    return typeMap[type] || type
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white">記事一覧・プレビュー</CardTitle>
              <CardDescription className="text-slate-400">
                生成された記事の管理・編集・公開
              </CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRefreshing ? '更新中...' : '記事を更新'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* フィルター */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white">検索</Label>
              <Input
                type="text"
                placeholder="タイトルまたはコインで検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <Label className="text-white">記事タイプ</Label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              >
                <option value="">すべて</option>
                <option value="breaking_news">速報</option>
                <option value="analysis">分析</option>
                <option value="technical">技術</option>
                <option value="market_overview">市場概況</option>
                <option value="educational">教育</option>
                <option value="opinion">オピニオン</option>
              </select>
            </div>
            
            <div>
              <Label className="text-white">ステータス</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              >
                <option value="">すべて</option>
                <option value="draft">下書き</option>
                <option value="pending">レビュー待ち</option>
                <option value="published">公開済み</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert className="bg-red-900 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 記事リスト */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">
              記事一覧 ({filteredArticles.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="p-4 bg-slate-700 border border-slate-600 rounded-lg"
                >
                  {editingArticle === article.id ? (
                    // 編集モード
                    <div className="space-y-4">
                      <div>
                        <Label className="text-white">タイトル</Label>
                        <Input
                          value={editForm.title || ''}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="mt-1 bg-slate-600 border-slate-500 text-white"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-white">タイプ</Label>
                          <select
                            value={editForm.type || ''}
                            onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                            className="w-full mt-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white"
                          >
                            <option value="breaking_news">速報</option>
                            <option value="analysis">分析</option>
                            <option value="technical">技術</option>
                            <option value="market_overview">市場概況</option>
                            <option value="educational">教育</option>
                            <option value="opinion">オピニオン</option>
                          </select>
                        </div>
                        
                        <div>
                          <Label className="text-white">ステータス</Label>
                          <select
                            value={editForm.status || ''}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="w-full mt-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white"
                          >
                            <option value="draft">下書き</option>
                            <option value="pending">レビュー待ち</option>
                            <option value="published">公開済み</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={handleEditCancel}
                          variant="outline"
                          className="border-slate-500 text-slate-300 hover:bg-slate-600"
                        >
                          キャンセル
                        </Button>
                        <Button
                          onClick={handleEditSave}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          保存
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // 表示モード
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(article.status)}>
                          {article.status}
                        </Badge>
                        <Badge variant="outline" className="border-purple-600 text-purple-400">
                          {getTypeLabel(article.type)}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {article.wordCount}文字
                        </span>
                      </div>
                      
                      <h3 className="text-white font-medium">{article.title}</h3>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <div className="flex gap-2">
                          {article.coins.map((coin) => (
                            <Badge key={coin} variant="outline" className="border-yellow-600 text-yellow-600">
                              {coin}
                            </Badge>
                          ))}
                        </div>
                        <span>{article.generatedAt}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handlePreview(article)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          プレビュー
                        </Button>
                        <Button
                          onClick={() => handleEditStart(article)}
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          編集
                        </Button>
                        {article.status === 'draft' && (
                          <Button
                            onClick={() => handlePublish(article.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            投稿
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDelete(article.id)}
                          size="sm"
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredArticles.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  該当する記事が見つかりません
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* プレビューパネル */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">記事プレビュー</CardTitle>
              {selectedArticle && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPreviewMode('text')}
                    size="sm"
                    variant={previewMode === 'text' ? 'default' : 'outline'}
                    className="text-white"
                  >
                    テキスト
                  </Button>
                  <Button
                    onClick={() => setPreviewMode('html')}
                    size="sm"
                    variant={previewMode === 'html' ? 'default' : 'outline'}
                    className="text-white"
                  >
                    HTML
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedArticle ? (
              <div className="space-y-4">
                <div className="border-b border-slate-600 pb-4">
                  <h2 className="text-xl font-bold text-white mb-2">
                    {selectedArticle.title}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(selectedArticle.status)}>
                      {selectedArticle.status}
                    </Badge>
                    <Badge variant="outline" className="border-purple-600 text-purple-400">
                      {getTypeLabel(selectedArticle.type)}
                    </Badge>
                    <span className="text-sm text-slate-400">
                      {selectedArticle.wordCount}文字 | {selectedArticle.generatedAt}
                    </span>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {previewMode === 'html' ? (
                    <div 
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedArticle.htmlContent || '' }}
                    />
                  ) : (
                    <div className="text-slate-300 whitespace-pre-wrap">
                      {selectedArticle.content || 'コンテンツを読み込み中...'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                記事を選択してプレビューを表示
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}