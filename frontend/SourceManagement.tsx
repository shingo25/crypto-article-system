'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Plus, Trash2, Globe, Rss, Database, TestTube, CheckCircle, X } from "lucide-react"
import { apiClient } from '@/lib/api'

interface Source {
  id: string
  name: string
  type: 'rss' | 'api' | 'web'
  url: string
  active: boolean
  lastUpdate?: string
  itemsCollected?: number
  description?: string
}

interface TestResult {
  success: boolean
  message: string
  itemsFound?: number
}

export default function SourceManagement() {
  const [sources, setSources] = useState<Source[]>([])

  const [newSource, setNewSource] = useState({
    name: '',
    type: 'rss' as 'rss' | 'api' | 'web',
    url: '',
    description: ''
  })

  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [isTestingSource, setIsTestingSource] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAddingSource, setIsAddingSource] = useState(false)

  // 初期データ取得
  useEffect(() => {
    fetchSources()
  }, [])

  const fetchSources = async () => {
    try {
      const response = await apiClient.getSources()
      if (response.success) {
        setSources(response.sources)
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error)
      setError('ソース一覧の取得に失敗しました')
    }
  }

  const handleAddSource = async () => {
    if (!newSource.name || !newSource.url) {
      setError('名前とURLを入力してください')
      return
    }

    try {
      const response = await apiClient.addSource(newSource)
      if (response.success) {
        await fetchSources() // ソース一覧を再取得
        setNewSource({ name: '', type: 'rss', url: '', description: '' })
        setError(null)
        setIsAddingSource(false)
        alert(response.message)
      } else {
        setError('ソースの追加に失敗しました')
      }
    } catch (error) {
      console.error('Failed to add source:', error)
      setError('ソースの追加に失敗しました')
    }
  }

  const handleRemoveSource = async (sourceId: string) => {
    if (!confirm('このソースを削除しますか？')) return

    try {
      const response = await apiClient.deleteSource(sourceId)
      if (response.success) {
        await fetchSources()
        alert(response.message)
      }
    } catch (error) {
      console.error('Failed to delete source:', error)
      setError('ソースの削除に失敗しました')
    }
  }

  const handleToggleSource = async (sourceId: string) => {
    try {
      const source = sources.find(s => s.id === sourceId)
      if (source) {
        const response = await apiClient.updateSource(sourceId, { active: !source.active })
        if (response.success) {
          await fetchSources()
        }
      }
    } catch (error) {
      console.error('Failed to toggle source:', error)
      setError('ソースの切り替えに失敗しました')
    }
  }

  const handleTestSource = async (source: Source) => {
    setIsTestingSource(source.id)
    setTestResults(prev => ({ ...prev, [source.id]: undefined as any }))

    try {
      const result = await apiClient.testSourceUrl(source.url, source.type)
      setTestResults(prev => ({ 
        ...prev, 
        [source.id]: {
          success: result.success,
          message: result.message,
          itemsFound: result.items_found
        }
      }))
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [source.id]: { 
          success: false, 
          message: 'テストに失敗しました: ' + (error as Error).message 
        }
      }))
    } finally {
      setIsTestingSource(null)
    }
  }

  const handleCollectFromSource = async (sourceId: string) => {
    try {
      const response = await apiClient.collectFromSource(sourceId)
      if (response.success) {
        alert(response.message)
        await fetchSources() // ソース統計を更新
      }
    } catch (error) {
      console.error('Failed to collect from source:', error)
      setError('トピック収集の開始に失敗しました')
    }
  }

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'rss': return <Rss className="h-4 w-4" />
      case 'api': return <Database className="h-4 w-4" />
      case 'web': return <Globe className="h-4 w-4" />
      default: return <Globe className="h-4 w-4" />
    }
  }

  const getSourceTypeLabel = (type: string) => {
    switch (type) {
      case 'rss': return 'RSS配信'
      case 'api': return 'API'
      case 'web': return 'ウェブサイト'
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="h-5 w-5" />
                トピック収集源管理
              </CardTitle>
              <CardDescription className="text-slate-400">
                記事トピックを収集するソース（RSS、API、ウェブサイト）の管理
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsAddingSource(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              ソース追加
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert className="bg-red-900 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 新しいソース追加フォーム */}
      {isAddingSource && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">新しいソースを追加</CardTitle>
              <Button
                onClick={() => setIsAddingSource(false)}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">ソース名</Label>
                <Input
                  placeholder="例: 新しいニュースサイト"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  className="mt-2 bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <Label className="text-white">タイプ</Label>
                <select
                  value={newSource.type}
                  onChange={(e) => setNewSource({ ...newSource, type: e.target.value as any })}
                  className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                >
                  <option value="rss">RSS配信</option>
                  <option value="api">API</option>
                  <option value="web">ウェブサイト</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-white">URL</Label>
              <Input
                placeholder="https://example.com/rss または https://api.example.com/data"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                className="mt-2 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-white">説明（任意）</Label>
              <Input
                placeholder="このソースの説明"
                value={newSource.description}
                onChange={(e) => setNewSource({ ...newSource, description: e.target.value })}
                className="mt-2 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setIsAddingSource(false)}
                variant="outline"
                className="border-slate-600 text-slate-300"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleAddSource}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                追加
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ソース一覧 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">
            登録済みソース ({sources.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sources.map((source) => (
              <div
                key={source.id}
                className="p-4 bg-slate-700 border border-slate-600 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {getSourceIcon(source.type)}
                        <h3 className="text-white font-medium">{source.name}</h3>
                      </div>
                      <Badge 
                        className={`${source.active ? 'bg-green-500' : 'bg-gray-500'} text-white`}
                      >
                        {source.active ? '有効' : '無効'}
                      </Badge>
                      <Badge variant="outline" className="border-blue-600 text-blue-400">
                        {getSourceTypeLabel(source.type)}
                      </Badge>
                    </div>

                    <div className="text-sm text-slate-300 mb-2">
                      <strong>URL:</strong> {source.url}
                    </div>

                    {source.description && (
                      <div className="text-sm text-slate-400 mb-2">
                        {source.description}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      {source.lastUpdate && (
                        <span>最終更新: {source.lastUpdate}</span>
                      )}
                      {source.itemsCollected !== undefined && (
                        <span>収集数: {source.itemsCollected}件</span>
                      )}
                    </div>

                    {/* テスト結果 */}
                    {testResults[source.id] && (
                      <div className={`mt-3 p-2 rounded text-sm ${
                        testResults[source.id].success 
                          ? 'bg-green-900 text-green-200' 
                          : 'bg-red-900 text-red-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {testResults[source.id].success ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          <span>{testResults[source.id].message}</span>
                        </div>
                        {testResults[source.id].itemsFound !== undefined && (
                          <div className="mt-1 text-xs">
                            検出項目数: {testResults[source.id].itemsFound}件
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleTestSource(source)}
                      disabled={isTestingSource === source.id}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isTestingSource === source.id ? (
                        <>
                          <TestTube className="h-4 w-4 mr-1 animate-spin" />
                          テスト中
                        </>
                      ) : (
                        <>
                          <TestTube className="h-4 w-4 mr-1" />
                          テスト
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleCollectFromSource(source.id)}
                      disabled={!source.active}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      収集実行
                    </Button>

                    <Button
                      onClick={() => handleToggleSource(source.id)}
                      size="sm"
                      variant="outline"
                      className={`border-slate-600 ${
                        source.active 
                          ? 'text-yellow-400 hover:bg-yellow-600' 
                          : 'text-green-400 hover:bg-green-600'
                      }`}
                    >
                      {source.active ? '無効化' : '有効化'}
                    </Button>

                    <Button
                      onClick={() => handleRemoveSource(source.id)}
                      size="sm"
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {sources.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                登録されているソースがありません
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 推奨ソース */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">推奨ソース</CardTitle>
          <CardDescription className="text-slate-400">
            よく使われる暗号通貨情報源
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: 'CoinDesk RSS',
                type: 'rss',
                url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
                description: '暗号通貨ニュースの老舗メディア'
              },
              {
                name: 'CryptoPanic API',
                type: 'api', 
                url: 'https://cryptopanic.com/api/v1/posts/',
                description: '暗号通貨ニュース・感情分析'
              },
              {
                name: 'Decrypt RSS',
                type: 'rss',
                url: 'https://decrypt.co/feed',
                description: 'Web3・DeFi専門メディア'
              },
              {
                name: 'CoinMarketCap News',
                type: 'api',
                url: 'https://api.coinmarketcap.com/data-api/v3/news/list',
                description: '時価総額サイトのニュース'
              }
            ].map((rec, index) => (
              <div key={index} className="p-3 bg-slate-700 rounded border border-slate-600">
                <div className="flex items-center gap-2 mb-2">
                  {getSourceIcon(rec.type)}
                  <span className="text-white font-medium">{rec.name}</span>
                  <Badge variant="outline" className="border-purple-600 text-purple-400">
                    {getSourceTypeLabel(rec.type)}
                  </Badge>
                </div>
                <div className="text-sm text-slate-300 mb-2">{rec.url}</div>
                <div className="text-xs text-slate-400 mb-3">{rec.description}</div>
                <Button
                  onClick={() => {
                    setNewSource({
                      name: rec.name,
                      type: rec.type as any,
                      url: rec.url,
                      description: rec.description
                    })
                    setIsAddingSource(true)
                  }}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  追加
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}