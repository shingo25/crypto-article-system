'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Badge } from '@/components/ui/badge'
import { useWebSocket } from '@/hooks/useWebSocket'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  RefreshCw, 
  Sparkles,
  AlertTriangle,
  Bell,
  ChevronRight,
  DollarSign,
  Globe,
  Bitcoin,
  Activity,
  Target,
  Wifi,
  WifiOff,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarketDataAPI, CryptoCurrency } from '@/lib/market-data'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useOptionalAuth } from '@/components/auth/AuthProvider'
import { requireAuthForArticle } from '@/lib/auth-helpers'

interface MarketAlert {
  id: string
  coin: string
  message: string
  urgency: 'high' | 'medium' | 'low'
  timestamp: string
  change: number
}

interface MarketPulseData {
  lastUpdate: string
  totalMarketCap: number
  btcDominance: number
  fear_greed_index: number
  alerts: MarketAlert[]
  top_coins: {
    symbol: string
    name: string
    price: number
    change24h: number
    volume: number
    trend: 'bullish' | 'bearish' | 'neutral'
    image?: string
  }[]
  trending_topics: string[]
}

interface MarketPulseProps {
  viewMode?: 'full' | 'compact'
}

export function MarketPulse({ viewMode = 'full' }: MarketPulseProps) {
  const { isAuthenticated } = useOptionalAuth()
  const [marketData, setMarketData] = useState<MarketPulseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const router = useRouter()
  
  // WebSocket接続でリアルタイムデータを取得
  const { 
    isConnected, 
    alerts, 
    marketData: wsMarketData, 
    systemStats,
    connectionError,
    dismissAlert,
    reconnect 
  } = useWebSocket('http://localhost:3002')

  // WebSocket再接続の処理
  useEffect(() => {
    // WebSocketが接続できない場合の再接続処理
    if (!isConnected && connectionError) {
      const autoReconnectTimer = setTimeout(() => {
        console.log('Auto-reconnecting WebSocket...')
        reconnect()
      }, 3000)
      
      return () => clearTimeout(autoReconnectTimer)
    }
  }, [isConnected, connectionError, reconnect])
  
  // 定期的にCoinGecko APIからデータを更新（WebSocketと並行）
  useEffect(() => {
    // 初回ロード
    loadMarketData()
    
    // 120秒間隔でCoinGecko APIからデータを更新（WebSocketと同期）
    const apiUpdateInterval = setInterval(() => {
      console.log('Updating market data from CoinGecko API...')
      loadMarketData()
    }, 120000) // 2分間隔（レート制限回避）
    
    return () => clearInterval(apiUpdateInterval)
  }, [])

  // WebSocketデータが更新されたらローカル状態を更新（既存データにマージ）
  useEffect(() => {
    if (wsMarketData) {
      console.log('Merging WebSocket data with existing market data...')
      
      // WebSocketデータを既存データとマージ（marketDataを依存関係から除外）
      setMarketData(prevData => {
        if (!prevData) return null
        
        const mergedData = {
          ...prevData, // 既存のCoinGecko APIデータを保持
          lastUpdate: wsMarketData.lastUpdate,
          alerts: alerts.slice(0, 3).map(alert => ({
            id: alert.id,
            coin: alert.symbol.toUpperCase(),
            message: alert.title,
            urgency: alert.level,
            timestamp: alert.timestamp,
            change: alert.changePercent || 0
          })),
          // WebSocketからのトップコインデータがある場合はそれを使用、なければAPIデータを保持
          top_coins: wsMarketData.topCoins.length > 0 ? wsMarketData.topCoins : prevData.top_coins,
          // WebSocketからのトレンディングトピックがある場合はそれを使用
          trending_topics: wsMarketData.trendingTopics || prevData.trending_topics
        }
        
        console.log('Market data merged:', mergedData)
        return mergedData
      })
    }
  }, [wsMarketData, alerts])

  const loadMarketData = useCallback(async () => {
    try {
      // WebSocketの状態に関係なく、常にCoinGecko APIからデータを取得
      console.log('Loading market data from CoinGecko API...')
      setLoading(true)
      
      // タイムアウトを設定してAPIコールを制限
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API request timeout')), 15000)
      )
      
      const dataPromise = Promise.all([
        MarketDataAPI.getTopCryptocurrencies(8),
        MarketDataAPI.getGlobalMarketData(),
        // CoinGeckoのトレンディングAPIを追加
        fetch('https://api.coingecko.com/api/v3/search/trending', {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000)
        }).then(res => res.ok ? res.json() : null).catch(() => null)
      ])
      
      const [cryptocurrencies, globalData, trendingData] = await Promise.race([
        dataPromise,
        timeoutPromise
      ]) as [CryptoCurrency[], any, any]

      const formattedCoins = cryptocurrencies.map((crypto: CryptoCurrency) => ({
        symbol: crypto.symbol.toUpperCase(),
        name: crypto.name,
        price: crypto.current_price,
        change24h: crypto.price_change_percentage_24h || 0,
        volume: crypto.total_volume / 1000000000,
        trend: (crypto.price_change_percentage_24h || 0) > 5 ? 'bullish' : 
               (crypto.price_change_percentage_24h || 0) < -3 ? 'bearish' : 'neutral',
        image: crypto.image || `https://coin-images.coingecko.com/coins/images/1/small/${crypto.id}.png`
      }))

      // トレンディングトピックスを実データから生成
      let trendingTopics = ['DeFi Recovery', 'Layer 2 Scaling', 'Regulatory Clarity', 'Institutional Adoption']
      if (trendingData?.coins) {
        try {
          trendingTopics = trendingData.coins.slice(0, 4).map((item: any) => item.item.name)
          console.log('Updated trending topics from CoinGecko:', trendingTopics)
        } catch (e) {
          console.warn('Failed to parse trending data, using fallback')
        }
      }

      const newMarketData = {
        lastUpdate: new Date().toISOString(),
        totalMarketCap: globalData.totalMarketCap,
        btcDominance: globalData.btcDominance,
        fear_greed_index: globalData.fearGreedIndex,
        alerts: marketData?.alerts || [], // 既存のアラートを保持
        top_coins: formattedCoins,
        trending_topics: trendingTopics
      }
      
      setMarketData(newMarketData)
      setLoading(false)
      console.log('Market data updated from CoinGecko API:', newMarketData)
    } catch (error) {
      console.error('Failed to load market data:', error)
      setLoading(false)
      
      // より詳細なエラーメッセージを表示
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // フォールバック用のモックデータ
      const fallbackData: MarketPulseData = {
        lastUpdate: new Date().toISOString(),
        totalMarketCap: 2.89,
        btcDominance: 52.3,
        fear_greed_index: 68,
        alerts: [
          {
            id: '1',
            coin: 'BTC',
            message: 'ビットコインが5%急騰、機関投資家の買いが活発化',
            urgency: 'high',
            timestamp: new Date().toISOString(),
            change: 5.2
          },
          {
            id: '2',
            coin: 'ETH',
            message: 'イーサリアム価格安定、DeFiセクターに回復の兆し',
            urgency: 'medium',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            change: 2.1
          }
        ],
        top_coins: [
          { symbol: 'BTC', name: 'Bitcoin', price: 67420, change24h: 3.47, volume: 28.9, trend: 'bullish', image: 'https://coin-images.coingecko.com/coins/images/1/small/bitcoin.png' },
          { symbol: 'ETH', name: 'Ethereum', price: 3845, change24h: 5.12, volume: 15.2, trend: 'bullish', image: 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png' },
          { symbol: 'SOL', name: 'Solana', price: 178, change24h: -1.23, volume: 4.8, trend: 'bearish', image: 'https://coin-images.coingecko.com/coins/images/4128/small/solana.png' },
          { symbol: 'ADA', name: 'Cardano', price: 1.02, change24h: 2.89, volume: 1.9, trend: 'neutral', image: 'https://coin-images.coingecko.com/coins/images/975/small/cardano.png' },
          { symbol: 'XRP', name: 'XRP', price: 0.58, change24h: 1.45, volume: 2.1, trend: 'neutral', image: 'https://coin-images.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
          { symbol: 'DOT', name: 'Polkadot', price: 7.23, change24h: -0.87, volume: 1.5, trend: 'neutral', image: 'https://coin-images.coingecko.com/coins/images/12171/small/polkadot.png' }
        ],
        trending_topics: ['DeFi Recovery', 'Layer 2 Scaling', 'Regulatory Clarity']
      }
      
      setMarketData(fallbackData)
      
      // ユーザーフレンドリーなエラーメッセージ
      if (errorMessage.includes('timeout') || errorMessage.includes('Failed to fetch')) {
        toast.error('ネットワーク接続が不安定です。デモデータを表示しています。', {
          description: '自動的に再試行します'
        })
      } else {
        toast.error('マーケットデータの取得に失敗しました', {
          description: 'フォールバックデータを表示中'
        })
      }
    }
  }, [])

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      await loadMarketData()
      setLoading(false)
      
      // 初回失敗時の自動リトライ（30秒後）
      if (!marketData) {
        setTimeout(() => {
          console.log('Retrying market data load...')
          loadMarketData()
        }, 30000)
      }
    }
    loadInitialData()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    let retryCount = 0
    const maxRetries = 3

    const intervalWithRetry = setInterval(async () => {
      try {
        await loadMarketData()
        retryCount = 0 // 成功時はリトライカウントをリセット
      } catch (error) {
        retryCount++
        console.warn(`Market data update failed (attempt ${retryCount}/${maxRetries})`)
        
        if (retryCount >= maxRetries) {
          console.error('Max retries reached, using fallback data')
          // 最大リトライ数に達した場合は、長めの間隔で再試行
          setTimeout(() => {
            retryCount = 0 // リトライカウントをリセットして再開
          }, 300000) // 5分後に再開
        }
      }
    }, 60000) // 1分間隔

    return () => clearInterval(intervalWithRetry)
  }, [autoRefresh])

  const handleGenerateArticle = (topic: string, coin?: string) => {
    // 認証チェック
    if (!requireAuthForArticle(isAuthenticated)) {
      return
    }

    // URLパラメータとして渡す
    const params = new URLSearchParams({
      topic,
      ...(coin && { coin }),
      source: 'market'
    })
    router.push(`/content/workspace?${params.toString()}`)
    toast.success(`「${topic}」の記事生成を開始します`)
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-neural-error'
      case 'medium': return 'text-neural-warning'
      case 'low': return 'text-neural-cyan'
      default: return 'text-neural-text-secondary'
    }
  }

  const getUrgencyBg = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-neural-error/10 border-neural-error/20'
      case 'medium': return 'bg-neural-warning/10 border-neural-warning/20'
      case 'low': return 'bg-neural-cyan/10 border-neural-cyan/20'
      default: return 'bg-neural-surface/50 border-neural-elevated/20'
    }
  }

  const getPriceChangeColor = (change: number) => {
    return change >= 0 ? 'text-neural-success' : 'text-neural-error'
  }

  const getPriceChangeIcon = (change: number) => {
    return change >= 0 ? 
      <TrendingUp className="h-3 w-3" /> : 
      <TrendingDown className="h-3 w-3" />
  }

  const formatPrice = (price: number) => {
    if (price < 1) return `$${price.toFixed(4)}`
    if (price < 100) return `$${price.toFixed(2)}`
    return `$${price.toLocaleString()}`
  }

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '今'
    if (minutes < 60) return `${minutes}分前`
    const hours = Math.floor(minutes / 60)
    return `${hours}時間前`
  }

  if (loading) {
    return (
      <NeuralCard className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-6 w-6 text-neural-cyan animate-pulse" />
            Market Pulse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 neural-neumorphic-inset rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </NeuralCard>
    )
  }

  if (!marketData) {
    return (
      <NeuralCard className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-6 w-6 text-neural-error" />
            Market Pulse
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-neural-text-secondary mb-4">マーケットデータを読み込めませんでした</p>
          <NeuralButton onClick={loadMarketData} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            再試行
          </NeuralButton>
        </CardContent>
      </NeuralCard>
    )
  }

  // コンパクトモードのレンダリング
  if (viewMode === 'compact') {
    return (
      <NeuralCard className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-neural-cyan" />
            Market Pulse
            {isConnected ? (
              <div className="w-2 h-2 bg-neural-success rounded-full animate-pulse"></div>
            ) : (
              <div className="w-2 h-2 bg-neural-warning rounded-full"></div>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 主要通貨（上位3つ） */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium neural-title">Top Coins</h4>
            {marketData.top_coins.slice(0, 3).map((coin) => (
              <div key={coin.symbol} className="flex items-center justify-between py-2 border-b border-neural-elevated/20 last:border-0">
                <div className="flex items-center gap-2">
                  {coin.image ? (
                    <img 
                      src={coin.image} 
                      alt={coin.name}
                      className="w-4 h-4 rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const fallback = target.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-4 h-4 rounded-full bg-neural-elevated flex items-center justify-center" 
                    style={{display: coin.image ? 'none' : 'flex'}}
                  >
                    <span className="text-xs font-bold">{coin.symbol.slice(0, 2)}</span>
                  </div>
                  <span className="text-sm neural-title">{coin.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium neural-title">{formatPrice(coin.price)}</div>
                  <div className={cn("flex items-center gap-1 text-xs", getPriceChangeColor(coin.change24h))}>
                    {getPriceChangeIcon(coin.change24h)}
                    {coin.change24h > 0 ? '+' : ''}{coin.change24h.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 市場概況 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium neural-title">Market Overview</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-neural-text-secondary">Market Cap</span>
                <span className="neural-title">${marketData.totalMarketCap.toFixed(2)}T</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neural-text-secondary">BTC Dominance</span>
                <span className="neural-title">{marketData.btcDominance.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neural-text-secondary">Fear & Greed</span>
                <span className="neural-title">{marketData.fear_greed_index}</span>
              </div>
            </div>
          </div>

          {/* 重要アラート */}
          {marketData.alerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium neural-title flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-neural-warning" />
                Alerts ({marketData.alerts.length})
              </h4>
              <div className="space-y-1">
                {marketData.alerts.slice(0, 2).map((alert) => (
                  <div key={alert.id} className={cn("p-2 rounded text-xs", getUrgencyBg(alert.urgency))}>
                    <div className="flex items-center gap-1 mb-1">
                      <Badge className="text-xs">{alert.coin}</Badge>
                      <span className={getPriceChangeColor(alert.change)}>
                        {alert.change > 0 ? '+' : ''}{alert.change.toFixed(1)}%
                      </span>
                    </div>
                    <p className="leading-tight">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 更新時刻 */}
          <div className="text-xs text-neural-text-muted text-center pt-2 border-t border-neural-elevated/20">
            Last Updated: {marketData && new Date(marketData.lastUpdate).toLocaleTimeString('en-US')}
          </div>
        </CardContent>
      </NeuralCard>
    )
  }

  // フルモードのレンダリング
  return (
    <NeuralCard className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-6 w-6 text-neural-cyan" />
            Market Pulse
            {/* 接続状態とデータソースインジケーター */}
            <div className="flex items-center gap-1 text-xs">
              {isConnected ? (
                <div className="flex items-center gap-1 px-2 py-1 bg-neural-success/20 text-neural-success rounded-full">
                  <Wifi className="h-3 w-3" />
                  <span>Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1 bg-neural-warning/20 text-neural-warning rounded-full">
                  <WifiOff className="h-3 w-3" />
                  <span>Offline</span>
                </div>
              )}
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            {connectionError && (
              <NeuralButton 
                variant="ghost" 
                size="sm" 
                onClick={reconnect}
                className="h-6 text-xs text-neural-error hover:text-neural-error hover:bg-neural-error/10 cursor-pointer"
              >
                再接続
              </NeuralButton>
            )}
            <div className="flex items-center gap-1 text-xs text-neural-text-muted">
              <RefreshCw className="h-3 w-3" />
              {marketData && new Date(marketData.lastUpdate).toLocaleTimeString('ja-JP')}
            </div>
            {systemStats && (
              <div className="text-xs text-neural-text-muted">
                {systemStats.connectedClients}人接続中
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Market Alerts - 最重要セクション */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-neural-warning" />
            <h3 className="font-semibold neural-title">緊急マーケットアラート</h3>
          </div>
          <div className="space-y-2">
            {marketData.alerts.slice(0, 3).map((alert) => (
              <div 
                key={alert.id}
                className={cn(
                  "p-4 rounded-lg border neural-transition",
                  getUrgencyBg(alert.urgency)
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn("text-xs border-0 font-medium", getUrgencyColor(alert.urgency))}>
                        {alert.urgency.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {alert.coin}
                      </Badge>
                      <span className="text-xs text-neural-text-muted">
                        {formatTimeAgo(alert.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm neural-title mb-2">{alert.message}</p>
                    <div className="flex items-center gap-1 text-xs">
                      {getPriceChangeIcon(alert.change)}
                      <span className={getPriceChangeColor(alert.change)}>
                        {alert.change > 0 ? '+' : ''}{alert.change.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NeuralButton
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </NeuralButton>
                    <NeuralButton
                      variant="gradient"
                      size="sm"
                      onClick={() => handleGenerateArticle(alert.message, alert.coin)}
                      className="shrink-0"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      記事生成
                    </NeuralButton>
                  </div>
                </div>
              </div>
            ))}
            {marketData.alerts.length === 0 && (
              <div className="p-4 rounded-lg bg-neural-surface/50 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-neural-text-muted" />
                <p className="text-sm text-neural-text-muted">
                  {isConnected ? '新しいアラートを待機中...' : 'WebSocket接続を確認してください'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Trending Topics */}
        <div className="space-y-3">
          <h3 className="font-semibold neural-title">トレンドトピック</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {marketData.trending_topics.map((topic, index) => (
              <div
                key={index}
                className="p-3 neural-neumorphic-inset rounded-lg hover:shadow-lg neural-transition cursor-pointer group"
                onClick={() => handleGenerateArticle(topic)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium neural-title">{topic}</span>
                  <ChevronRight className="h-3 w-3 text-neural-text-muted group-hover:text-neural-cyan neural-transition" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cryptocurrencies */}
        <div className="space-y-3">
          <h3 className="font-semibold neural-title">注目の仮想通貨</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {marketData.top_coins.slice(0, 8).map((coin) => (
              <div 
                key={coin.symbol}
                className="p-3 neural-neumorphic-inset rounded-lg hover:shadow-lg neural-transition flex flex-col h-full cursor-pointer"
                data-clickable="true"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {coin.image ? (
                      <img 
                        src={coin.image} 
                        alt={coin.name}
                        className="w-6 h-6 rounded-full"
                        onError={(e) => {
                          // 画像読み込み失敗時はテキストにフォールバック
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const fallback = target.nextElementSibling as HTMLElement
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div className="w-6 h-6 rounded-full bg-neural-elevated flex items-center justify-center" style={{display: coin.image ? 'none' : 'flex'}}>
                      <span className="text-xs font-bold neural-title">{coin.symbol}</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm neural-title">{coin.symbol}</div>
                      <div className="text-xs text-neural-text-muted">{coin.name}</div>
                    </div>
                  </div>
                  
                  <Badge className={cn("text-xs border-0", getPriceChangeColor(coin.change24h))}>
                    {getPriceChangeIcon(coin.change24h)}
                    {coin.change24h > 0 ? '+' : ''}{coin.change24h.toFixed(1)}%
                  </Badge>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neural-text-secondary">Price</span>
                    <span className="font-semibold neural-title text-sm">{formatPrice(coin.price)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neural-text-secondary">Volume</span>
                    <span className="text-xs neural-title">{coin.volume?.toFixed(1)}B</span>
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-neural-border/20">
                  <NeuralButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerateArticle(`${coin.name}の市場分析`, coin.symbol)}
                    className="w-full h-8 text-xs bg-neural-cyan/10 hover:bg-neural-cyan/20 text-neural-cyan hover:text-neural-cyan border border-neural-cyan/30 hover:border-neural-cyan/50 rounded-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="font-medium">記事生成</span>
                  </NeuralButton>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Summary */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neural-elevated/20">
          <div className="text-center p-3 neural-neumorphic-inset rounded-lg">
            <Globe className="h-5 w-5 mx-auto mb-2 text-neural-cyan" />
            <div className="text-lg font-bold neural-title">${marketData.totalMarketCap.toFixed(2)}T</div>
            <div className="text-xs text-neural-text-secondary">Total Market Cap</div>
          </div>
          
          <div className="text-center p-3 neural-neumorphic-inset rounded-lg">
            <Bitcoin className="h-5 w-5 mx-auto mb-2 text-neural-warning" />
            <div className="text-lg font-bold neural-title text-neural-warning">{marketData.btcDominance.toFixed(1)}%</div>
            <div className="text-xs text-neural-text-secondary">BTC Dominance</div>
          </div>
          
          <div className="text-center p-3 neural-neumorphic-inset rounded-lg">
            <Activity className="h-5 w-5 mx-auto mb-2 text-neural-success" />
            <div className="text-lg font-bold neural-title text-neural-success">
              {marketData.fear_greed_index}
            </div>
            <div className="text-xs text-neural-text-secondary">Fear & Greed</div>
          </div>
        </div>
      </CardContent>
    </NeuralCard>
  )
}