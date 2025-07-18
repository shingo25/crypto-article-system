'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'
import { useOptionalAuth } from '@/components/auth/AuthProvider'
import { requireAuthForRSSSource } from '@/lib/auth-helpers'
import {
  Rss,
  Plus,
  Trash2,
  Check,
  X,
  ExternalLink,
  Activity,
  Clock,
  Shield,
  AlertTriangle,
  RefreshCw,
  Globe,
  Settings
} from 'lucide-react'

interface RSSSource {
  id: string
  name: string
  url: string
  category: string
  enabled: boolean
  lastCollected?: string
  totalCollected: number
  status: 'active' | 'error' | 'inactive'
  description?: string
}

interface NewSource {
  name: string
  url: string
  category: string
  description: string
}

export default function RSSSourceManager() {
  const { isAuthenticated } = useOptionalAuth()
  const [sources, setSources] = useState<RSSSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSource, setNewSource] = useState<NewSource>({
    name: '',
    url: '',
    category: 'news',
    description: ''
  })
  const [testingUrl, setTestingUrl] = useState<string | null>(null)
  const [collectingSource, setCollectingSource] = useState<string | null>(null)

  // ソース一覧を取得
  const loadSources = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sources')
      const data = await response.json()
      
      if (data.success) {
        // APIレスポンスの形式に合わせて変換
        const transformedSources = data.sources?.map(source => ({
          id: source.id,
          name: source.name,
          url: source.url,
          category: source.type || 'news',
          enabled: source.active,
          lastCollected: source.lastUpdate,
          totalCollected: source.itemsCollected || 0,
          status: source.status || (source.active ? 'active' : 'inactive') as 'active' | 'error' | 'inactive',
          description: source.description
        })) || []
        setSources(transformedSources)
      } else {
        throw new Error(data.error || 'Failed to fetch sources')
      }
    } catch (error) {
      console.error('Failed to load RSS sources:', error)
      toast.error('RSSソースの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSources()
  }, [])

  // 新しいソースを追加
  const addSource = async () => {
    // 認証チェック
    if (!requireAuthForRSSSource(isAuthenticated)) {
      return
    }

    if (!newSource.name || !newSource.url) {
      toast.error('名前とURLは必須です')
      return
    }

    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newSource.name,
          url: newSource.url,
          type: newSource.category,
          description: newSource.description
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('RSSソースを追加しました')
        setNewSource({ name: '', url: '', category: 'news', description: '' })
        setShowAddForm(false)
        await loadSources()
      } else {
        toast.error(data.error || 'RSSソースの追加に失敗しました')
      }
    } catch (error) {
      console.error('Failed to add RSS source:', error)
      toast.error('RSSソースの追加に失敗しました')
    }
  }

  // ソースを削除
  const deleteSource = async (id: string) => {
    // 認証チェック
    if (!requireAuthForRSSSource(isAuthenticated)) {
      return
    }

    if (!confirm('このRSSソースを削除しますか？')) return

    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('RSSソースを削除しました')
        await loadSources()
      } else {
        toast.error(data.error || 'RSSソースの削除に失敗しました')
      }
    } catch (error) {
      console.error('Failed to delete RSS source:', error)
      toast.error('RSSソースの削除に失敗しました')
    }
  }

  // ソースの有効/無効を切り替え
  const toggleSource = async (id: string, enabled: boolean) => {
    // 認証チェック
    if (!requireAuthForRSSSource(isAuthenticated)) {
      return
    }

    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: enabled })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(`RSSソースを${enabled ? '有効' : '無効'}にしました`)
        await loadSources()
      } else {
        toast.error(data.error || 'RSSソースの更新に失敗しました')
      }
    } catch (error) {
      console.error('Failed to toggle RSS source:', error)
      toast.error('RSSソースの更新に失敗しました')
    }
  }

  // URLをテスト
  const testUrl = async (url: string) => {
    if (!url) return

    try {
      setTestingUrl(url)
      const response = await fetch('/api/sources/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      })
      
      const data = await response.json()
      
      if (data.success && data.valid) {
        toast.success('URLは有効です')
      } else {
        toast.error('URLが無効です: ' + (data.error || '不明なエラー'))
      }
    } catch (error) {
      console.error('Failed to test URL:', error)
      toast.error('URLテストに失敗しました')
    } finally {
      setTestingUrl(null)
    }
  }

  // 特定ソースからニュース収集
  const collectFromSource = async (id: string) => {
    try {
      setCollectingSource(id)
      const response = await fetch(`/api/sources/${id}/collect`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('ニュース収集を開始しました')
        // 少し待ってからソース一覧を更新
        setTimeout(() => loadSources(), 2000)
      } else {
        toast.error(data.error || 'ニュース収集の開始に失敗しました')
      }
    } catch (error) {
      console.error('Failed to collect from source:', error)
      toast.error('ニュース収集の開始に失敗しました')
    } finally {
      setCollectingSource(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 border-green-500/50 text-green-400">アクティブ</Badge>
      case 'error':
        return <Badge className="bg-red-500/20 border-red-500/50 text-red-400">エラー</Badge>
      case 'inactive':
        return <Badge className="bg-gray-500/20 border-gray-500/50 text-gray-400">非アクティブ</Badge>
      default:
        return <Badge className="bg-gray-500/20 border-gray-500/50 text-gray-400">不明</Badge>
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'news': return 'bg-blue-500/20 border-blue-500/50 text-blue-400'
      case 'analysis': return 'bg-purple-500/20 border-purple-500/50 text-purple-400'
      case 'market': return 'bg-green-500/20 border-green-500/50 text-green-400'
      case 'technology': return 'bg-orange-500/20 border-orange-500/50 text-orange-400'
      default: return 'bg-gray-500/20 border-gray-500/50 text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Rss className="h-6 w-6" />
            RSSソース管理
          </h3>
          <p className="text-gray-400 mt-1">
            トピック収集用のRSSフィードを管理します
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          新しいソースを追加
        </Button>
      </div>

      {/* 新規ソース追加フォーム */}
      {showAddForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">新しいRSSソースを追加</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source-name">ソース名</Label>
                <Input
                  id="source-name"
                  placeholder="例: CoinTelegraph"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source-category">カテゴリ</Label>
                <select
                  id="source-category"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  value={newSource.category}
                  onChange={(e) => setNewSource({ ...newSource, category: e.target.value })}
                >
                  <option value="news">ニュース</option>
                  <option value="analysis">分析</option>
                  <option value="market">市場情報</option>
                  <option value="technology">技術情報</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source-url">RSS URL</Label>
              <div className="flex gap-2">
                <Input
                  id="source-url"
                  placeholder="https://example.com/rss.xml"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  className="flex-1"
                />
                <Button
                  onClick={() => testUrl(newSource.url)}
                  disabled={!newSource.url || testingUrl === newSource.url}
                  variant="outline"
                  className="border-gray-600"
                >
                  {testingUrl === newSource.url ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  テスト
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source-description">説明（オプション）</Label>
              <Input
                id="source-description"
                placeholder="このソースの説明"
                value={newSource.description}
                onChange={(e) => setNewSource({ ...newSource, description: e.target.value })}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={addSource} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                追加
              </Button>
              <Button 
                onClick={() => {
                  setShowAddForm(false)
                  setNewSource({ name: '', url: '', category: 'news', description: '' })
                }}
                variant="outline"
                className="border-gray-600"
              >
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ソース一覧 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">登録済みRSSソース</CardTitle>
            <Button
              onClick={loadSources}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-gray-600"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              更新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-8">
              <Rss className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">RSSソースが登録されていません</p>
              <p className="text-gray-500 text-sm">上の「新しいソースを追加」ボタンから追加してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700/70 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-white font-medium">{source.name}</h4>
                        <Badge className={getCategoryColor(source.category)}>
                          {source.category}
                        </Badge>
                        {getStatusBadge(source.status)}
                        <Badge className={source.enabled ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-gray-500/20 border-gray-500/50 text-gray-400'}>
                          {source.enabled ? '有効' : '無効'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          {source.url}
                          <ExternalLink className="h-3 w-3 inline ml-1" />
                        </a>
                      </div>
                      
                      {source.description && (
                        <p className="text-gray-400 text-sm mb-2">{source.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          収集数: {source.totalCollected}
                        </div>
                        {source.lastCollected && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            最終収集: {new Date(source.lastCollected).toLocaleString('ja-JP')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        onClick={() => collectFromSource(source.id)}
                        disabled={collectingSource === source.id || !source.enabled}
                        size="sm"
                        variant="outline"
                        className="border-gray-600"
                      >
                        {collectingSource === source.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        収集
                      </Button>
                      
                      <Button
                        onClick={() => toggleSource(source.id, !source.enabled)}
                        size="sm"
                        variant="outline"
                        className="border-gray-600"
                      >
                        {source.enabled ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {source.enabled ? '無効化' : '有効化'}
                      </Button>
                      
                      <Button
                        onClick={() => deleteSource(source.id)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        削除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用方法の説明 */}
      <Alert className="border-blue-500/20 bg-blue-500/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-blue-300">
          <strong>使用方法：</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• RSSフィードのURLを追加して、自動的にトピックを収集できます</li>
            <li>• 各ソースは有効/無効を切り替えできます</li>
            <li>• 「収集」ボタンで手動でそのソースからトピックを収集できます</li>
            <li>• URLテスト機能でフィードの有効性を確認できます</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}