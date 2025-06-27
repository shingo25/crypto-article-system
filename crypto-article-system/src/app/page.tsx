'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiClient } from '@/lib/api'
import SettingsPage from '@/components/SettingsPage'
import ArticleGenerationForm, { ArticleConfig } from '@/components/ArticleGenerationForm'
import TopicManagement from '@/components/TopicManagement'
import ArticlePreview from '@/components/ArticlePreview'
import SystemMonitoring from '@/components/SystemMonitoring'
import WordPressSettings from '@/components/WordPressSettings'

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
  source?: string
  sourceUrl?: string
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
  const [hasMoreTopics, setHasMoreTopics] = useState(true)
  const [topicsOffset, setTopicsOffset] = useState(0)
  const [loadingMoreTopics, setLoadingMoreTopics] = useState(false)
  const [topicFilters, setTopicFilters] = useState({
    priority: '',
    source: '',
    sortBy: 'score' // 'score', 'time', 'title'
  })

  const [recentArticles, setRecentArticles] = useState<Article[]>([])

  // データ取得のuseEffect
  useEffect(() => {
    const fetchData = async () => {
      try {
        // システム統計を取得
        const stats = await apiClient.getSystemStats()
        setSystemStats(stats)
        
        // トピックを取得
        const topicsResponse = await apiClient.getTopics({ 
          limit: 10,
          sortBy: 'score' // デフォルトはスコア順
        })
        setRecentTopics(topicsResponse.topics)
        setHasMoreTopics(topicsResponse.pagination.hasMore)
        setTopicsOffset(10)
        
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

  // 記事生成（簡易版）
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

  // 記事生成（詳細設定版）
  const handleGenerateArticleWithConfig = async (config: ArticleConfig) => {
    try {
      await apiClient.generateArticleWithConfig(config)
      alert('記事生成を開始しました')
      
      // 記事一覧を再取得（少し待ってから）
      setTimeout(async () => {
        const articlesResponse = await apiClient.getArticles({ limit: 10 })
        setRecentArticles(articlesResponse.articles)
      }, 2000)
    } catch (error) {
      console.error('Failed to generate article with config:', error)
      throw error
    }
  }

  // トピック手動更新
  const handleRefreshTopics = async () => {
    setLoadingTopics(true)
    try {
      const topicsResponse = await apiClient.getTopics({ 
        limit: 10,
        offset: 0,
        priority: topicFilters.priority || undefined,
        source: topicFilters.source || undefined,
        sortBy: topicFilters.sortBy,
        force_refresh: true  // 手動更新時は強制的に最新データを取得
      })
      setRecentTopics(topicsResponse.topics)
      setHasMoreTopics(topicsResponse.pagination.hasMore)
      setTopicsOffset(10)
    } catch (error) {
      console.error('Failed to refresh topics:', error)
      // より詳細なエラー情報を表示
      const errorMessage = error instanceof Error ? error.message : 'トピック更新に失敗しました'
      alert(`エラー: ${errorMessage}`)
    } finally {
      setLoadingTopics(false)
    }
  }

  // 無限スクロール - 追加トピック読み込み
  const loadMoreTopics = async () => {
    if (loadingMoreTopics || !hasMoreTopics) return
    
    setLoadingMoreTopics(true)
    try {
      const topicsResponse = await apiClient.getTopics({ 
        limit: 10,
        offset: topicsOffset,
        priority: topicFilters.priority || undefined,
        source: topicFilters.source || undefined,
        sortBy: topicFilters.sortBy
      })
      
      setRecentTopics(prev => [...prev, ...topicsResponse.topics])
      setHasMoreTopics(topicsResponse.pagination.hasMore)
      setTopicsOffset(prev => prev + 10)
    } catch (error) {
      console.error('Failed to load more topics:', error)
      const errorMessage = error instanceof Error ? error.message : '追加トピック読み込みに失敗しました'
      alert(`エラー: ${errorMessage}`)
    } finally {
      setLoadingMoreTopics(false)
    }
  }

  // フィルタ変更ハンドラ（デバウンス機能付き）
  const handleFilterChange = async (filterType: 'priority' | 'source' | 'sortBy', value: string) => {
    const newFilters = { ...topicFilters, [filterType]: value }
    setTopicFilters(newFilters)
    
    // 短時間で連続して呼ばれないようにデバウンス
    setTimeout(async () => {
      if (loadingTopics) return // 既に読み込み中の場合はスキップ
      
      setLoadingTopics(true)
      try {
        const topicsResponse = await apiClient.getTopics({ 
          limit: 10,
          offset: 0,
          priority: newFilters.priority || undefined,
          source: newFilters.source || undefined,
          sortBy: newFilters.sortBy
        })
        setRecentTopics(topicsResponse.topics)
        setHasMoreTopics(topicsResponse.pagination.hasMore)
        setTopicsOffset(10)
      } catch (error) {
        console.error('Failed to filter topics:', error)
        const errorMessage = error instanceof Error ? error.message : 'フィルタリングに失敗しました'
        alert(`エラー: ${errorMessage}`)
      } finally {
        setLoadingTopics(false)
      }
    }, 300) // 300ms遅延
  }

  // スクロールイベントハンドラ
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isBottom = scrollTop + clientHeight >= scrollHeight - 100 // 100px手前で発火
    
    if (isBottom && hasMoreTopics && !loadingMoreTopics) {
      loadMoreTopics()
    }
  }

  // トピック管理のハンドラー
  const handleUpdateTopic = async (topicId: string, updates: Partial<Topic>) => {
    try {
      await apiClient.updateTopic(topicId, updates)
      // トピックリストを再取得
      const topicsResponse = await apiClient.getTopics({ limit: 50 })
      setRecentTopics(topicsResponse.topics)
    } catch (error) {
      console.error('Failed to update topic:', error)
      throw error
    }
  }

  const handleDeleteTopic = async (topicId: string) => {
    try {
      await apiClient.deleteTopic(topicId)
      // トピックリストを再取得
      const topicsResponse = await apiClient.getTopics({ limit: 50 })
      setRecentTopics(topicsResponse.topics)
    } catch (error) {
      console.error('Failed to delete topic:', error)
      throw error
    }
  }

  const handleRefreshTopicsManagement = async () => {
    await handleRefreshTopics()
  }

  // 記事管理のハンドラー
  const handleUpdateArticle = async (articleId: string, updates: Partial<Article>) => {
    try {
      await apiClient.updateArticle(articleId, updates)
      // 記事リストを再取得
      const articlesResponse = await apiClient.getArticles({ limit: 50 })
      setRecentArticles(articlesResponse.articles)
    } catch (error) {
      console.error('Failed to update article:', error)
      throw error
    }
  }

  const handleDeleteArticle = async (articleId: string) => {
    try {
      await apiClient.deleteArticle(articleId)
      // 記事リストを再取得
      const articlesResponse = await apiClient.getArticles({ limit: 50 })
      setRecentArticles(articlesResponse.articles)
    } catch (error) {
      console.error('Failed to delete article:', error)
      throw error
    }
  }

  const handlePublishArticle = async (articleId: string) => {
    try {
      await apiClient.publishArticle(articleId)
      // 記事リストを再取得
      const articlesResponse = await apiClient.getArticles({ limit: 50 })
      setRecentArticles(articlesResponse.articles)
    } catch (error) {
      console.error('Failed to publish article:', error)
      throw error
    }
  }

  const handleRefreshArticles = async () => {
    try {
      const articlesResponse = await apiClient.getArticles({ limit: 50 })
      setRecentArticles(articlesResponse.articles)
    } catch (error) {
      console.error('Failed to refresh articles:', error)
      throw error
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
          <TabsList className="grid w-full grid-cols-7 bg-slate-800 border-slate-600">
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
              value="generate"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              ✨ 記事生成
            </TabsTrigger>
            <TabsTrigger 
              value="manage"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              🔧 トピック管理
            </TabsTrigger>
            <TabsTrigger 
              value="monitoring"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              📊 システム監視
            </TabsTrigger>
            <TabsTrigger 
              value="wordpress"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              🔗 WordPress
            </TabsTrigger>
            <TabsTrigger 
              value="logs"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              📋 ログ
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
                
                {/* フィルタ */}
                <div className="flex gap-4 mt-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-300">優先度</label>
                    <select
                      value={topicFilters.priority}
                      onChange={(e) => handleFilterChange('priority', e.target.value)}
                      className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                    >
                      <option value="">すべて</option>
                      <option value="urgent">緊急</option>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-300">ソース</label>
                    <select
                      value={topicFilters.source}
                      onChange={(e) => handleFilterChange('source', e.target.value)}
                      className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                    >
                      <option value="">すべて</option>
                      <option value="rss">RSS配信</option>
                      <option value="price">価格データ</option>
                      <option value="trend">トレンド</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-300">並び順</label>
                    <select
                      value={topicFilters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                    >
                      <option value="score">スコア順</option>
                      <option value="time">更新時間順</option>
                      <option value="title">タイトル順</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="space-y-4 max-h-screen overflow-y-auto"
                  onScroll={handleScroll}
                >
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
                          {topic.source && (
                            <Badge className="bg-indigo-600 text-white font-medium">
                              📡 {topic.source}
                            </Badge>
                          )}
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
                          {topic.sourceUrl && (
                            <a 
                              href={topic.sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                            >
                              🔗 元記事を見る
                            </a>
                          )}
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
                  
                  {/* 読み込み中インジケータ */}
                  {loadingMoreTopics && (
                    <div className="flex justify-center py-4">
                      <div className="text-slate-400">🔄 読み込み中...</div>
                    </div>
                  )}
                  
                  {/* 全て読み込み完了メッセージ */}
                  {!hasMoreTopics && recentTopics.length > 0 && (
                    <div className="flex justify-center py-4">
                      <div className="text-slate-400">✅ 全てのトピックを表示しました</div>
                    </div>
                  )}
                  
                  {/* トピックが0件の場合 */}
                  {recentTopics.length === 0 && !loadingTopics && (
                    <div className="flex justify-center py-8">
                      <div className="text-slate-400">📋 条件に合うトピックが見つかりません</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="articles" className="space-y-4">
            <ArticlePreview
              articles={recentArticles}
              onUpdateArticle={handleUpdateArticle}
              onDeleteArticle={handleDeleteArticle}
              onPublishArticle={handlePublishArticle}
              onRefreshArticles={handleRefreshArticles}
            />
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            <ArticleGenerationForm
              topics={recentTopics}
              onGenerate={handleGenerateArticleWithConfig}
            />
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <TopicManagement
              topics={recentTopics}
              onUpdateTopic={handleUpdateTopic}
              onDeleteTopic={handleDeleteTopic}
              onRefreshTopics={handleRefreshTopicsManagement}
            />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <SystemMonitoring />
          </TabsContent>

          <TabsContent value="wordpress" className="space-y-4">
            <WordPressSettings />
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
