'use client'

import React, { useState, useEffect } from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarketDataAPI, CryptoCurrency } from '@/lib/market-data'
import toast from 'react-hot-toast'

interface MarketOverview {
  lastUpdate: string
  totalMarketCap: number
  btcDominance: number
  fear_greed_index: number
  top_coins: {
    symbol: string
    name: string
    price: number
    change24h: number
    volume: number
  }[]
}

export function MarketDataNeural() {
  const [marketData, setMarketData] = useState<MarketOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadMarketData = async () => {
    try {
      // 暗号通貨データを取得
      const cryptocurrencies = await MarketDataAPI.getTopCryptocurrencies(6)
      
      // モックデータで補完（実際のAPIから取得できない場合）
      const mockOverviewData = {
        lastUpdate: new Date().toISOString(),
        totalMarketCap: 2.89,
        btcDominance: 52.3,
        fear_greed_index: Math.round(Math.random() * 30 + 50) // 50-80の範囲
      }

      const formattedCoins = cryptocurrencies.map((crypto: CryptoCurrency) => ({
        symbol: crypto.symbol.toUpperCase(),
        name: crypto.name,
        price: crypto.current_price,
        change24h: crypto.price_change_percentage_24h || 0,
        volume: crypto.total_volume / 1000000000 // Convert to billions
      }))

      setMarketData({
        ...mockOverviewData,
        top_coins: formattedCoins
      })
    } catch (error) {
      console.error('Failed to load market data:', error)
      
      // フォールバック用のモックデータ
      const fallbackData: MarketOverview = {
        lastUpdate: new Date().toISOString(),
        totalMarketCap: 2.89,
        btcDominance: 52.3,
        fear_greed_index: 68,
        top_coins: [
          { symbol: 'BTC', name: 'Bitcoin', price: 67420, change24h: 3.47, volume: 28.9 },
          { symbol: 'ETH', name: 'Ethereum', price: 3845, change24h: 5.12, volume: 15.2 },
          { symbol: 'SOL', name: 'Solana', price: 178, change24h: -1.23, volume: 4.8 },
          { symbol: 'ADA', name: 'Cardano', price: 1.02, change24h: 2.89, volume: 1.9 },
          { symbol: 'MATIC', name: 'Polygon', price: 0.87, change24h: 4.15, volume: 1.1 },
          { symbol: 'LINK', name: 'Chainlink', price: 18.45, change24h: -0.56, volume: 0.8 }
        ]
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

  if (loading) {
    return (
      <NeuralCard className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-neural-cyan animate-pulse" />
            Market Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 neural-neumorphic-inset rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </NeuralCard>
    )
  }

  if (!marketData) {
    return (
      <NeuralCard className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-neural-error" />
            Market Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-neural-text-secondary mb-4">マーケットデータを読み込めませんでした</p>
          <NeuralButton onClick={loadMarketData} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            再試行
          </NeuralButton>
        </CardContent>
      </NeuralCard>
    )
  }

  const { lastUpdate, totalMarketCap, btcDominance, fear_greed_index, top_coins } = marketData

  const getPriceChangeColor = (change: number) => {
    return change >= 0 ? 'text-neural-success' : 'text-neural-error'
  }

  const getPriceChangeIcon = (change: number) => {
    return change >= 0 ? 
      <TrendingUp className="h-3 w-3" /> : 
      <TrendingDown className="h-3 w-3" />
  }

  const getFearGreedColor = (index: number) => {
    if (index < 25) return 'text-neural-error'
    if (index < 50) return 'text-neural-warning'
    if (index < 75) return 'text-neural-cyan'
    return 'text-neural-success'
  }

  const formatPrice = (price: number) => {
    if (price < 1) return `$${price.toFixed(4)}`
    if (price < 100) return `$${price.toFixed(2)}`
    return `$${price.toLocaleString()}`
  }

  return (
    <NeuralCard className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-neural-cyan" />
            Market Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-neural-text-muted">
              <RefreshCw className="h-3 w-3" />
              {new Date(lastUpdate).toLocaleTimeString('ja-JP')}
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
      
      <CardContent className="space-y-4">
        {/* Market Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 neural-neumorphic-inset rounded-lg">
            <DollarSign className="h-5 w-5 mx-auto mb-2 text-neural-cyan" />
            <div className="text-lg font-bold neural-title">${totalMarketCap}T</div>
            <div className="text-xs text-neural-text-secondary">Market Cap</div>
          </div>
          
          <div className="text-center p-3 neural-neumorphic-inset rounded-lg">
            <div className="text-lg font-bold neural-title text-neural-warning">{btcDominance}%</div>
            <div className="text-xs text-neural-text-secondary">BTC Dominance</div>
          </div>
          
          <div className="text-center p-3 neural-neumorphic-inset rounded-lg">
            <div className={cn("text-lg font-bold neural-title", getFearGreedColor(fear_greed_index))}>
              {fear_greed_index}
            </div>
            <div className="text-xs text-neural-text-secondary">Fear & Greed</div>
          </div>
        </div>

        {/* Top Cryptocurrencies */}
        <div className="space-y-3">
          <h4 className="font-medium neural-title text-sm">Top Cryptocurrencies</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {top_coins.map((coin) => (
              <div 
                key={coin.symbol}
                className="p-3 neural-neumorphic-inset rounded-lg hover:shadow-lg neural-transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-neural-elevated flex items-center justify-center">
                      <span className="text-xs font-bold neural-title">{coin.symbol}</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm neural-title">{coin.symbol}</div>
                      <div className="text-xs text-neural-text-muted">{coin.name}</div>
                    </div>
                  </div>
                  
                  <Badge className={cn("text-xs border-0", getPriceChangeColor(coin.change24h))}>
                    {getPriceChangeIcon(coin.change24h)}
                    {coin.change24h > 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neural-text-secondary">Price</span>
                    <span className="font-semibold neural-title">{formatPrice(coin.price)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neural-text-secondary">Volume</span>
                    <span className="text-xs font-medium">${coin.volume}B</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Insights */}
        <div className="p-3 neural-neumorphic-inset rounded-lg">
          <h4 className="font-medium neural-title text-sm mb-2">Market Insights</h4>
          <div className="text-xs text-neural-text-secondary space-y-1">
            <p>• Overall market sentiment is bullish with {fear_greed_index} fear & greed index</p>
            <p>• Bitcoin maintains strong dominance at {btcDominance}%</p>
            <p>• {top_coins.filter(c => c.change24h > 0).length} out of {top_coins.length} top coins are up today</p>
          </div>
        </div>
      </CardContent>
    </NeuralCard>
  )
}