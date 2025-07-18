'use client'

import React, { useState, useEffect } from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  FileText, 
  Clock, 
  Activity,
  Eye,
  Edit,
  Share,
  TrendingUp,
  AlertCircle,
  Plus,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Article {
  id: string
  title: string
  status: 'completed' | 'draft' | 'review'
  publishedAt?: string
  views?: number
  engagement?: number
  source?: string
}

interface GenerationTask {
  id: string
  topic: string
  progress: number
  stage: 'analyzing' | 'writing' | 'optimizing' | 'completed'
  eta: string
  coin?: string
}

interface ContentStats {
  today: number
  thisWeek: number
  total: number
  avgViews: number
  topPerformer?: Article
}

interface ContentPipelineData {
  currentGeneration?: GenerationTask
  queueSize: number
  recentArticles: Article[]
  stats: ContentStats
  quickTemplates: string[]
}

export function ContentPipeline() {
  const [data, setData] = useState<ContentPipelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadContentData = async () => {
    try {
      // モックデータ - 実際のAPIに置き換え予定
      const mockData: ContentPipelineData = {
        currentGeneration: {
          id: 'gen-001',
          topic: 'ビットコイン価格分析：5%急騰の背景',
          progress: 78,
          stage: 'writing',
          eta: '2分30秒',
          coin: 'BTC'
        },
        queueSize: 3,
        recentArticles: [
          {
            id: '1',
            title: 'イーサリアムDeFiエコシステムの最新動向',
            status: 'completed',
            publishedAt: '5分前',
            views: 1247,
            engagement: 8.3,
            source: 'market'
          },
          {
            id: '2', 
            title: 'Solana：新プロジェクト発表の市場への影響',
            status: 'completed',
            publishedAt: '12分前',
            views: 892,
            engagement: 6.7,
            source: 'alert'
          },
          {
            id: '3',
            title: 'レイヤー2ソリューション比較分析',
            status: 'draft',
            publishedAt: undefined,
            views: 0,
            engagement: 0,
            source: 'manual'
          },
          {
            id: '4',
            title: '規制環境の明確化が仮想通貨市場に与える影響',
            status: 'review',
            publishedAt: undefined,
            views: 0,
            engagement: 0,
            source: 'trend'
          }
        ],
        stats: {
          today: 12,
          thisWeek: 84,
          total: 1247,
          avgViews: 2150,
          topPerformer: {
            id: 'top-1',
            title: 'ビットコインETF承認の市場インパクト分析',
            status: 'completed',
            views: 15420,
            engagement: 12.8
          }
        },
        quickTemplates: [
          '価格分析レポート',
          'マーケット速報',
          'プロジェクト紹介',
          'トレンド解説'
        ]
      }
      
      setData(mockData)
    } catch (error) {
      console.error('Failed to load content data:', error)
      toast.error('コンテンツデータの読み込みに失敗しました')
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      await loadContentData()
      setLoading(false)
    }
    loadInitialData()
  }, [])

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'analyzing': return 'text-neural-cyan'
      case 'writing': return 'text-neural-warning'
      case 'optimizing': return 'text-neural-orchid'
      case 'completed': return 'text-neural-success'
      default: return 'text-neural-text-secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-neural-success'
      case 'draft': return 'text-neural-warning'
      case 'review': return 'text-neural-cyan'
      default: return 'text-neural-text-secondary'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return { label: '公開済み', color: 'bg-neural-success/20 text-neural-success' }
      case 'draft': return { label: '下書き', color: 'bg-neural-warning/20 text-neural-warning' }
      case 'review': return { label: 'レビュー中', color: 'bg-neural-cyan/20 text-neural-cyan' }
      default: return { label: '不明', color: 'bg-neural-surface/50 text-neural-text-muted' }
    }
  }

  const handleNewArticle = () => {
    router.push('/content/workspace')
    toast.success('新しい記事の作成を開始します')
  }

  const handleTemplateGenerate = (template: string) => {
    const params = new URLSearchParams({
      template,
      source: 'template'
    })
    router.push(`/content/workspace?${params.toString()}`)
    toast.success(`${template}テンプレートで記事生成を開始します`)
  }

  const handleArticleAction = (action: string, article: Article) => {
    switch (action) {
      case 'edit':
        router.push(`/content/workspace?edit=${article.id}`)
        break
      case 'view':
        router.push(`/content/articles/${article.id}`)
        break
      case 'analytics':
        router.push(`/analytics/performance?article=${article.id}`)
        break
      default:
        toast.info(`${action} 機能は準備中です`)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <NeuralCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-neural-cyan animate-pulse" />
              Content Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 neural-neumorphic-inset rounded-lg animate-pulse" />
              ))}
            </div>
          </CardContent>
        </NeuralCard>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <NeuralCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-neural-error" />
              Content Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-6">
            <p className="text-neural-text-secondary mb-4">コンテンツデータを読み込めませんでした</p>
            <NeuralButton onClick={loadContentData} size="sm">
              再試行
            </NeuralButton>
          </CardContent>
        </NeuralCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Generation Status */}
      <NeuralCard>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-neural-cyan" />
            生成状況
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {data.currentGeneration ? (
            <div className="p-3 neural-neumorphic-inset rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium neural-title">進行中</div>
                <div className={cn("text-xs font-medium", getStageColor(data.currentGeneration.stage))}>
                  {data.currentGeneration.stage.toUpperCase()}
                </div>
              </div>
              
              <div className="text-xs text-neural-text-secondary mb-2 line-clamp-2">
                {data.currentGeneration.topic}
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>進捗</span>
                  <span className="font-medium">{data.currentGeneration.progress}%</span>
                </div>
                <div className="h-2 bg-neural-surface rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-neural-cyan transition-all duration-300"
                    style={{ width: `${data.currentGeneration.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-neural-text-muted">
                  <span>残り: {data.currentGeneration.eta}</span>
                  <span>キュー: {data.queueSize}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-4 neural-neumorphic-inset rounded-lg">
              <Activity className="h-8 w-8 mx-auto mb-2 text-neural-text-muted" />
              <div className="text-sm neural-title text-neural-text-secondary">待機中</div>
              <div className="text-xs text-neural-text-muted mt-1">
                {data.queueSize > 0 ? `${data.queueSize}件のタスクが待機中` : 'キューは空です'}
              </div>
            </div>
          )}
        </CardContent>
      </NeuralCard>

      {/* Performance Stats */}
      <NeuralCard>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-neural-orchid" />
            パフォーマンス
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 neural-neumorphic-inset rounded-lg">
              <div className="text-lg font-bold neural-title text-neural-cyan">{data.stats.today}</div>
              <div className="text-xs text-neural-text-muted">今日</div>
            </div>
            
            <div className="text-center p-2 neural-neumorphic-inset rounded-lg">
              <div className="text-lg font-bold neural-title text-neural-orchid">{data.stats.thisWeek}</div>
              <div className="text-xs text-neural-text-muted">今週</div>
            </div>
            
            <div className="text-center p-2 neural-neumorphic-inset rounded-lg">
              <div className="text-lg font-bold neural-title text-neural-success">{data.stats.total}</div>
              <div className="text-xs text-neural-text-muted">総計</div>
            </div>
          </div>

          {data.stats.topPerformer && (
            <div className="p-3 neural-neumorphic-inset rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-neural-success" />
                <span className="text-xs font-medium neural-title">トップパフォーマー</span>
              </div>
              <div className="text-xs neural-title mb-1 line-clamp-2">
                {data.stats.topPerformer.title}
              </div>
              <div className="flex justify-between text-xs text-neural-text-muted">
                <span>{data.stats.topPerformer.views?.toLocaleString()} PV</span>
                <span>{data.stats.topPerformer.engagement}% engagement</span>
              </div>
            </div>
          )}
        </CardContent>
      </NeuralCard>

      {/* Recent Articles */}
      <NeuralCard>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-neural-warning" />
            最近の記事
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {data.recentArticles.slice(0, 4).map((article) => {
              const statusBadge = getStatusBadge(article.status)
              return (
                <div 
                  key={article.id}
                  className="p-3 neural-neumorphic-inset rounded-lg hover:shadow-lg neural-transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="text-xs font-medium neural-title line-clamp-2 mb-1">
                        {article.title}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs border-0", statusBadge.color)}>
                          {statusBadge.label}
                        </Badge>
                        {article.publishedAt && (
                          <span className="text-xs text-neural-text-muted">
                            {article.publishedAt}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {article.status === 'completed' && article.views && (
                    <div className="flex justify-between text-xs text-neural-text-muted mb-2">
                      <span>{article.views.toLocaleString()} PV</span>
                      <span>{article.engagement}% engagement</span>
                    </div>
                  )}

                  <div className="flex gap-1">
                    {article.status === 'completed' ? (
                      <>
                        <NeuralButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArticleAction('view', article)}
                          className="flex-1 text-xs h-7"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          表示
                        </NeuralButton>
                        <NeuralButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArticleAction('analytics', article)}
                          className="flex-1 text-xs h-7"
                        >
                          <BarChart3 className="h-3 w-3 mr-1" />
                          分析
                        </NeuralButton>
                      </>
                    ) : (
                      <NeuralButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArticleAction('edit', article)}
                        className="w-full text-xs h-7"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        編集
                      </NeuralButton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </NeuralCard>

      {/* Quick Actions */}
      <NeuralCard>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-neural-success" />
            クイックアクション
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <NeuralButton
            variant="gradient"
            onClick={handleNewArticle}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            新しい記事を作成
          </NeuralButton>

          <div className="space-y-2">
            <h4 className="text-sm font-medium neural-title">テンプレート</h4>
            <div className="grid grid-cols-1 gap-1">
              {data.quickTemplates.map((template, index) => (
                <NeuralButton
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTemplateGenerate(template)}
                  className="justify-start text-xs"
                >
                  <FileText className="h-3 w-3 mr-2" />
                  {template}
                </NeuralButton>
              ))}
            </div>
          </div>
        </CardContent>
      </NeuralCard>
    </div>
  )
}