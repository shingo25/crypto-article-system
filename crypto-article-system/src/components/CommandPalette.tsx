'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useArticles } from '@/hooks/useArticles'
import { useTopics } from '@/hooks/useTopics'
import { useSystemStats } from '@/hooks/useSystemStats'
import toast from 'react-hot-toast'
import { 
  Search,
  FileText,
  Hash,
  Settings,
  Database,
  Zap,
  TrendingUp,
  Shield,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  Plus,
  BarChart3,
  Layout
} from 'lucide-react'

interface Command {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action: () => void
  category: 'navigation' | 'actions' | 'articles' | 'topics' | 'system'
  keywords: string[]
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const { articles, generateArticle } = useArticles()
  const { topics, collectTopics } = useTopics()
  const { stats, refreshStats } = useSystemStats()

  // コマンド定義
  const commands: Command[] = useMemo(() => [
    // ナビゲーション
    {
      id: 'nav-home',
      title: 'ホームに移動',
      description: 'メインダッシュボードに移動',
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => router.push('/'),
      category: 'navigation',
      keywords: ['home', 'dashboard', 'ホーム', 'ダッシュボード']
    },
    {
      id: 'nav-articles',
      title: '記事一覧',
      description: '生成された記事の一覧を表示',
      icon: <FileText className="h-4 w-4" />,
      action: () => router.push('/articles'),
      category: 'navigation',
      keywords: ['articles', '記事', 'article', '一覧']
    },
    {
      id: 'nav-topics',
      title: 'トピック管理',
      description: '収集されたトピックを管理',
      icon: <Hash className="h-4 w-4" />,
      action: () => router.push('/topics'),
      category: 'navigation',
      keywords: ['topics', 'トピック', 'topic', '管理']
    },
    {
      id: 'nav-templates',
      title: 'テンプレート管理',
      description: '記事テンプレートの管理・編集',
      icon: <Layout className="h-4 w-4" />,
      action: () => router.push('/templates'),
      category: 'navigation',
      keywords: ['templates', 'テンプレート', 'template', '管理']
    },
    {
      id: 'nav-settings',
      title: '設定',
      description: 'システム設定画面',
      icon: <Settings className="h-4 w-4" />,
      action: () => router.push('/settings'),
      category: 'navigation',
      keywords: ['settings', '設定', 'config', '設定画面']
    },

    // アクション
    {
      id: 'action-collect-topics',
      title: 'トピック収集',
      description: '新しいトピックを収集',
      icon: <Download className="h-4 w-4" />,
      action: async () => {
        toast.loading('トピック収集中...')
        try {
          await collectTopics()
          toast.success('トピック収集を開始しました')
        } catch (error) {
          toast.error('トピック収集に失敗しました')
        }
      },
      category: 'actions',
      keywords: ['collect', 'topics', '収集', 'トピック', '取得']
    },
    {
      id: 'action-refresh-stats',
      title: '統計を更新',
      description: 'システム統計を再取得',
      icon: <RefreshCw className="h-4 w-4" />,
      action: async () => {
        toast.loading('統計更新中...')
        try {
          await refreshStats()
          toast.success('統計を更新しました')
        } catch (error) {
          toast.error('統計更新に失敗しました')
        }
      },
      category: 'actions',
      keywords: ['refresh', 'stats', '統計', '更新', 'システム']
    },

    // 記事関連
    ...articles.slice(0, 5).map(article => ({
      id: `article-${article.id}`,
      title: `記事を開く: ${article.title}`,
      description: `${article.type} | ${article.wordCount}文字`,
      icon: <FileText className="h-4 w-4" />,
      action: () => router.push(`/articles/${article.id}`),
      category: 'articles' as const,
      keywords: ['article', '記事', article.title, article.type]
    })),

    // トピック関連
    ...topics.slice(0, 5).map(topic => ({
      id: `topic-${topic.id}`,
      title: `記事生成: ${topic.title}`,
      description: `スコア: ${topic.score} | ${topic.coins.join(', ')}`,
      icon: <Zap className="h-4 w-4" />,
      action: async () => {
        toast.loading('記事生成中...')
        try {
          await generateArticle(topic.id)
          toast.success('記事生成を開始しました')
        } catch (error) {
          toast.error('記事生成に失敗しました')
        }
      },
      category: 'topics' as const,
      keywords: ['generate', 'topic', '生成', 'トピック', topic.title]
    })),

    // システム
    {
      id: 'system-status',
      title: 'システム状態',
      description: `記事: ${stats?.articlesGenerated || 0}件 | トピック: ${stats?.topicsCollected || 0}件`,
      icon: <Database className="h-4 w-4" />,
      action: () => toast.success(`システム状態: ${stats?.systemStatus || 'Unknown'}`),
      category: 'system',
      keywords: ['system', 'status', 'システム', '状態', '統計']
    },
    {
      id: 'system-fact-check',
      title: 'ファクトチェック実行',
      description: '最新記事のファクトチェックを実行',
      icon: <Shield className="h-4 w-4" />,
      action: () => {
        if (articles.length > 0) {
          router.push(`/articles/${articles[0].id}?factcheck=true`)
        } else {
          toast.error('ファクトチェックする記事がありません')
        }
      },
      category: 'system',
      keywords: ['fact', 'check', 'ファクト', 'チェック', '検証']
    }
  ], [articles, topics, stats, router, collectTopics, refreshStats, generateArticle])

  // 検索フィルタリング
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands

    const searchLower = search.toLowerCase()
    return commands.filter(command => 
      command.title.toLowerCase().includes(searchLower) ||
      command.description.toLowerCase().includes(searchLower) ||
      command.keywords.some(keyword => keyword.toLowerCase().includes(searchLower))
    )
  }, [commands, search])

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          )
          break
        case 'Enter':
          event.preventDefault()
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action()
            onClose()
          }
          break
        case 'Escape':
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose])

  // 選択インデックスのリセット
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // ダイアログが開いたときの初期化
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'actions': return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'articles': return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      case 'topics': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'system': return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'navigation': return 'ナビ'
      case 'actions': return 'アクション'
      case 'articles': return '記事'
      case 'topics': return 'トピック'
      case 'system': return 'システム'
      default: return '他'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900/95 border-gray-700 backdrop-blur-xl p-0 max-w-2xl">
        <div className="flex flex-col">
          {/* 検索ヘッダー */}
          <div className="p-4 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="コマンドを検索... (Ctrl+K)"
                className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* コマンドリスト */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>「{search}」に一致するコマンドが見つかりません</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredCommands.map((command, index) => (
                  <div
                    key={command.id}
                    onClick={() => {
                      command.action()
                      onClose()
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      index === selectedIndex
                        ? 'bg-blue-600/20 border border-blue-500/50'
                        : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {command.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium truncate">
                          {command.title}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getCategoryColor(command.category)}`}
                        >
                          {getCategoryLabel(command.category)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {command.description}
                      </p>
                    </div>
                    {index === selectedIndex && (
                      <div className="flex-shrink-0 text-xs text-gray-500">
                        Enter
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="p-3 border-t border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-4">
                <span>↑↓ 選択</span>
                <span>Enter 実行</span>
                <span>Esc 閉じる</span>
              </div>
              <div>
                {filteredCommands.length} / {commands.length} コマンド
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}