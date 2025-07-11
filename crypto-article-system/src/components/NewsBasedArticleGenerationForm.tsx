'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, FileText, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useArticleGeneration } from '@/hooks/useArticleGeneration'

// Prismaのモデルに基づいたNewsItem型定義
interface NewsItem {
  id: string
  title: string
  summary?: string
  content?: string
  url: string
  imageUrl?: string
  source: string
  author?: string
  sentiment?: number
  importance: number
  publishedAt: string
  hasGeneratedArticle: boolean
  generatedArticleId?: string
  createdAt: string
  updatedAt: string
}

interface ArticleTemplate {
  id: string
  name: string
  description: string
  category: string
  usageCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface NewsBasedArticleGenerationFormProps {
  newsItems: NewsItem[]
}

export default function NewsBasedArticleGenerationForm({ newsItems }: NewsBasedArticleGenerationFormProps) {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
  const [templates, setTemplates] = useState<ArticleTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>(newsItems)
  
  // 記事生成オプション
  const [options, setOptions] = useState<{
    style: 'detailed' | 'concise' | 'technical'
    length: 'short' | 'medium' | 'long'
  }>({
    style: 'detailed',
    length: 'medium'
  })

  // カスタムフックを使用
  const {
    generate,
    isGenerating,
    generateError,
    job,
    isPolling,
    pollingError,
    clearJob,
    hasActiveJob
  } = useArticleGeneration()

  // テンプレート取得
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/templates')
        if (response.ok) {
          const data = await response.json()
          setTemplates(data.templates || [])
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error)
      }
    }
    
    fetchTemplates()
  }, [])

  // ニュース検索フィルタリング
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredNews(newsItems)
      return
    }

    const filtered = newsItems.filter(news =>
      news.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      news.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      news.summary?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredNews(filtered)
  }, [searchTerm, newsItems])

  const handleNewsSelect = (news: NewsItem) => {
    setSelectedNews(news)
    console.log('ニュースが選択されました:', news.title) // デバッグ用ログ
  }

  const handleGenerate = () => {
    if (!selectedNews) return

    generate({
      newsId: selectedNews.id,
      templateId: selectedTemplateId || undefined,
      options
    })
  }

  const handleClearJob = () => {
    clearJob()
    setSelectedNews(null)
  }

  // 重要度に応じたバッジの色
  const getImportanceBadgeColor = (importance: number) => {
    if (importance >= 8) return 'destructive' // 高重要度
    if (importance >= 5) return 'default' // 中重要度
    return 'secondary' // 低重要度
  }

  // センチメントの表示
  const getSentimentDisplay = (sentiment?: number) => {
    if (sentiment === undefined) return null
    if (sentiment > 0.3) return { text: 'ポジティブ', color: 'text-green-400' }
    if (sentiment < -0.3) return { text: 'ネガティブ', color: 'text-red-400' }
    return { text: '中立', color: 'text-gray-400' }
  }

  // 進捗率の計算
  const getProgressValue = () => {
    if (!job) return 0
    return job.progress || 0
  }

  // ステータスメッセージとアイコン
  const getStatusDisplay = () => {
    if (isGenerating) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        message: '記事生成を開始しています...',
        color: 'text-blue-400'
      }
    }

    if (job) {
      switch (job.status) {
        case 'pending':
          return {
            icon: <Clock className="h-4 w-4" />,
            message: job.message || '記事生成を開始しています...',
            color: 'text-yellow-400'
          }
        case 'processing':
          return {
            icon: <Loader2 className="h-4 w-4 animate-spin" />,
            message: job.message || 'AI が記事を生成中です...',
            color: 'text-blue-400'
          }
        case 'completed':
          return {
            icon: <CheckCircle className="h-4 w-4" />,
            message: job.message || '記事生成が完了しました！',
            color: 'text-green-400'
          }
        case 'failed':
          return {
            icon: <XCircle className="h-4 w-4" />,
            message: job.message || '記事生成に失敗しました',
            color: 'text-red-400'
          }
      }
    }

    return null
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="space-y-6">
      {/* ジョブステータス表示 */}
      {(hasActiveJob || statusDisplay) && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              記事生成ステータス
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusDisplay && (
              <div className={`flex items-center gap-2 ${statusDisplay.color}`}>
                {statusDisplay.icon}
                <span>{statusDisplay.message}</span>
              </div>
            )}

            {job && job.status !== 'completed' && job.status !== 'failed' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">進捗</span>
                  <span className="text-gray-400">
                    {job.estimatedRemainingTime ? `残り ${job.estimatedRemainingTime}` : ''}
                  </span>
                </div>
                <Progress value={getProgressValue()} className="h-2" />
              </div>
            )}

            {job?.status === 'completed' && job.article && (
              <div className="p-4 rounded-lg bg-green-900/20 border border-green-600">
                <h4 className="text-green-400 font-medium mb-2">生成された記事</h4>
                <div className="space-y-1 text-sm">
                  <div className="text-white">{job.article.title}</div>
                  <div className="text-gray-400">{job.article.summary}</div>
                  <Button
                    size="sm"
                    className="mt-2 bg-green-600 hover:bg-green-700"
                    onClick={() => window.open(job.article!.url, '_blank')}
                  >
                    記事を確認
                  </Button>
                </div>
              </div>
            )}

            {(job?.status === 'completed' || job?.status === 'failed') && (
              <Button
                onClick={handleClearJob}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                新しい記事を生成
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* エラー表示 */}
      {(generateError || pollingError) && (
        <Alert className="bg-red-900 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>
            {generateError?.message || pollingError?.message}
          </AlertDescription>
        </Alert>
      )}

      {/* ニュース選択 */}
      {!hasActiveJob && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">ニュース選択</CardTitle>
            <CardDescription className="text-slate-400">
              記事を生成するニュースを選択してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 検索フィルター */}
            <div className="mb-4">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ニュースを検索..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* ニュース一覧 */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredNews.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  {searchTerm ? '検索条件に一致するニュースが見つかりません' : 'ニュースがありません'}
                </p>
              ) : (
                filteredNews.map((news) => (
                  <div
                    key={news.id}
                    onClick={() => handleNewsSelect(news)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedNews?.id === news.id
                        ? 'bg-blue-900 border-blue-600'
                        : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-medium line-clamp-2 mb-2">
                          {news.title}
                        </h4>
                        {news.summary && (
                          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                            {news.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {news.source}
                          </Badge>
                          <Badge variant={getImportanceBadgeColor(news.importance)}>
                            重要度: {news.importance}
                          </Badge>
                          {getSentimentDisplay(news.sentiment) && (
                            <Badge variant="outline" className="text-xs">
                              <span className={getSentimentDisplay(news.sentiment)!.color}>
                                {getSentimentDisplay(news.sentiment)!.text}
                              </span>
                            </Badge>
                          )}
                          {news.hasGeneratedArticle && (
                            <Badge variant="secondary" className="text-xs">
                              記事生成済み
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          公開日: {new Date(news.publishedAt).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 選択されたニュースの表示 */}
      {!hasActiveJob && selectedNews && (
        <Card className="bg-green-900/20 border-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-400 text-lg">
              選択されたニュース
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-white font-medium mb-2">{selectedNews.title}</h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {selectedNews.source}
              </Badge>
              <Badge variant={getImportanceBadgeColor(selectedNews.importance)}>
                重要度: {selectedNews.importance}
              </Badge>
            </div>
            <p className="text-gray-400 text-sm">{selectedNews.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* 記事設定 */}
      {!hasActiveJob && selectedNews && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">記事生成設定</CardTitle>
                <CardDescription className="text-slate-400">
                  生成する記事の設定を行ってください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* テンプレート選択 */}
                <div>
                  <Label className="text-white">テンプレート（オプション）</Label>
                  <Select 
                    value={selectedTemplateId || 'default'} 
                    onValueChange={(value) => setSelectedTemplateId(value === 'default' ? '' : value)}
                  >
                    <SelectTrigger className="mt-2 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="テンプレートを選択（任意）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">デフォルト</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                          <span className="text-sm text-gray-400 ml-2">
                            ({template.category})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 記事スタイル */}
                <div>
                  <Label className="text-white">記事スタイル</Label>
                  <Select 
                    value={options.style} 
                    onValueChange={(value: 'detailed' | 'concise' | 'technical') => 
                      setOptions(prev => ({ ...prev, style: value }))
                    }
                  >
                    <SelectTrigger className="mt-2 bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="detailed">詳細（背景情報を含む）</SelectItem>
                      <SelectItem value="concise">簡潔（要点のみ）</SelectItem>
                      <SelectItem value="technical">技術的（専門用語を含む）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 記事の長さ */}
                <div>
                  <Label className="text-white">記事の長さ</Label>
                  <Select 
                    value={options.length} 
                    onValueChange={(value: 'short' | 'medium' | 'long') => 
                      setOptions(prev => ({ ...prev, length: value }))
                    }
                  >
                    <SelectTrigger className="mt-2 bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">短い（300-500文字）</SelectItem>
                      <SelectItem value="medium">標準（800-1200文字）</SelectItem>
                      <SelectItem value="long">長い（1500-2000文字）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 生成ボタン */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedNews}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      記事を生成中...
                    </>
                  ) : (
                    '記事を生成する'
                  )}
                </Button>
              </CardContent>
            </Card>
      )}
    </div>
  )
}