'use client'

// 動的レンダリングを強制（プリレンダリングエラー回避）
export const dynamic = 'force-dynamic'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { WorkspaceLayout } from '@/components/neural/workspace/WorkspaceLayout'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Sparkles, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
// import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useOptionalAuth } from '@/components/auth/AuthProvider'
import { requireAuthForArticle } from '@/lib/auth-helpers'

interface MarketContext {
  topic: string
  coin?: string
  source: 'market' | 'alert' | 'trend' | 'template' | 'manual'
  template?: string
  autoGenerate?: boolean
}

function WorkspaceContent() {
  const { isAuthenticated } = useOptionalAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    // URLパラメータからマーケット情報を取得
    const topic = searchParams?.get('topic')
    const coin = searchParams?.get('coin')
    const source = searchParams?.get('source') as MarketContext['source']
    const template = searchParams?.get('template')
    const edit = searchParams?.get('edit')

    if (topic || template || edit) {
      const context: MarketContext = {
        topic: topic || template || `記事編集 (ID: ${edit})`,
        coin: coin || undefined,
        source: source || 'manual',
        template: template || undefined,
        autoGenerate: Boolean(topic || template) && !edit
      }
      
      setMarketContext(context)
      
      if (context.autoGenerate) {
        // マーケット情報から来た場合は自動生成を開始
        handleAutoGenerate(context)
      }
    }
  }, [searchParams])

  const handleAutoGenerate = async (context: MarketContext) => {
    // 認証チェック
    if (!requireAuthForArticle(isAuthenticated)) {
      return
    }

    if (!context.topic) return

    setIsGenerating(true)
    
    try {
      // 実際の記事生成APIを呼び出し
      toast.success(`「${context.topic}」の自動生成を開始しました`)
      
      const response = await fetch('/api/articles/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_type: context.source === 'news' ? 'news' : 'topic',
          source_content: context.topic,
          topic: context.topic,
          ai_provider: 'gemini',
          style: 'detailed',
          length: 'medium'
        })
      })

      const data = await response.json()

      if (data.success) {
        // 生成成功時の処理
        toast.success('記事の草稿が生成されました')
        console.log('Generated article:', data.data.article)
        // TODO: 生成された記事をワークスペースに表示
      } else {
        throw new Error(data.error || '記事生成に失敗しました')
      }
      
    } catch (error) {
      console.error('Auto-generation failed:', error)
      toast.error(記事生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleBackToMarket = () => {
    router.push('/market')
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'market':
        return <BarChart3 className="h-4 w-4 text-neural-cyan" />
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-neural-warning" />
      case 'trend':
        return <BarChart3 className="h-4 w-4 text-neural-orchid" />
      case 'template':
        return <Sparkles className="h-4 w-4 text-neural-success" />
      default:
        return <CheckCircle className="h-4 w-4 text-neural-text-muted" />
    }
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'market': return 'マーケット分析'
      case 'alert': return 'マーケットアラート'
      case 'trend': return 'トレンド分析'
      case 'template': return 'テンプレート'
      default: return '手動作成'
    }
  }

  return (
    <div className="min-h-screen">
      {/* マーケット情報からの生成の場合のヘッダー */}
      {marketContext && marketContext.source !== 'manual' && (
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <NeuralCard className="mb-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <NeuralButton
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToMarket}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </NeuralButton>
                  
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {getSourceIcon(marketContext.source)}
                      マーケット情報からの記事生成
                    </CardTitle>
                    <p className="text-neural-text-secondary text-sm mt-1">
                      {getSourceLabel(marketContext.source)}から自動生成された記事草稿
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className="text-xs">
                    {getSourceLabel(marketContext.source)}
                  </Badge>
                  {marketContext.coin && (
                    <Badge variant="outline" className="text-xs">
                      {marketContext.coin}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium neural-title mb-1">生成トピック</h3>
                  <p className="text-neural-text-secondary text-sm">
                    {marketContext.topic}
                  </p>
                </div>
                
                {isGenerating && (
                  <div className="flex items-center gap-2 p-3 neural-neumorphic-inset rounded-lg">
                    <Clock className="h-4 w-4 text-neural-cyan animate-spin" />
                    <span className="text-sm neural-title">
                      AI が記事を生成中です...
                    </span>
                  </div>
                )}
                
                {!isGenerating && marketContext.autoGenerate && (
                  <div className="flex items-center gap-2 p-3 neural-neumorphic-inset rounded-lg">
                    <CheckCircle className="h-4 w-4 text-neural-success" />
                    <span className="text-sm neural-title">
                      記事の草稿が生成されました。以下で編集できます。
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </NeuralCard>
        </div>
      )}
      
      {/* 通常のワークスペースレイアウト */}
      <WorkspaceLayout 
        initialTopic={marketContext?.topic}
        initialCoin={marketContext?.coin}
        isAutoGenerated={marketContext?.autoGenerate && !isGenerating}
      />
    </div>
  )
}

export default function ContentWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-neural-elevated rounded mb-4"></div>
          <div className="h-64 bg-neural-elevated rounded"></div>
        </div>
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  )
}