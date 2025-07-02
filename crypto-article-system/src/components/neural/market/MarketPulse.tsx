'use client'

import React, { useState, useEffect } from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  RefreshCw, 
  Sparkles,
  AlertTriangle,
  Bell,
  ChevronRight,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarketDataAPI, CryptoCurrency } from '@/lib/market-data'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

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
  }[]
  trending_topics: string[]
}

export function MarketPulse() {
  const [marketData, setMarketData] = useState<MarketPulseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const router = useRouter()

  const loadMarketData = async () => {
    try {
      // 実際のマーケットデータを取得
      const cryptocurrencies = await MarketDataAPI.getTopCryptocurrencies(8)
      
      // モックのアラートデータ
      const mockAlerts: MarketAlert[] = [
        {
          id: '1',
          coin: 'BTC',
          message: 'ビットコインが5%急騰、機関投資家の買いが活発化',
          urgency: 'high',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          change: 5.2
        },
        {
          id: '2', 
          coin: 'ETH',
          message: 'イーサリアム上のDeFiプロトコルで大量資金流入',
          urgency: 'medium',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          change: 3.1
        },
        {
          id: '3',
          coin: 'SOL',
          message: 'Solana エコシステムでの新プロジェクト発表',
          urgency: 'medium',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          change: 2.8
        }
      ]

      const formattedCoins = cryptocurrencies.map((crypto: CryptoCurrency) => ({
        symbol: crypto.symbol.toUpperCase(),
        name: crypto.name,
        price: crypto.current_price,
        change24h: crypto.price_change_percentage_24h || 0,
        volume: crypto.total_volume / 1000000000,
        trend: (crypto.price_change_percentage_24h || 0) > 5 ? 'bullish' : 
               (crypto.price_change_percentage_24h || 0) < -3 ? 'bearish' : 'neutral'
      }))

      setMarketData({
        lastUpdate: new Date().toISOString(),
        totalMarketCap: 2.89,
        btcDominance: 52.3,
        fear_greed_index: Math.round(Math.random() * 30 + 50),
        alerts: mockAlerts,
        top_coins: formattedCoins,
        trending_topics: ['DeFi Recovery', 'Layer 2 Scaling', 'Regulatory Clarity', 'Institutional Adoption']
      })
    } catch (error) {
      console.error('Failed to load market data:', error)
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
          }
        ],
        top_coins: [
          { symbol: 'BTC', name: 'Bitcoin', price: 67420, change24h: 3.47, volume: 28.9, trend: 'bullish' },
          { symbol: 'ETH', name: 'Ethereum', price: 3845, change24h: 5.12, volume: 15.2, trend: 'bullish' },
          { symbol: 'SOL', name: 'Solana', price: 178, change24h: -1.23, volume: 4.8, trend: 'bearish' },
          { symbol: 'ADA', name: 'Cardano', price: 1.02, change24h: 2.89, volume: 1.9, trend: 'neutral' }
        ],
        trending_topics: ['DeFi Recovery', 'Layer 2 Scaling', 'Regulatory Clarity']
      }
      setMarketData(fallbackData)
      toast.error('マーケットデータの読み込みに失敗しました（モックデータを表示中）')
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      await loadMarketData()
      setLoading(false)
    }
    loadInitialData()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadMarketData()
    }, 60000) // 1分間隔

    return () => clearInterval(interval)
  }, [autoRefresh])

  const handleGenerateArticle = (topic: string, coin?: string) => {
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

  return (
    <NeuralCard className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-6 w-6 text-neural-cyan" />
            Market Pulse
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-neural-text-muted">
              <RefreshCw className="h-3 w-3" />
              {new Date(marketData.lastUpdate).toLocaleTimeString('ja-JP')}
            </div>
            <NeuralButton 
              variant="ghost" 
              size="sm" 
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={cn("h-3 w-3", autoRefresh && "animate-spin")} />
            </NeuralButton>
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
            ))}
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
                className="p-3 neural-neumorphic-inset rounded-lg hover:shadow-lg neural-transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-neural-elevated flex items-center justify-center">
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
                
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neural-text-secondary">Price</span>
                    <span className="font-semibold neural-title text-sm">{formatPrice(coin.price)}</span>
                  </div>
                </div>

                <NeuralButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGenerateArticle(`${coin.name}の市場分析`, coin.symbol)}
                  className="w-full text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  分析記事を生成
                </NeuralButton>
              </div>
            ))}
          </div>
        </div>

        {/* Market Summary */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neural-elevated/20">
          <div className="text-center p-3 neural-neumorphic-inset rounded-lg">
            <DollarSign className="h-5 w-5 mx-auto mb-2 text-neural-cyan" />
            <div className="text-lg font-bold neural-title">${marketData.totalMarketCap}T</div>
            <div className="text-xs text-neural-text-secondary">Total Market Cap</div>
          </div>
          
          <div className="text-center p-3 neural-neumorphic-inset rounded-lg">
            <div className="text-lg font-bold neural-title text-neural-warning">{marketData.btcDominance}%</div>
            <div className="text-xs text-neural-text-secondary">BTC Dominance</div>
          </div>
          
          <div className="text-center p-3 neural-neumorphic-inset rounded-lg">
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