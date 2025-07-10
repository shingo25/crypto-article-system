'use client'

// 動的レンダリングを強制（プリレンダリングエラー回避）
export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useCallback } from 'react'
import { MarketPulse } from '@/components/neural/market/MarketPulse'
import { SystemStatusBar } from '@/components/neural/market/SystemStatusBar'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Newspaper, 
  Search, 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  Sparkles,
  ExternalLink,
  Tag,
  Activity,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface NewsItem {
  id: string
  title: string
  summary: string
  content?: string
  url: string
  imageUrl?: string
  source: string
  author?: string
  sentiment: number // -1 to 1
  importance: number // 1-10
  aiSummary?: string
  topics: string[]
  coins: string[]
  companies: string[]
  products: string[]
  technology: string[]
  market: string[]
  regulatory: string[]
  regions: string[]
  hasGeneratedArticle: boolean
  publishedAt: string
  createdAt: string
}

export default function MarketOverviewPage() {
  const router = useRouter()
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource] = useState<string>('all')
  const [selectedImportance, setSelectedImportance] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [generatingAISummary, setGeneratingAISummary] = useState<string | null>(null)
  const [tickerPrices, setTickerPrices] = useState<Record<string, {
    price: number
    change24h: number
    symbol: string
    name: string
  }>>({})
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [nextUpdateTime, setNextUpdateTime] = useState<Date>(new Date(Date.now() + 5 * 60 * 1000))
  const [timeUntilUpdate, setTimeUntilUpdate] = useState<string>('5:00')
  const [displayedNewsCount, setDisplayedNewsCount] = useState<number>(5)

  // AI設定を取得する関数
  const getCurrentAIConfig = () => {
    try {
      const savedConfig = localStorage.getItem('ai-config')
      if (savedConfig) {
        return JSON.parse(savedConfig)
      }
    } catch (error) {
      console.warn('Failed to load AI config:', error)
    }
    // デフォルト設定
    return {
      ai_provider: 'gemini',
      ai_model: 'gemini-1.5-pro',
      temperature: 0.3,
      max_tokens: 150
    }
  }

  // AI要約を生成する関数
  const generateAISummary = async (newsItem: NewsItem) => {
    if (newsItem.aiSummary) return // 既に要約がある場合はスキップ
    
    setGeneratingAISummary(newsItem.id)
    try {
      const aiConfig = getCurrentAIConfig()
      
      const response = await fetch('/api/news/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newsItem.title,
          content: newsItem.summary || newsItem.title,
          ...aiConfig
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // ニュースアイテムにAI要約を追加
        setNewsItems(prevItems => 
          prevItems.map(item => 
            item.id === newsItem.id 
              ? { ...item, aiSummary: data.data.aiSummary }
              : item
          )
        )
        toast.success('AI要約を生成しました')
      } else {
        toast.error('AI要約の生成に失敗しました')
      }
    } catch (error) {
      console.error('AI Summary generation error:', error)
      toast.error('AI要約の生成中にエラーが発生しました')
    } finally {
      setGeneratingAISummary(null)
    }
  }

  // 通貨価格データを取得する関数
  const loadTickerPrices = useCallback(async (coins: string[]) => {
    if (coins.length === 0) return
    
    try {
      // 既に取得済みの通貨は除外
      const newCoins = coins.filter(coin => !tickerPrices[coin])
      if (newCoins.length === 0) return

      // モック価格データ（実際のAPIに置き換え可能）
      const mockPrices: Record<string, { price: number; change24h: number; symbol: string; name: string }> = {
        'BTC': { price: 67420, change24h: 3.47, symbol: 'BTC', name: 'Bitcoin' },
        'ETH': { price: 3845, change24h: 5.12, symbol: 'ETH', name: 'Ethereum' },
        'SOL': { price: 178, change24h: -1.23, symbol: 'SOL', name: 'Solana' },
        'ADA': { price: 1.02, change24h: 2.89, symbol: 'ADA', name: 'Cardano' },
        'PEPE': { price: 0.00001234, change24h: 30.45, symbol: 'PEPE', name: 'Pepe' },
        'DOGE': { price: 0.082, change24h: 8.7, symbol: 'DOGE', name: 'Dogecoin' },
        'SHIB': { price: 0.000024, change24h: 15.2, symbol: 'SHIB', name: 'Shiba Inu' },
        'LINK': { price: 14.67, change24h: -2.1, symbol: 'LINK', name: 'Chainlink' },
        'UNI': { price: 8.92, change24h: 4.3, symbol: 'UNI', name: 'Uniswap' },
        'MATIC': { price: 0.95, change24h: -0.8, symbol: 'MATIC', name: 'Polygon' },
        'SUI': { price: 3.67, change24h: 8.9, symbol: 'SUI', name: 'Sui' },
        'NEAR': { price: 6.23, change24h: 6.1, symbol: 'NEAR', name: 'NEAR Protocol' }
      }

      const newPrices: Record<string, { price: number; change24h: number; symbol: string; name: string }> = {}
      newCoins.forEach(coin => {
        if (mockPrices[coin]) {
          newPrices[coin] = mockPrices[coin]
        }
      })

      setTickerPrices(prev => ({ ...prev, ...newPrices }))
    } catch (error) {
      console.error('Failed to load ticker prices:', error)
    }
  }, [tickerPrices])

  // RSS設定からニュースデータを取得
  const loadNewsData = useCallback(async (isAutoRefresh = false) => {
    setIsLoading(true)
    
    // 自動更新の場合は控えめなトースト表示
    if (isAutoRefresh) {
      toast('自動更新中...', {
        icon: '🔄',
        duration: 2000,
        style: {
          background: '#1a1f2e',
          color: '#64ffda',
          border: '1px solid #64ffda20'
        }
      })
    }
    
    try {
      // 設定されたRSSソースを確認
      const sourcesResponse = await fetch('/api/sources')
      const sourcesData = await sourcesResponse.json()
      
      if (!sourcesData.success) {
        console.warn('RSS設定が見つかりません')
      }

      // RSS設定を使用してニュースを取得
      const response = await fetch('/api/news?limit=15&use_configured_sources=true')
      const data = await response.json()
      
      if (data.success) {
        setNewsItems(data.data.items)
        setDisplayedNewsCount(5) // 表示件数を初期値にリセット
        
        // 更新時刻を記録
        const now = new Date()
        setLastUpdateTime(now)
        setNextUpdateTime(new Date(now.getTime() + 5 * 60 * 1000))
        
        // ニュースから通貨を抽出して価格データを取得
        const allCoins = data.data.items.flatMap((item: NewsItem) => item.coins || [])
        const uniqueCoins = [...new Set(allCoins)]
        if (uniqueCoins.length > 0) {
          loadTickerPrices(uniqueCoins)
        }
        
        // 初回ロードまたは手動更新時のみ成功通知を表示
        if (!isAutoRefresh && sourcesData.success && sourcesData.sources.length > 0) {
          toast.success(`${sourcesData.sources.length}件のRSSソースから最新ニュースを取得`)
        }
      } else {
        toast.error('ニュースの取得に失敗しました')
      }
    } catch (error) {
      console.error('Failed to load news:', error)
      toast.error('ニュースの取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [loadTickerPrices])

  useEffect(() => {
    // 初回ロード（手動更新扱い）
    loadNewsData(false)
    
    // RSS収集間隔（5分）に合わせて自動更新
    const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000 // 5分
    
    const refreshInterval = setInterval(() => {
      console.log('自動更新: Latest Newsを更新中...')
      loadNewsData(true) // 自動更新フラグを true に設定
    }, AUTO_REFRESH_INTERVAL)
    
    // クリーンアップ
    return () => {
      clearInterval(refreshInterval)
    }
  }, [loadNewsData]) // loadNewsData関数を依存配列に追加
  
  // カウントダウンタイマーは別のuseEffectで管理
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      const now = new Date()
      const diff = nextUpdateTime.getTime() - now.getTime()
      
      if (diff > 0) {
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setTimeUntilUpdate(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      } else {
        setTimeUntilUpdate('更新中...')
      }
    }, 1000)
    
    return () => {
      clearInterval(countdownInterval)
    }
  }, [nextUpdateTime])

  // 検索条件やフィルタが変更された時に表示件数をリセット
  useEffect(() => {
    setDisplayedNewsCount(5)
  }, [searchQuery, selectedImportance])

  const handleGenerateArticle = (newsItem: NewsItem) => {
    const params = new URLSearchParams({
      topic: newsItem.title,
      source: 'news',
      newsId: newsItem.id
    })
    router.push(`/workbench?${params.toString()}`)
    toast.success(`「${newsItem.title}」から記事を生成します`)
  }

  const handleLoadMoreNews = () => {
    const currentCount = displayedNewsCount
    const newCount = Math.min(currentCount + 5, filteredNews.length)
    setDisplayedNewsCount(newCount)
    
    toast.success(`${newCount - currentCount}件のニュースを追加表示`, {
      duration: 2000,
      style: {
        background: '#1a1f2e',
        color: '#64ffda',
        border: '1px solid #64ffda20'
      }
    })
  }

  const getPriorityBadge = (importance: number) => {
    if (importance >= 8) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">緊急</Badge>
    }
    if (importance >= 6) {
      return <Badge className="bg-neural-warning/20 text-neural-warning border-neural-warning/30">重要</Badge>
    }
    return <Badge className="bg-neural-cyan/20 text-neural-cyan border-neural-cyan/30">通常</Badge>
  }

  const formatTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '今'
    if (minutes < 60) return `${minutes}分前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}時間前`
    const days = Math.floor(hours / 24)
    return `${days}日前`
  }

  const formatTickerPrice = (price: number) => {
    if (price < 0.001) return `$${price.toFixed(8)}`
    if (price < 1) return `$${price.toFixed(4)}`
    if (price < 100) return `$${price.toFixed(2)}`
    return `$${price.toLocaleString()}`
  }

  const filteredNews = newsItems.filter(item => {
    const searchLower = searchQuery.toLowerCase()
    
    // 検索条件
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchLower) ||
      item.summary.toLowerCase().includes(searchLower) ||
      item.topics.some((topic: string) => topic.toLowerCase().includes(searchLower)) ||
      item.coins.some((coin: string) => coin.toLowerCase().includes(searchLower))

    // ソースフィルター
    const matchesSource = selectedSource === 'all' || item.source === selectedSource

    // 重要度フィルター
    const matchesImportance = selectedImportance === 'all' || 
      (selectedImportance === 'high' && item.importance >= 8) ||
      (selectedImportance === 'medium' && item.importance >= 6 && item.importance < 8) ||
      (selectedImportance === 'low' && item.importance < 6)

    return matchesSearch && matchesSource && matchesImportance
  })
  return (
    <div className="min-h-screen bg-neural-void">
      {/* Aurora Background */}
      <div className="neural-aurora" />
      
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold neural-title neural-glow-text mb-2">
                Market Overview
              </h1>
              <p className="text-neural-text-secondary text-sm lg:text-base">
                Real-time market intelligence for content creation
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-neural-elevated/20 rounded-lg border border-neural-elevated/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-neural-success rounded-full animate-pulse"></div>
                  <span className="text-xs text-neural-text-secondary">Live Data</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* System Status Bar */}
        <div className="mb-6">
          <SystemStatusBar />
        </div>
        
        {/* Main Content: 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Left Column: Latest News (70%) */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <NeuralCard>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 neural-neumorphic rounded-lg">
                    <Newspaper className="h-5 w-5 text-neural-cyan" />
                  </div>
                  <div>
                    <CardTitle className="neural-title">Latest News</CardTitle>
                    <p className="text-sm text-neural-text-secondary mt-1">
                      設定されたRSSソースからの最新ニュース
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* 自動更新インジケーター */}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-neural-elevated/20 rounded-lg border border-neural-elevated/30">
                    <Clock className="h-3 w-3 text-neural-cyan" />
                    <div className="text-xs">
                      <span className="text-neural-text-muted">次回: </span>
                      <span className="font-mono text-neural-cyan">{timeUntilUpdate}</span>
                    </div>
                  </div>
                  
                  {/* 最終更新時刻 - モバイル対応 */}
                  <div className="hidden sm:block text-xs text-neural-text-muted">
                    更新: {lastUpdateTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  
                  {/* モバイル用の簡易表示 */}
                  <div className="sm:hidden flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3 text-neural-cyan" />
                    <span className="font-mono text-neural-cyan">{timeUntilUpdate}</span>
                  </div>
                  
                  <NeuralButton
                    variant="ghost"
                    size="sm"
                    onClick={() => loadNewsData(false)}
                    disabled={isLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    今すぐ更新
                  </NeuralButton>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Search and Filters */}
              <div className="mb-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neural-text-muted" />
                  <Input
                    placeholder="ニュースを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 neural-input"
                  />
                </div>
                
                <select
                  value={selectedImportance}
                  onChange={(e) => setSelectedImportance(e.target.value)}
                  className="px-3 py-2 bg-neural-surface border border-neural-elevated rounded-lg text-sm"
                >
                  <option value="all">全ての重要度</option>
                  <option value="high">緊急</option>
                  <option value="medium">重要</option>
                  <option value="low">通常</option>
                </select>
              </div>

              {/* News Items */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-neural-text-muted" />
                    <p className="text-neural-text-muted">ニュースを読み込み中...</p>
                  </div>
                ) : filteredNews.length === 0 ? (
                  <div className="text-center py-8">
                    <Newspaper className="h-12 w-12 mx-auto mb-4 text-neural-text-muted" />
                    <p className="text-neural-text-secondary">ニュースが見つかりません</p>
                    <p className="text-xs text-neural-text-muted mt-1">
                      SettingsでRSS設定を確認してください
                    </p>
                  </div>
                ) : (
                  filteredNews.slice(0, displayedNewsCount).map((item) => (
                    <div
                      key={item.id}
                      className="group relative p-5 neural-neumorphic-inset rounded-xl hover:shadow-xl transition-all duration-300 border-l-4 border-transparent hover:border-neural-cyan/50"
                    >
                      {/* Header with priority and meta */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          {getPriorityBadge(item.importance)}
                          <div className="flex items-center gap-1 text-xs text-neural-text-muted">
                            <div className={cn("w-2 h-2 rounded-full", 
                              item.sentiment > 0.3 ? "bg-neural-success animate-pulse" :
                              item.sentiment < -0.3 ? "bg-neural-error animate-pulse" :
                              "bg-neural-text-muted"
                            )} />
                            <span className="font-medium">{item.source}</span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-neural-text-muted font-mono">
                          {formatTimeAgo(item.publishedAt)}
                        </div>
                      </div>
                      
                      {/* Title with improved typography */}
                      <h3 className="text-lg font-semibold neural-title mb-3 leading-tight group-hover:text-neural-cyan transition-colors line-clamp-2">
                        {item.title}
                      </h3>

                      {/* TICKER Display - shows when coins are mentioned */}
                      {item.coins && item.coins.length > 0 && (
                        <div className="mb-4 p-3 neural-neumorphic rounded-lg bg-gradient-to-r from-neural-surface/50 to-neural-elevated/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-neural-cyan" />
                            <span className="text-sm font-medium text-neural-cyan">Related Assets</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {item.coins.slice(0, 2).map((coin) => {
                              const priceData = tickerPrices[coin]
                              return (
                                <div key={coin} className="flex items-center justify-between p-2 bg-neural-void/20 rounded-lg border border-neural-elevated/20 hover:border-neural-cyan/30 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center",
                                      coin === 'BTC' ? 'bg-orange-500/20 text-orange-400' :
                                      coin === 'ETH' ? 'bg-blue-500/20 text-blue-400' :
                                      coin === 'PEPE' ? 'bg-green-500/20 text-green-400' :
                                      coin === 'DOGE' ? 'bg-yellow-500/20 text-yellow-400' :
                                      coin === 'SHIB' ? 'bg-red-500/20 text-red-400' :
                                      'bg-neural-warning/20 text-neural-warning'
                                    )}>
                                      <span className="text-xs font-bold">{coin}</span>
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold neural-title">{coin}</div>
                                      {priceData && (
                                        <div className="text-xs text-neural-text-muted">{priceData.name}</div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {priceData ? (
                                    <div className="text-right">
                                      <div className="text-sm font-semibold neural-title">
                                        {formatTickerPrice(priceData.price)}
                                      </div>
                                      <div className={cn("flex items-center gap-1 text-xs", 
                                        priceData.change24h >= 0 ? "text-neural-success" : "text-neural-error"
                                      )}>
                                        {priceData.change24h >= 0 ? (
                                          <TrendingUp className="h-3 w-3" />
                                        ) : (
                                          <TrendingDown className="h-3 w-3" />
                                        )}
                                        {priceData.change24h > 0 ? '+' : ''}{priceData.change24h.toFixed(2)}%
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-neural-text-muted animate-pulse">
                                      Loading...
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* AI要約セクション */}
                      {item.aiSummary ? (
                        <div className="mb-3 p-2 bg-neural-cyan/5 border border-neural-cyan/20 rounded-lg">
                          <div className="flex items-center gap-1 mb-1">
                            <Sparkles className="h-3 w-3 text-neural-cyan" />
                            <span className="text-xs font-medium text-neural-cyan">AI要約</span>
                          </div>
                          <p className="text-xs text-neural-text-secondary leading-relaxed">
                            {item.aiSummary}
                          </p>
                        </div>
                      ) : (
                        <div className="mb-3 p-2 bg-neural-surface/30 border border-neural-elevated/30 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-neural-text-muted" />
                              <span className="text-xs text-neural-text-muted">AI要約未生成</span>
                            </div>
                            <NeuralButton
                              variant="ghost"
                              size="sm"
                              onClick={() => generateAISummary(item)}
                              disabled={generatingAISummary === item.id}
                              className="h-6 px-2 text-xs"
                            >
                              {generatingAISummary === item.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  生成
                                </>
                              )}
                            </NeuralButton>
                          </div>
                        </div>
                      )}
                      
                      {/* Summary with better formatting */}
                      <p className="text-sm text-neural-text-secondary mb-4 line-clamp-3 leading-relaxed">
                        {item.summary}
                      </p>

                      {/* Enhanced tags with better categorization */}
                      <div className="mb-4 space-y-2">
                        {/* Primary coins with icons */}
                        {item.coins.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {item.coins.slice(0, 3).map((coin) => (
                              <Badge 
                                key={coin} 
                                variant="outline" 
                                className="text-xs font-semibold bg-gradient-to-r from-neural-warning/10 to-neural-warning/5 text-neural-warning border-neural-warning/40 hover:border-neural-warning/60 transition-colors"
                              >
                                <span className="mr-1">₿</span>
                                {coin}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Category tags with better visual hierarchy */}
                        <div className="flex flex-wrap gap-1.5">
                          {/* Technology tags */}
                          {item.technology.slice(0, 2).map((tech) => (
                            <Badge 
                              key={tech} 
                              variant="outline" 
                              className="text-xs bg-neural-orchid/10 text-neural-orchid border-neural-orchid/30 hover:bg-neural-orchid/20 transition-colors"
                            >
                              ⚡ {tech}
                            </Badge>
                          ))}
                          
                          {/* Market tags */}
                          {item.market.slice(0, 2).map((market) => (
                            <Badge 
                              key={market} 
                              variant="outline" 
                              className="text-xs bg-neural-success/10 text-neural-success border-neural-success/30 hover:bg-neural-success/20 transition-colors"
                            >
                              📈 {market}
                            </Badge>
                          ))}
                          
                          {/* Topic tags */}
                          {item.topics.slice(0, 3).map((topic) => (
                            <Badge 
                              key={topic} 
                              variant="outline" 
                              className="text-xs bg-neural-cyan/10 text-neural-cyan border-neural-cyan/30 hover:bg-neural-cyan/20 transition-colors"
                            >
                              🏷️ {topic}
                            </Badge>
                          ))}
                          
                          {/* Regulatory tags */}
                          {item.regulatory.slice(0, 1).map((reg) => (
                            <Badge 
                              key={reg} 
                              variant="outline" 
                              className="text-xs bg-neural-error/10 text-neural-error border-neural-error/30 hover:bg-neural-error/20 transition-colors"
                            >
                              ⚖️ {reg}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {item.sentiment > 0.3 ? (
                            <TrendingUp className="h-4 w-4 text-neural-success" />
                          ) : item.sentiment < -0.3 ? (
                            <TrendingDown className="h-4 w-4 text-neural-danger" />
                          ) : (
                            <Tag className="h-4 w-4 text-neural-text-muted" />
                          )}
                          <span className="text-xs text-neural-text-muted">
                            {item.sentiment > 0.3 ? 'ポジティブ' : 
                             item.sentiment < -0.3 ? 'ネガティブ' : 'ニュートラル'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <NeuralButton
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(item.url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            詳細
                          </NeuralButton>
                          <NeuralButton
                            variant="gradient"
                            size="sm"
                            onClick={() => handleGenerateArticle(item)}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            記事生成
                          </NeuralButton>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {filteredNews.length > displayedNewsCount && (
                <div className="mt-4 text-center">
                  <NeuralButton
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMoreNews}
                    className="w-full"
                  >
                    <Newspaper className="h-4 w-4 mr-2" />
                    もっと見る（残り {filteredNews.length - displayedNewsCount} 件）
                  </NeuralButton>
                </div>
              )}
            </CardContent>
            </NeuralCard>
          </div>

          {/* Right Column: Market Pulse (30%) */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <MarketPulse viewMode="compact" />
          </div>
        </div>

      </div>
    </div>
  )
}