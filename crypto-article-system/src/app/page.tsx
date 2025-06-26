'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiClient } from '@/lib/api'
import SettingsPage from '@/components/SettingsPage'

// モックデータの型定義
interface SystemStats {
  articlesGenerated: number
  topicsCollected: number
  systemStatus: 'running' | 'stopped' | 'error'
  lastRun: string
  dailyQuota: {
    used: number
    total: number
  }
}

interface Topic {
  id: string
  title: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  score: number
  coins: string[]
  collectedAt: string
}

interface Article {
  id: string
  title: string
  type: string
  wordCount: number
  status: 'draft' | 'published' | 'pending'
  generatedAt: string
  coins: string[]
}

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard')
  const [systemStats, setSystemStats] = useState<SystemStats>({
    articlesGenerated: 0,
    topicsCollected: 0,
    systemStatus: 'stopped',
    lastRun: '',
    dailyQuota: { used: 0, total: 50 }
  })

  const [recentTopics, setRecentTopics] = useState<Topic[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)

  const [recentArticles, setRecentArticles] = useState<Article[]>([])

  // データ取得のuseEffect
  useEffect(() => {
    const fetchData = async () => {
      try {
        // システム統計を取得
        const stats = await apiClient.getSystemStats()
        setSystemStats(stats)
        
        // トピックを取得
        const topicsResponse = await apiClient.getTopics({ limit: 10 })
        setRecentTopics(topicsResponse.topics)
        
        // 記事を取得
        const articlesResponse = await apiClient.getArticles({ limit: 10 })
        setRecentArticles(articlesResponse.articles)
        
      } catch (error) {
        console.error('Failed to fetch data:', error)
        // エラー時はモックデータを表示
        setRecentTopics([
          {
            id: '1',
            title: 'APIから取得できませんでした - モックデータ',
            priority: 'medium',
            score: 50,
            coins: ['BTC'],
            collectedAt: new Date().toISOString()
          }
        ])
      }
    }

    fetchData()
    
    // 30秒ごとにデータを更新
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  // システム制御
  const handleSystemControl = async () => {
    try {
      const action = systemStats.systemStatus === 'running' ? 'stop' : 'start'
      await apiClient.controlSystem(action)
      
      // システム統計を再取得
      const stats = await apiClient.getSystemStats()
      setSystemStats(stats)
    } catch (error) {
      console.error('Failed to control system:', error)
      alert('システム制御に失敗しました')
    }
  }

  // 記事生成
  const handleGenerateArticle = async (topicId: string) => {
    try {
      await apiClient.generateArticle(topicId)
      alert('記事生成を開始しました')
      
      // 記事一覧を再取得（少し待ってから）
      setTimeout(async () => {
        const articlesResponse = await apiClient.getArticles({ limit: 10 })
        setRecentArticles(articlesResponse.articles)
      }, 2000)
    } catch (error) {
      console.error('Failed to generate article:', error)
      alert('記事生成に失敗しました')
    }
  }

  // トピック手動更新
  const handleRefreshTopics = async () => {
    setLoadingTopics(true)
    try {
      const topicsResponse = await apiClient.getTopics({ limit: 15 })
      setRecentTopics(topicsResponse.topics)
    } catch (error) {
      console.error('Failed to refresh topics:', error)
      alert('トピック更新に失敗しました')
    } finally {
      setLoadingTopics(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500 text-white'
      case 'draft': return 'bg-blue-500 text-white'
      case 'pending': return 'bg-yellow-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'price_analysis': '価格分析',
      'educational': '解説記事',
      'market_overview': '市場概況',
      'breaking_news': '速報',
      'technical_analysis': 'テクニカル分析'
    }
    return types[type] || type
  }

  // 設定画面を表示する場合
  if (currentView === 'settings') {
    return <SettingsPage onBack={() => setCurrentView('dashboard')} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              🚀 暗号通貨記事生成システム
            </h1>
            <p className="text-slate-300 mt-2 text-lg">
              AI駆動の自動記事生成・監視ダッシュボード
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="default"
              onClick={() => setCurrentView(currentView === 'dashboard' ? 'settings' : 'dashboard')}
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              {currentView === 'dashboard' ? '⚙️ 設定' : '🏠 ダッシュボード'}
            </Button>
            {currentView === 'dashboard' && (
              <Button 
                variant={systemStats.systemStatus === 'running' ? 'destructive' : 'default'}
                size="default"
                onClick={handleSystemControl}
                className={systemStats.systemStatus === 'running' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
                }
              >
                {systemStats.systemStatus === 'running' ? '⏸️ 停止' : '▶️ 開始'}
              </Button>
            )}
          </div>
        </div>

        {/* システム状況カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className={`border-0 text-white card-hover ${
            systemStats.systemStatus === 'running' 
              ? 'bg-gradient-to-br from-green-500 to-green-700' 
              : 'bg-gradient-to-br from-red-500 to-red-700'
          }`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">
                システム状態
              </CardTitle>
              <span className="text-3xl">
                {systemStats.systemStatus === 'running' ? '🟢' : '🔴'}
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {systemStats.systemStatus === 'running' ? '稼働中' : '停止中'}
              </div>
              <p className="text-xs text-white/70 mt-1">
                最終実行: {systemStats.lastRun}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-0 text-white card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                本日の記事生成数
              </CardTitle>
              <span className="text-3xl">📝</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {systemStats.dailyQuota.used} / {systemStats.dailyQuota.total}
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(systemStats.dailyQuota.used / systemStats.dailyQuota.total) * 100}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-blue-200 mt-1">
                {Math.round((systemStats.dailyQuota.used / systemStats.dailyQuota.total) * 100)}% 使用
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 border-0 text-white card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-100">
                収集トピック数
              </CardTitle>
              <span className="text-3xl">🎯</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {systemStats.topicsCollected}
              </div>
              <p className="text-xs text-emerald-200 mt-1">
                未処理トピック
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-800 border-0 text-white card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">
                処理待ち時間
              </CardTitle>
              <span className="text-3xl">⏰</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                5分
              </div>
              <p className="text-xs text-purple-200 mt-1">
                次回実行まで
              </p>
            </CardContent>
          </Card>
        </div>

        {/* メインコンテンツ */}
        <Tabs defaultValue="topics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-600">
            <TabsTrigger 
              value="topics" 
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              🎯 最新トピック
            </TabsTrigger>
            <TabsTrigger 
              value="articles"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              📝 生成記事
            </TabsTrigger>
            <TabsTrigger 
              value="logs"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              📊 ログ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topics" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700 text-white">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">🎯 収集済みトピック</CardTitle>
                    <p className="text-sm text-slate-400 mt-1">
                      優先度スコア順に表示・記事生成可能
                    </p>
                  </div>
                  <Button 
                    onClick={handleRefreshTopics}
                    disabled={loadingTopics}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loadingTopics ? '🔄 更新中...' : '🔄 更新'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between p-6 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 transition-all duration-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={`${getPriorityColor(topic.priority)} font-semibold`}>
                            {topic.priority.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-slate-300 bg-slate-600 px-2 py-1 rounded">
                            📊 スコア: {topic.score}
                          </span>
                        </div>
                        <h3 className="font-semibold text-white text-lg mb-2">{topic.title}</h3>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex gap-2">
                            {topic.coins.map((coin) => (
                              <Badge key={coin} className="bg-yellow-600 text-white font-medium">
                                💰 {coin}
                              </Badge>
                            ))}
                          </div>
                          <span className="text-xs text-slate-400">
                            🕒 {topic.collectedAt}
                          </span>
                        </div>
                      </div>
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2"
                        onClick={() => handleGenerateArticle(topic.id)}
                      >
                        ✨ 記事生成
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="articles" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="text-white">📝 生成記事一覧</CardTitle>
                <p className="text-sm text-slate-400">
                  最近生成された記事・編集・プレビュー可能
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentArticles.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center justify-between p-6 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 transition-all duration-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={`${getStatusColor(article.status)} font-semibold`}>
                            {article.status}
                          </Badge>
                          <Badge className="bg-purple-600 text-white font-medium">
                            {getTypeLabel(article.type)}
                          </Badge>
                          <span className="text-sm text-slate-300 bg-slate-600 px-2 py-1 rounded">
                            📄 {article.wordCount}文字
                          </span>
                        </div>
                        <h3 className="font-semibold text-white text-lg mb-2">{article.title}</h3>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex gap-2">
                            {article.coins.map((coin) => (
                              <Badge key={coin} className="bg-yellow-600 text-white font-medium">
                                💰 {coin}
                              </Badge>
                            ))}
                          </div>
                          <span className="text-xs text-slate-400">
                            🕒 {article.generatedAt}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          👁️ プレビュー
                        </Button>
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                          ✏️ 編集
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="text-white">📊 システムログ</CardTitle>
                <p className="text-sm text-slate-400">
                  リアルタイムシステム監視・動作履歴
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-900 text-green-400 p-6 rounded-lg font-mono text-sm h-96 overflow-y-auto border-2 border-slate-600">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">[2024-01-26 14:30:15]</span>
                    <span className="text-green-500 font-bold">INFO:</span>
                    <span>🚀 記事生成を開始しました</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">[2024-01-26 14:30:12]</span>
                    <span className="text-green-500 font-bold">INFO:</span>
                    <span>📋 トピック収集が完了しました (45件)</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">[2024-01-26 14:30:10]</span>
                    <span className="text-green-500 font-bold">INFO:</span>
                    <span>🔍 RSS フィードから新しいトピックを検出</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">[2024-01-26 14:30:05]</span>
                    <span className="text-green-500 font-bold">INFO:</span>
                    <span>💰 価格データを更新しました</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">[2024-01-26 14:30:00]</span>
                    <span className="text-green-500 font-bold">INFO:</span>
                    <span>✅ システム正常稼働中</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">[2024-01-26 14:29:55]</span>
                    <span className="text-yellow-500 font-bold">WARN:</span>
                    <span>⚠️ OpenAI API レート制限に接近</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">[2024-01-26 14:29:50]</span>
                    <span className="text-green-500 font-bold">INFO:</span>
                    <span>🔄 WordPress接続テスト成功</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
