'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import toast from 'react-hot-toast'
import {
  Plus,
  Edit3,
  Copy,
  Trash2,
  FileText,
  Zap,
  Settings,
  TrendingUp,
  BarChart3,
  Coins,
  Users,
  Lock,
  Unlock
} from 'lucide-react'

interface ArticleTemplate {
  id: string
  name: string
  description: string
  category: string
  articleType: string
  tone: string
  targetLength: number
  structure: string[]
  requiredElements: string[]
  keywordsTemplate: string[]
  systemPrompt: string
  userPromptTemplate: string
  seoTitleTemplate: string
  metaDescriptionTemplate: string
  usageCount: number
  isActive: boolean
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

// デフォルトテンプレート
const defaultTemplates: Omit<ArticleTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'マーケット分析',
    description: '暗号通貨の市場動向を分析する記事テンプレート',
    category: 'market_analysis',
    articleType: 'analysis',
    tone: 'professional',
    targetLength: 1200,
    structure: [
      '概要・サマリー',
      '現在の市場状況',
      '価格動向分析',
      '重要なイベント・ニュース',
      '技術指標分析',
      '今後の見通し',
      'まとめ'
    ],
    requiredElements: ['価格チャート', 'ボリューム分析', '技術指標', '市場センチメント'],
    keywordsTemplate: ['暗号通貨', '市場分析', '価格予測', 'テクニカル分析'],
    systemPrompt: 'あなたは暗号通貨の専門アナリストです。客観的なデータに基づいて市場分析を行い、投資判断に有用な情報を提供してください。',
    userPromptTemplate: '{coin_name}の市場分析記事を作成してください。現在の価格は{current_price}、24時間変動率は{price_change_24h}%です。',
    seoTitleTemplate: '{coin_name}マーケット分析 | 最新価格動向と投資戦略',
    metaDescriptionTemplate: '{coin_name}の最新市場分析。価格動向、技術指標、今後の見通しを専門アナリストが解説。',
    isActive: true,
    isPublic: true
  },
  {
    name: '新規コイン紹介',
    description: '新しく上場した暗号通貨の紹介記事テンプレート',
    category: 'coin_review',
    articleType: 'review',
    tone: 'professional',
    targetLength: 800,
    structure: [
      'コイン概要',
      'プロジェクトの目的・ビジョン',
      '技術的特徴',
      'トークノミクス',
      'チーム・パートナーシップ',
      'ロードマップ',
      'リスク要因',
      '投資判断'
    ],
    requiredElements: ['プロジェクト概要', 'トークン詳細', 'チーム情報', 'ロードマップ'],
    keywordsTemplate: ['新規上場', 'アルトコイン', 'DeFi', 'プロジェクト分析'],
    systemPrompt: 'あなたは暗号通貨プロジェクトの調査専門家です。新規プロジェクトを公正に評価し、投資家に有用な情報を提供してください。',
    userPromptTemplate: '{project_name}({token_symbol})の詳細分析記事を作成してください。プロジェクトの特徴: {project_features}',
    seoTitleTemplate: '{project_name}({token_symbol})とは？新規暗号通貨の完全ガイド',
    metaDescriptionTemplate: '{project_name}の特徴、技術、投資価値を詳しく解説。新規暗号通貨の投資判断に必要な情報をお届け。',
    isActive: true,
    isPublic: true
  },
  {
    name: 'テクニカル分析',
    description: 'チャート分析に特化した記事テンプレート',
    category: 'technical_analysis',
    articleType: 'analysis',
    tone: 'technical',
    targetLength: 1000,
    structure: [
      'チャート概要',
      'サポート・レジスタンスライン',
      'トレンドライン分析',
      'テクニカル指標分析',
      'パターン分析',
      '短期・中期・長期予測',
      'トレード戦略',
      'リスク管理'
    ],
    requiredElements: ['価格チャート', 'テクニカル指標', 'トレンドライン', 'ボリューム分析'],
    keywordsTemplate: ['テクニカル分析', 'チャート分析', 'トレンド', 'サポートライン', 'レジスタンスライン'],
    systemPrompt: 'あなたは経験豊富なテクニカルアナリストです。チャートパターンと技術指標を用いて、精密な分析を行ってください。',
    userPromptTemplate: '{coin_name}のテクニカル分析を行ってください。現在価格: {current_price}、重要なサポートライン: {support_level}、レジスタンスライン: {resistance_level}',
    seoTitleTemplate: '{coin_name}テクニカル分析 | チャートパターンと予測',
    metaDescriptionTemplate: '{coin_name}の詳細テクニカル分析。チャートパターン、技術指標、トレード戦略を専門家が解説。',
    isActive: true,
    isPublic: true
  },
  {
    name: 'ニュース解説',
    description: '暗号通貨関連ニュースの解説記事テンプレート',
    category: 'news_analysis',
    articleType: 'news',
    tone: 'casual',
    targetLength: 600,
    structure: [
      'ニュース概要',
      '背景・コンテキスト',
      '市場への影響分析',
      '関連銘柄への影響',
      '今後の展開予測',
      'まとめ'
    ],
    requiredElements: ['ニュースソース', '影響分析', '関連銘柄', '時系列情報'],
    keywordsTemplate: ['暗号通貨ニュース', '市場影響', '規制', 'DeFi', 'NFT'],
    systemPrompt: 'あなたは暗号通貨ニュースの解説専門家です。複雑なニュースを分かりやすく解説し、市場への影響を分析してください。',
    userPromptTemplate: '以下のニュースについて解説記事を作成してください: {news_content}。関連する暗号通貨: {related_coins}',
    seoTitleTemplate: '{news_title} | 暗号通貨市場への影響を解説',
    metaDescriptionTemplate: '{news_title}の詳細解説。暗号通貨市場への影響と今後の展開を分析。',
    isActive: true,
    isPublic: true
  }
]

export function TemplateManager() {
  const [templates, setTemplates] = useState<ArticleTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ArticleTemplate | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 初期データの設定
  React.useEffect(() => {
    const initialTemplates: ArticleTemplate[] = defaultTemplates.map((template, index) => ({
      ...template,
      id: `template-${index + 1}`,
      usageCount: Math.floor(Math.random() * 50),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
    setTemplates(initialTemplates)
  }, [])

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'market_analysis': return <TrendingUp className="h-4 w-4" />
      case 'coin_review': return <Coins className="h-4 w-4" />
      case 'technical_analysis': return <BarChart3 className="h-4 w-4" />
      case 'news_analysis': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'market_analysis': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'coin_review': return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'technical_analysis': return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      case 'news_analysis': return 'bg-orange-500/20 text-orange-400 border-orange-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'market_analysis': return 'マーケット分析'
      case 'coin_review': return 'コイン紹介'
      case 'technical_analysis': return 'テクニカル分析'
      case 'news_analysis': return 'ニュース解説'
      default: return 'その他'
    }
  }

  const handleUseTemplate = (template: ArticleTemplate) => {
    // テンプレートを使用して記事生成フォームに遷移
    toast.success(`テンプレート「${template.name}」を適用しました`)
    // 実際の実装では、記事生成画面にテンプレート情報を渡す
  }

  const handleDuplicateTemplate = (template: ArticleTemplate) => {
    const newTemplate: ArticleTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (コピー)`,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setTemplates(prev => [...prev, newTemplate])
    toast.success('テンプレートを複製しました')
  }

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId))
    toast.success('テンプレートを削除しました')
  }

  const handleToggleActive = (templateId: string) => {
    setTemplates(prev => prev.map(t => 
      t.id === templateId ? { ...t, isActive: !t.isActive } : t
    ))
    toast.success('テンプレートの状態を更新しました')
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">記事テンプレート管理</h2>
          <p className="text-gray-400 mt-1">記事の品質を均一化し、生成効率を向上</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              新規テンプレート
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">新規テンプレート作成</DialogTitle>
            </DialogHeader>
            {/* テンプレート作成フォーム - 簡略版 */}
            <div className="space-y-4">
              <p className="text-gray-400">テンプレート作成機能は実装中です</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 検索・フィルター */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="テンプレートを検索..."
            className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{filteredTemplates.length} / {templates.length} テンプレート</span>
        </div>
      </div>

      {/* テンプレート一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(template.category)}
                  <CardTitle className="text-lg text-white">{template.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  {template.isPublic ? (
                    <Unlock className="h-4 w-4 text-green-400" />
                  ) : (
                    <Lock className="h-4 w-4 text-gray-400" />
                  )}
                  {!template.isActive && (
                    <div className="w-2 h-2 bg-red-500 rounded-full" title="無効" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getCategoryColor(template.category)}>
                  {getCategoryLabel(template.category)}
                </Badge>
                <Badge variant="outline" className="text-gray-400 border-gray-600">
                  {template.tone}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-300 line-clamp-2">
                {template.description}
              </p>
              
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>目標文字数:</span>
                  <span>{template.targetLength.toLocaleString()}文字</span>
                </div>
                <div className="flex justify-between">
                  <span>使用回数:</span>
                  <span>{template.usageCount}回</span>
                </div>
                <div className="flex justify-between">
                  <span>構成要素:</span>
                  <span>{template.structure.length}項目</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => handleUseTemplate(template)}
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={!template.isActive}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  使用
                </Button>
                <Button
                  onClick={() => handleDuplicateTemplate(template)}
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => {
                    setSelectedTemplate(template)
                    setIsEditDialogOpen(true)
                  }}
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => handleDeleteTemplate(template.id)}
                  size="sm"
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-700/20"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">テンプレートが見つかりません</h3>
          <p className="text-gray-500">検索条件を変更するか、新しいテンプレートを作成してください</p>
        </div>
      )}
    </div>
  )
}