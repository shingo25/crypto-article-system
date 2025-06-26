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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              暗号通貨記事生成システム
            </h1>
            <p className="text-gray-600 mt-1">
              システム概要とリアルタイム監視
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentView(currentView === 'dashboard' ? 'settings' : 'dashboard')}
            >
              {currentView === 'dashboard' ? '⚙️ 設定' : '🏠 ダッシュボード'}
            </Button>
            {currentView === 'dashboard' && (
              <Button 
                variant={systemStats.systemStatus === 'running' ? 'destructive' : 'default'}
                size="sm"
                onClick={handleSystemControl}
              >
                {systemStats.systemStatus === 'running' ? '⏸️ 停止' : '▶️ 開始'}
              </Button>
            )}
          </div>
        </div>

        {/* システム状況カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                システム状態
              </CardTitle>
              {systemStats.systemStatus === 'running' ? '✅' : '❌'}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemStats.systemStatus === 'running' ? '稼働中' : '停止中'}
              </div>
              <p className="text-xs text-gray-500">
                最終実行: {systemStats.lastRun}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                本日の記事生成数
              </CardTitle>
              📄
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemStats.dailyQuota.used} / {systemStats.dailyQuota.total}
              </div>
              <p className="text-xs text-gray-500">
                {Math.round((systemStats.dailyQuota.used / systemStats.dailyQuota.total) * 100)}% 使用
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                収集トピック数
              </CardTitle>
              📈
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemStats.topicsCollected}
              </div>
              <p className="text-xs text-gray-500">
                未処理トピック
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                処理待ち時間
              </CardTitle>
              ⏰
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                5分
              </div>
              <p className="text-xs text-gray-500">
                次回実行まで
              </p>
            </CardContent>
          </Card>
        </div>

        {/* メインコンテンツ */}
        <Tabs defaultValue="topics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="topics">最新トピック</TabsTrigger>
            <TabsTrigger value="articles">生成記事</TabsTrigger>
            <TabsTrigger value="logs">ログ</TabsTrigger>
          </TabsList>

          <TabsContent value="topics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>収集済みトピック</CardTitle>
                <p className="text-sm text-gray-500">
                  優先度スコア順に表示
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getPriorityColor(topic.priority)}>
                            {topic.priority}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            スコア: {topic.score}
                          </span>
                        </div>
                        <h3 className="font-medium">{topic.title}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex gap-1">
                            {topic.coins.map((coin) => (
                              <Badge key={coin} variant="outline">
                                {coin}
                              </Badge>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            {topic.collectedAt}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleGenerateArticle(topic.id)}
                      >
                        記事生成
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="articles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>生成記事一覧</CardTitle>
                <p className="text-sm text-gray-500">
                  最近生成された記事
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentArticles.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getStatusColor(article.status)}>
                            {article.status}
                          </Badge>
                          <Badge variant="outline">
                            {getTypeLabel(article.type)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {article.wordCount}文字
                          </span>
                        </div>
                        <h3 className="font-medium">{article.title}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex gap-1">
                            {article.coins.map((coin) => (
                              <Badge key={coin} variant="outline">
                                {coin}
                              </Badge>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            {article.generatedAt}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          プレビュー
                        </Button>
                        <Button variant="outline" size="sm">
                          編集
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>システムログ</CardTitle>
                <p className="text-sm text-gray-500">
                  リアルタイムシステム情報
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
                  <div>[2024-01-26 14:30:15] INFO: 記事生成を開始しました</div>
                  <div>[2024-01-26 14:30:12] INFO: トピック収集が完了しました (45件)</div>
                  <div>[2024-01-26 14:30:10] INFO: RSS フィードから新しいトピックを検出</div>
                  <div>[2024-01-26 14:30:05] INFO: 価格データを更新しました</div>
                  <div>[2024-01-26 14:30:00] INFO: システム正常稼働中</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
