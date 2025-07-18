'use client'

// 動的レンダリングを強制（プリレンダリングエラー回避）
export const dynamic = 'force-dynamic'

import React from 'react'
import { useRouter } from 'next/navigation'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { 
  FileText, 
  Edit, 
  Sparkles, 
  Plus,
  ArrowRight,
  Clock,
  BarChart3
} from 'lucide-react'

export default function ContentPage() {
  const router = useRouter()

  const handleNewArticle = () => {
    router.push('/content/workspace')
  }

  const handleViewArticles = () => {
    router.push('/content/articles')
  }

  const handleViewTemplates = () => {
    router.push('/content/templates')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold neural-title neural-glow-text mb-2">
          Content Management
        </h1>
        <p className="text-neural-text-secondary">
          Create, manage, and analyze your crypto content
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* New Article */}
        <NeuralCard className="hover:shadow-xl neural-transition cursor-pointer" onClick={handleNewArticle}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-neural-success" />
              新しい記事
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neural-text-secondary mb-4">
              新しい記事を作成、マーケット情報から自動生成、またはテンプレートから開始
            </p>
            <NeuralButton variant="gradient" className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              記事作成を開始
              <ArrowRight className="h-4 w-4 ml-2" />
            </NeuralButton>
          </CardContent>
        </NeuralCard>

        {/* Workspace */}
        <NeuralCard className="hover:shadow-xl neural-transition cursor-pointer" onClick={() => router.push('/content/workspace')}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Edit className="h-5 w-5 text-neural-cyan" />
              ワークスペース
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neural-text-secondary mb-4">
              記事編集、AI生成、プレビュー機能を統合した作業環境
            </p>
            <NeuralButton variant="ghost" className="w-full">
              <Edit className="h-4 w-4 mr-2" />
              ワークスペースを開く
              <ArrowRight className="h-4 w-4 ml-2" />
            </NeuralButton>
          </CardContent>
        </NeuralCard>

        {/* Article Management */}
        <NeuralCard className="hover:shadow-xl neural-transition cursor-pointer" onClick={handleViewArticles}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-neural-orchid" />
              記事管理
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neural-text-secondary mb-4">
              既存記事の管理、編集、公開状態の変更
            </p>
            <NeuralButton variant="ghost" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              記事一覧を表示
              <ArrowRight className="h-4 w-4 ml-2" />
            </NeuralButton>
          </CardContent>
        </NeuralCard>

        {/* Templates */}
        <NeuralCard className="hover:shadow-xl neural-transition cursor-pointer" onClick={handleViewTemplates}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-neural-warning" />
              テンプレート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neural-text-secondary mb-4">
              記事テンプレートの管理と新規テンプレート作成
            </p>
            <NeuralButton variant="ghost" className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              テンプレート管理
              <ArrowRight className="h-4 w-4 ml-2" />
            </NeuralButton>
          </CardContent>
        </NeuralCard>

        {/* Analytics Preview */}
        <NeuralCard className="hover:shadow-xl neural-transition cursor-pointer" onClick={() => router.push('/analytics')}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-neural-success" />
              パフォーマンス
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neural-text-secondary mb-4">
              記事のパフォーマンス分析と詳細レポート
            </p>
            <NeuralButton variant="ghost" className="w-full">
              <BarChart3 className="h-4 w-4 mr-2" />
              分析を表示
              <ArrowRight className="h-4 w-4 ml-2" />
            </NeuralButton>
          </CardContent>
        </NeuralCard>

        {/* Quick Stats */}
        <NeuralCard>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-neural-text-muted" />
              最近の活動
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neural-text-secondary">今日の記事</span>
                <span className="font-medium neural-title">12</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neural-text-secondary">下書き</span>
                <span className="font-medium neural-title">3</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neural-text-secondary">レビュー待ち</span>
                <span className="font-medium neural-title">2</span>
              </div>
            </div>
          </CardContent>
        </NeuralCard>
      </div>
    </div>
  )
}