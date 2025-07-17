'use client'

import React from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  HelpCircle, 
  Search, 
  Target, 
  Sparkles, 
  Eye, 
  MousePointer,
  Keyboard,
  ArrowRight,
  CheckCircle,
  Zap,
  Brain,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GuideStepProps {
  icon: React.ElementType
  title: string
  description: string
  tips?: string[]
  badge?: string
  gradient?: string
}

const GuideStep: React.FC<GuideStepProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  tips, 
  badge,
  gradient = 'neural-gradient-primary'
}) => (
  <Card className="neural-neumorphic border-0 group">
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          gradient
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base neural-title">{title}</CardTitle>
          {badge && (
            <Badge variant="outline" className="text-xs mt-1">
              {badge}
            </Badge>
          )}
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <p className="text-neural-text-secondary text-sm mb-3">
        {description}
      </p>
      {tips && (
        <div className="space-y-1">
          {tips.map((tip, index) => (
            <div key={index} className="flex items-start gap-2 text-xs text-neural-text-muted">
              <CheckCircle className="h-3 w-3 text-neural-success mt-0.5 flex-shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
)

interface UserGuideProps {
  trigger?: React.ReactNode
}

export function UserGuide({ trigger }: UserGuideProps) {
  const workflowSteps = [
    {
      icon: Search,
      title: "1. トピックを探す",
      description: "左側のTopicsセクションでAIが収集した最新の暗号通貨トピックを確認しましょう。",
      tips: [
        "検索窓でコインや関連語でフィルタリング可能",
        "優先度（緊急・高・中・低）でソート可能",
        "ハイブリッド分析トピックは価格データ付き",
        "下にスクロールして更多くのトピックを表示"
      ],
      badge: "Topics",
      gradient: "neural-gradient-success"
    },
    {
      icon: Target,
      title: "2. トピックを選択",
      description: "興味のあるトピックをクリックして選択し、記事生成の準備をします。",
      tips: [
        "トピックカードのスコアは注目度を示します",
        "分析型トピックは深い考察記事を生成",
        "標準型トピックはニュース記事を生成",
        "コイン情報と価格変動も自動で含まれます"
      ],
      badge: "Selection",
      gradient: "neural-gradient-primary"
    },
    {
      icon: Sparkles,
      title: "3. 記事を生成",
      description: "中央の「記事生成」セクションで、AIによる記事作成を開始します。",
      tips: [
        "生成ボタンをクリックして開始",
        "進行状況がリアルタイムで表示",
        "AIが自動で構成とコンテンツを作成",
        "生成には通常1-3分程度かかります"
      ],
      badge: "Generation",
      gradient: "neural-gradient-cyan"
    },
    {
      icon: Eye,
      title: "4. プレビュー&編集",
      description: "右側のPreviewセクションで生成された記事を確認し、必要に応じて編集します。",
      tips: [
        "リアルタイムでプレビュー表示",
        "直接編集してカスタマイズ可能",
        "HTMLとマークダウン形式対応",
        "完成したらWordPressに公開可能"
      ],
      badge: "Preview",
      gradient: "neural-gradient-orchid"
    }
  ]

  const shortcuts = [
    { key: "Ctrl + /", action: "このヘルプを表示" },
    { key: "Tab", action: "次のセクションに移動" },
    { key: "Shift + Tab", action: "前のセクションに移動" },
    { key: "Ctrl + G", action: "記事生成開始" },
    { key: "Escape", action: "モーダルを閉じる" }
  ]

  const features = [
    {
      icon: Brain,
      title: "AIによる自動分析",
      description: "最新の価格データとニュースを組み合わせて、深い洞察を提供"
    },
    {
      icon: TrendingUp,
      title: "リアルタイム市場データ",
      description: "CoinGecko APIから最新の価格・変動率・出来高を自動取得"
    },
    {
      icon: Zap,
      title: "高速生成エンジン",
      description: "複数のAIモデルを活用して1-3分で高品質な記事を生成"
    }
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="neural-button">
            <HelpCircle className="h-4 w-4 mr-2" />
            使い方ガイド
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto neural-surface">
        <DialogHeader>
          <DialogTitle className="text-2xl neural-title neural-glow-text mb-2">
            Neural Workspace 使い方ガイド
          </DialogTitle>
          <p className="text-neural-text-secondary">
            AI搭載の暗号通貨記事生成ワークスペースの使い方を学びましょう
          </p>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* 主要機能 */}
          <section>
            <h3 className="text-lg font-semibold neural-title mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-neural-cyan" />
              主要機能
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <Card key={index} className="neural-neumorphic border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <feature.icon className="h-5 w-5 text-neural-cyan" />
                      <h4 className="font-medium neural-title">{feature.title}</h4>
                    </div>
                    <p className="text-sm text-neural-text-secondary">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* ワークフロー */}
          <section>
            <h3 className="text-lg font-semibold neural-title mb-4 flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-neural-cyan" />
              記事作成ワークフロー
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflowSteps.map((step, index) => (
                <GuideStep key={index} {...step} />
              ))}
            </div>
          </section>

          {/* キーボードショートカット */}
          <section>
            <h3 className="text-lg font-semibold neural-title mb-4 flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-neural-cyan" />
              キーボードショートカット
            </h3>
            <Card className="neural-neumorphic border-0">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-neural-text-secondary">
                        {shortcut.action}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {shortcut.key}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 使用のコツ */}
          <section>
            <h3 className="text-lg font-semibold neural-title mb-4 flex items-center gap-2">
              <MousePointer className="h-5 w-5 text-neural-cyan" />
              効果的な使用のコツ
            </h3>
            <Card className="neural-neumorphic border-0">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-neural-success mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium neural-title text-sm">高品質記事のための選択</h4>
                      <p className="text-xs text-neural-text-secondary">
                        スコアが80以上のトピックを選ぶと、より注目度の高い記事が作成できます
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-neural-success mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium neural-title text-sm">分析型記事の活用</h4>
                      <p className="text-xs text-neural-text-secondary">
                        「分析」ラベルのトピックは、価格データと市場分析を組み合わせた深い記事が生成されます
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-neural-success mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium neural-title text-sm">タイミングの重要性</h4>
                      <p className="text-xs text-neural-text-secondary">
                        市場が大きく動いている時間帯（日本時間の朝・夜）により関連度の高いトピックが収集されます
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}