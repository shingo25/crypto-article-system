'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { NeuralInput } from '@/components/neural/NeuralInput'
import { Badge } from '@/components/ui/badge'
import { 
  Search,
  Newspaper,
  Sparkles,
  Eye,
  Send,
  ExternalLink,
  RefreshCw,
  Target,
  Globe,
  BarChart3,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { getCurrentAIConfig } from '@/lib/ai-config'

interface NewsItem {
  id: string
  title: string
  summary: string
  url: string
  imageUrl?: string
  source: string
  importance: number
  sentiment: number
  aiSummary?: string
  topics: string[]
  coins: string[]
  hasGeneratedArticle: boolean
  publishedAt: string
}

interface GeneratedArticle {
  id: string
  title: string
  content: string
  summary: string
  tags: string[]
  wordCount: number
  estimatedReadTime: number
  generatedAt: string
}

export default function ArticleWorkbench() {
  const _router = useRouter()
  const searchParams = useSearchParams()
  const [activeSourceTab, setActiveSourceTab] = useState<'rss' | 'trends' | 'topics'>('rss')
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [selectedSource, setSelectedSource] = useState<NewsItem | null>(null)
  const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // RSS設定からニュースデータ取得
  const loadNews = async () => {
    setLoading(true)
    try {
      // 設定されたRSSソースを取得
      const sourcesResponse = await fetch('/api/sources')
      const sourcesData = await sourcesResponse.json()
      
      if (!sourcesData.success) {
        toast.error('RSS設定の取得に失敗しました')
        return
      }
      
      // 有効なRSSソースから最新ニュースを取得
      const response = await fetch('/api/news?limit=20&use_configured_sources=true')
      const data = await response.json()
      
      if (data.success) {
        setNewsItems(data.data.items)
        toast.success(`${sourcesData.sources.length}件のRSSソースから最新ニュースを取得しました`)
      } else {
        toast.error('ニュースの取得に失敗しました')
      }
    } catch (error) {
      console.error('Failed to load news:', error)
      toast.error('ニュースの取得中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // 記事生成
  const generateArticle = useCallback(async (source: NewsItem) => {
    setIsGenerating(true)
    toast.success('記事生成を開始しました')

    try {
      // 設定されたAI設定を取得
      const aiConfig = getCurrentAIConfig()
      
      if (!aiConfig) {
        toast.error('AI設定が見つかりません。Settingsで設定してください。')
        setIsGenerating(false)
        return
      }

      const response = await fetch('/api/articles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: 'news',
          source_content: source.title,
          topic: source.title,
          ai_provider: aiConfig.provider,
          ai_model: aiConfig.model,
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens,
          style: 'detailed',
          length: 'medium'
        })
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedArticle(data.data.article)
        toast.success('記事が生成されました')
      } else {
        throw new Error(data.error || '記事生成に失敗しました')
      }
    } catch (error) {
      console.error('Article generation failed:', error)
      toast.error(error instanceof Error ? error.message : '記事生成に失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  // 初回データ読み込み
  useEffect(() => {
    loadNews()
  }, [])

  // News Feed からのパラメータ処理
  useEffect(() => {
    const topic = searchParams.get('topic')
    const source = searchParams.get('source')
    const newsId = searchParams.get('newsId')
    
    if (topic && source === 'news' && newsId) {
      // News Feed から遷移してきた場合の処理
      const mockNewsItem: NewsItem = {
        id: newsId,
        title: topic,
        summary: `News Feed から選択された記事: ${topic}`,
        url: '',
        source: 'News Feed',
        importance: 7,
        sentiment: 0,
        topics: ['crypto'],
        coins: [],
        hasGeneratedArticle: false,
        publishedAt: new Date().toISOString()
      }
      
      setSelectedSource(mockNewsItem)
      toast.success(`記事トピック「${topic}」が選択されました`)
      
      // 自動で記事生成を開始
      setTimeout(() => {
        generateArticle(mockNewsItem)
      }, 1000)
    }
  }, [searchParams, generateArticle])

  // フィルタされたニュース
  const filteredNews = newsItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.summary.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getPriorityColor = (importance: number) => {
    if (importance >= 8) return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (importance >= 6) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }

  const getPriorityLabel = (importance: number) => {
    if (importance >= 8) return '緊急'
    if (importance >= 6) return '重要'
    return '通常'
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold neural-title neural-glow-text mb-2">
          Article Workbench
        </h1>
        <p className="text-neural-text-secondary">
          統合記事作成ワークスペース - 情報収集から記事生成、投稿まで
        </p>
      </div>

      {/* 3ペインレイアウト */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        
        {/* 左ペイン: 情報ソース */}
        <div className="col-span-4 flex flex-col">
          <NeuralCard className="flex-1 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                情報ソース
              </CardTitle>
            </CardHeader>
            
            {/* タブ切り替え */}
            <div className="px-6 pb-4">
              <div className="flex gap-2">
                <NeuralButton
                  variant={activeSourceTab === 'rss' ? 'gradient' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSourceTab('rss')}
                >
                  RSS フィード
                </NeuralButton>
                <NeuralButton
                  variant={activeSourceTab === 'trends' ? 'gradient' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSourceTab('trends')}
                >
                  市場トレンド
                </NeuralButton>
                <NeuralButton
                  variant={activeSourceTab === 'topics' ? 'gradient' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSourceTab('topics')}
                >
                  AI トピック
                </NeuralButton>
              </div>
            </div>

            {/* 検索 */}
            <div className="px-6 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neural-text-muted" />
                <NeuralInput
                  placeholder="ソースを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 text-sm"
                />
              </div>
            </div>

            {/* コンテンツエリア */}
            <CardContent className="flex-1 overflow-y-auto">
              {activeSourceTab === 'rss' && (
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-neural-text-muted" />
                      <p className="text-neural-text-muted">読み込み中...</p>
                    </div>
                  ) : filteredNews.length === 0 ? (
                    <div className="text-center py-8">
                      <Newspaper className="h-12 w-12 mx-auto mb-4 text-neural-text-muted" />
                      <p className="text-neural-text-secondary">ニュースが見つかりません</p>
                    </div>
                  ) : (
                    filteredNews.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all",
                          "hover:border-neural-cyan/50 hover:shadow-lg",
                          selectedSource?.id === item.id 
                            ? "border-neural-cyan bg-neural-cyan/10" 
                            : "border-neural-elevated bg-neural-surface/50"
                        )}
                        onClick={() => setSelectedSource(item)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge className={cn("text-xs", getPriorityColor(item.importance))}>
                            {getPriorityLabel(item.importance)}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-neural-text-muted">
                            <Globe className="h-3 w-3" />
                            {item.source}
                          </div>
                        </div>
                        
                        <h4 className="font-medium text-sm neural-title leading-tight mb-2">
                          {item.title}
                        </h4>
                        
                        <p className="text-xs text-neural-text-secondary line-clamp-2 mb-2">
                          {item.summary}
                        </p>

                        {item.coins.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.coins.slice(0, 3).map((coin) => (
                              <Badge key={coin} variant="outline" className="text-xs">
                                {coin}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeSourceTab === 'trends' && (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-neural-text-muted" />
                  <p className="text-neural-text-secondary">市場トレンド機能は開発中です</p>
                </div>
              )}

              {activeSourceTab === 'topics' && (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-neural-text-muted" />
                  <p className="text-neural-text-secondary">AIトピック提案機能は開発中です</p>
                </div>
              )}
            </CardContent>
          </NeuralCard>
        </div>

        {/* 中央ペイン: 記事生成・編集 */}
        <div className="col-span-4 flex flex-col">
          <NeuralCard className="flex-1 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                記事生成・編集
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              {!selectedSource ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 text-neural-text-muted" />
                    <p className="text-neural-text-secondary">
                      左側から情報ソースを選択してください
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-4">
                  {/* 選択されたソース情報 */}
                  <div className="p-4 neural-neumorphic-inset rounded-lg">
                    <h3 className="font-medium neural-title mb-2">選択されたソース</h3>
                    <p className="text-sm text-neural-text-secondary mb-2">
                      {selectedSource.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(selectedSource.importance)}>
                        {getPriorityLabel(selectedSource.importance)}
                      </Badge>
                      <Badge variant="outline">{selectedSource.source}</Badge>
                    </div>
                  </div>

                  {/* 生成ボタン */}
                  <NeuralButton
                    variant="gradient"
                    onClick={() => generateArticle(selectedSource)}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGenerating ? '生成中...' : '記事を生成'}
                  </NeuralButton>

                  {/* 生成中の表示 */}
                  {isGenerating && (
                    <div className="p-4 neural-neumorphic-inset rounded-lg">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-neural-cyan" />
                        <span className="text-sm neural-title">AI が記事を生成中...</span>
                      </div>
                    </div>
                  )}

                  {/* 生成された記事の概要 */}
                  {generatedArticle && (
                    <div className="flex-1 overflow-y-auto space-y-4">
                      <div className="p-4 neural-neumorphic-inset rounded-lg">
                        <h3 className="font-medium neural-title mb-2">生成された記事</h3>
                        <p className="text-sm font-medium mb-1">{generatedArticle.title}</p>
                        <p className="text-xs text-neural-text-secondary mb-2">
                          {generatedArticle.summary}
                        </p>
                        <div className="flex gap-2 text-xs text-neural-text-muted">
                          <span>{generatedArticle.wordCount}文字</span>
                          <span>•</span>
                          <span>読了時間: {generatedArticle.estimatedReadTime}分</span>
                        </div>
                      </div>

                      {/* 強化エディター */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-neural-text-muted">
                          <span>Markdown対応</span>
                          <span>•</span>
                          <span>自動保存</span>
                        </div>
                        <textarea
                          className="w-full h-64 p-3 text-sm bg-neural-surface border border-neural-elevated rounded-lg resize-none font-mono"
                          value={generatedArticle.content}
                          onChange={(e) => setGeneratedArticle({
                            ...generatedArticle,
                            content: e.target.value
                          })}
                          placeholder="記事内容を編集...&#10;&#10;# 見出し1&#10;## 見出し2&#10;&#10;**太字** *斜体*&#10;&#10;- リスト項目&#10;- リスト項目&#10;&#10;[リンク](URL)"
                        />
                        <div className="flex justify-between text-xs text-neural-text-muted">
                          <span>{generatedArticle.content.length}文字</span>
                          <span>最終編集: {new Date().toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </NeuralCard>
        </div>

        {/* 右ペイン: プレビュー・投稿 */}
        <div className="col-span-4 flex flex-col">
          <NeuralCard className="flex-1 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                プレビュー・投稿
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              {!generatedArticle ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-4 text-neural-text-muted" />
                    <p className="text-neural-text-secondary">
                      記事生成後にプレビューが表示されます
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-4">
                  {/* プレビュー */}
                  <div className="flex-1 p-4 bg-neural-surface border border-neural-elevated rounded-lg overflow-y-auto">
                    <div className="prose prose-neural max-w-none">
                      <h1 className="neural-title">{generatedArticle.title}</h1>
                      <div 
                        className="text-neural-text-secondary leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: generatedArticle.content.replace(/\n/g, '<br/>') 
                        }}
                      />
                    </div>
                  </div>

                  {/* 投稿ボタン */}
                  <div className="space-y-3">
                    <NeuralButton
                      variant="gradient"
                      className="w-full"
                      onClick={() => toast.info('WordPress投稿機能は開発中です')}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      WordPressに投稿
                    </NeuralButton>

                    <NeuralButton
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedArticle.content)
                        toast.success('記事をクリップボードにコピーしました')
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      記事をコピー
                    </NeuralButton>
                  </div>
                </div>
              )}
            </CardContent>
          </NeuralCard>
        </div>
      </div>
    </div>
  )
}