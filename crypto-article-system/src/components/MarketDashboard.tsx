'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createComponentLogger } from '@/lib/simple-logger'
import { MarketDataAPI, CryptoCurrency, MarketTrend, marketDataService } from '@/lib/market-data'
import { priceAlertManager, PriceAlert } from '@/lib/price-alerts'
import toast from 'react-hot-toast'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  AlertTriangle,
  CheckCircle,
  Zap,
  Activity,
  DollarSign,
  BarChart3,
  Globe,
  Wifi,
  WifiOff,
  Plus,
  Settings,
  Eye,
  Trash2
} from 'lucide-react'

const componentLogger = createComponentLogger('MarketDashboard')

interface PriceData {
  timestamp: number
  price: number
  volume: number
}

export default function MarketDashboard() {
  const [cryptocurrencies, setCryptocurrencies] = useState<CryptoCurrency[]>([])
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency | null>(null)
  const [priceHistory, setPriceHistory] = useState<PriceData[]>([])
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([])
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')
  const [activeTab, setActiveTab] = useState('overview')
  const [realtimePrices, setRealtimePrices] = useState<Map<string, number>>(new Map())
  
  // アラート作成フォーム
  const [alertForm, setAlertForm] = useState({
    symbol: '',
    coinName: '',
    condition: 'above' as 'above' | 'below' | 'change_percent',
    targetPrice: '',
    changePercent: '',
    timeframe: '24h' as '1h' | '4h' | '24h',
    notificationMethod: ['email'] as ('email' | 'push' | 'webhook')[],
    webhookUrl: ''
  })

  const unsubscribeRef = useRef<(() => void)[]>([])

  // 初期データ読み込み
  useEffect(() => {
    loadInitialData()
    return () => {
      // クリーンアップ
      unsubscribeRef.current.forEach(unsubscribe => unsubscribe())
      marketDataService.disconnect()
    }
  }, [])

  // リアルタイム接続
  useEffect(() => {
    if (cryptocurrencies.length > 0) {
      connectToRealtimeData()
    }
  }, [cryptocurrencies])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // 並行してデータを取得
      const [cryptoData, trendsData, alertsData] = await Promise.all([
        MarketDataAPI.getTopCryptocurrencies(20),
        MarketDataAPI.analyzeMarketTrends(['bitcoin', 'ethereum', 'cardano', 'polkadot', 'chainlink']),
        priceAlertManager.getUserAlerts('user_demo', 'tenant_demo')
      ])

      setCryptocurrencies(cryptoData)
      setMarketTrends(trendsData)
      setAlerts(alertsData)
      
      // デフォルトでBitcoinを選択
      if (cryptoData.length > 0) {
        setSelectedCrypto(cryptoData[0])
        const history = await MarketDataAPI.getPriceHistory('bitcoin', 7)
        setPriceHistory(history)
      }

    } catch (error) {
      componentLogger.error('初期データの読み込みに失敗', error as Error)
      toast.error('市場データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const connectToRealtimeData = async () => {
    try {
      setConnectionStatus('connecting')
      
      await marketDataService.connect()
      setConnectionStatus('connected')
      
      // 主要通貨の価格変動を監視
      const symbols = ['btcusdt', 'ethusdt', 'adausdt', 'dotusdt', 'linkusdt']
      
      symbols.forEach(symbol => {
        const unsubscribe = marketDataService.subscribe(`price_${symbol}`, (priceData: any) => {
          setRealtimePrices(prev => {
            const newPrices = new Map(prev)
            newPrices.set(symbol, priceData.price)
            return newPrices
          })
          
          // 選択中の通貨の場合、価格履歴を更新
          if (selectedCrypto && selectedCrypto.symbol.toLowerCase() + 'usdt' === symbol) {
            setPriceHistory(prev => [...prev.slice(-100), {
              timestamp: priceData.timestamp,
              price: priceData.price,
              volume: priceData.volume
            }])
          }
        })
        
        unsubscribeRef.current.push(unsubscribe)
      })
      
    } catch (error) {
      componentLogger.error('リアルタイムデータ接続に失敗', error as Error)
      setConnectionStatus('disconnected')
      toast.error('リアルタイムデータに接続できませんでした')
    }
  }

  const selectCrypto = async (crypto: CryptoCurrency) => {
    try {
      setSelectedCrypto(crypto)
      const history = await MarketDataAPI.getPriceHistory(crypto.id, 7)
      setPriceHistory(history)
      
      // アラートフォームにシンボル設定
      setAlertForm(prev => ({
        ...prev,
        symbol: crypto.symbol,
        coinName: crypto.name
      }))
    } catch (error) {
      componentLogger.error('暗号通貨履歴の取得に失敗', error as Error)
      toast.error('価格履歴の取得に失敗しました')
    }
  }

  const createAlert = async () => {
    try {
      if (!alertForm.symbol || !alertForm.coinName) {
        toast.error('暗号通貨を選択してください')
        return
      }

      const alertData = {
        userId: 'user_demo',
        tenantId: 'tenant_demo',
        symbol: alertForm.symbol,
        coinName: alertForm.coinName,
        condition: alertForm.condition,
        targetPrice: alertForm.targetPrice ? parseFloat(alertForm.targetPrice) : undefined,
        changePercent: alertForm.changePercent ? parseFloat(alertForm.changePercent) : undefined,
        timeframe: alertForm.condition === 'change_percent' ? alertForm.timeframe : undefined,
        isActive: true,
        notificationMethod: alertForm.notificationMethod,
        webhookUrl: alertForm.webhookUrl || undefined
      }

      const newAlert = await priceAlertManager.createAlert(alertData)
      setAlerts(prev => [...prev, newAlert])
      
      // フォームリセット
      setAlertForm(prev => ({
        ...prev,
        targetPrice: '',
        changePercent: '',
        webhookUrl: ''
      }))
      
      toast.success('価格アラートを作成しました')
    } catch (error) {
      componentLogger.error('アラート作成に失敗', error as Error)
      toast.error('アラートの作成に失敗しました')
    }
  }

  const deleteAlert = async (alertId: string) => {
    try {
      await priceAlertManager.deleteAlert(alertId)
      setAlerts(prev => prev.filter(alert => alert.id !== alertId))
      toast.success('アラートを削除しました')
    } catch (error) {
      componentLogger.error('アラート削除に失敗', error as Error)
      toast.error('アラートの削除に失敗しました')
    }
  }

  const toggleAlert = async (alertId: string) => {
    try {
      const alert = alerts.find(a => a.id === alertId)
      if (!alert) return

      const updatedAlert = await priceAlertManager.updateAlert(alertId, {
        isActive: !alert.isActive
      })
      
      setAlerts(prev => prev.map(a => a.id === alertId ? updatedAlert : a))
      toast.success(updatedAlert.isActive ? 'アラートを有効にしました' : 'アラートを無効にしました')
    } catch (error) {
      componentLogger.error('アラート更新に失敗', error as Error)
      toast.error('アラートの更新に失敗しました')
    }
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-400" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-400" />
      default: return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('ja-JP', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    const color = change >= 0 ? 'text-green-400' : 'text-red-400'
    return <span className={color}>{sign}{change.toFixed(2)}%</span>
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-800 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-800 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <Activity className="h-8 w-8" />
            リアルタイム市場分析
          </h2>
          <p className="text-gray-400 mt-1">暗号通貨市場の動向をリアルタイムで監視</p>
        </div>
        
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <Badge className="bg-green-600 text-white">
              <Wifi className="h-3 w-3 mr-1" />
              接続中
            </Badge>
          ) : connectionStatus === 'connecting' ? (
            <Badge className="bg-yellow-600 text-white">
              <Globe className="h-3 w-3 mr-1" />
              接続中...
            </Badge>
          ) : (
            <Badge className="bg-red-600 text-white">
              <WifiOff className="h-3 w-3 mr-1" />
              切断
            </Badge>
          )}
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <DollarSign className="h-8 w-8 text-green-400" />
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {cryptocurrencies.length ? cryptocurrencies[0].current_price.toLocaleString() : '---'}
                </p>
                <p className="text-sm text-gray-400">BTC/USD</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <BarChart3 className="h-8 w-8 text-blue-400" />
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  ${cryptocurrencies.reduce((sum, crypto) => sum + crypto.market_cap, 0).toLocaleString().slice(0, -9)}B
                </p>
                <p className="text-sm text-gray-400">総時価総額</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-8 w-8 text-purple-400" />
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {marketTrends.filter(t => t.direction === 'up').length}
                </p>
                <p className="text-sm text-gray-400">上昇トレンド</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Bell className="h-8 w-8 text-orange-400" />
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {alerts.filter(alert => alert.isActive && !alert.isTriggered).length}
                </p>
                <p className="text-sm text-gray-400">アクティブアラート</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-600">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="charts">チャート</TabsTrigger>
          <TabsTrigger value="trends">トレンド分析</TabsTrigger>
          <TabsTrigger value="alerts">価格アラート</TabsTrigger>
        </TabsList>

        {/* 概要タブ */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* トップ暗号通貨 */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">トップ暗号通貨</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cryptocurrencies.slice(0, 10).map((crypto, index) => {
                    const realtimePrice = realtimePrices.get(crypto.symbol.toLowerCase() + 'usdt')
                    const displayPrice = realtimePrice || crypto.current_price
                    const priceChanged = realtimePrice && Math.abs(realtimePrice - crypto.current_price) > 0.01
                    
                    return (
                      <div 
                        key={crypto.id} 
                        className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
                          selectedCrypto?.id === crypto.id ? 'bg-slate-700' : 'hover:bg-slate-900'
                        } ${priceChanged ? 'animate-pulse bg-blue-900' : ''}`}
                        onClick={() => selectCrypto(crypto)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-sm w-6">#{crypto.market_cap_rank}</span>
                          <div>
                            <p className="text-white font-medium">{crypto.name}</p>
                            <p className="text-gray-400 text-sm">{crypto.symbol.toUpperCase()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{formatPrice(displayPrice)}</p>
                          {formatChange(crypto.price_change_percentage_24h)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 市場トレンド */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">市場トレンド分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {marketTrends.map((trend) => (
                    <div key={trend.symbol} className="flex items-center justify-between p-3 bg-slate-900 rounded">
                      <div className="flex items-center gap-3">
                        {getTrendIcon(trend.direction)}
                        <div>
                          <p className="text-white font-medium">{trend.symbol.toUpperCase()}</p>
                          <p className="text-sm text-gray-400">{trend.timeframe}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{trend.strength.toFixed(0)}%</span>
                          <Badge 
                            className={`${
                              trend.direction === 'up' ? 'bg-green-600' : 
                              trend.direction === 'down' ? 'bg-red-600' : 'bg-gray-600'
                            }`}
                          >
                            {trend.direction === 'up' ? '強気' : trend.direction === 'down' ? '弱気' : '中立'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">RSI: {trend.indicators.rsi.toFixed(1)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* チャートタブ */}
        <TabsContent value="charts" className="space-y-4">
          {selectedCrypto && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  {selectedCrypto.name} ({selectedCrypto.symbol.toUpperCase()})
                  <Badge className="bg-blue-600">{formatPrice(selectedCrypto.current_price)}</Badge>
                  {formatChange(selectedCrypto.price_change_percentage_24h)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <AreaChart data={priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="timestamp"
                        tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                        stroke="#9CA3AF"
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                        stroke="#9CA3AF"
                      />
                      <Tooltip 
                        labelFormatter={(timestamp) => new Date(timestamp).toLocaleString('ja-JP')}
                        formatter={(value: number) => [formatPrice(value), '価格']}
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* トレンド分析タブ */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">トレンド強度</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={marketTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="symbol" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'トレンド強度']}
                      />
                      <Bar dataKey="strength" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">RSI指標</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={marketTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="symbol" stroke="#9CA3AF" />
                      <YAxis domain={[0, 100]} stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                        formatter={(value: number) => [value.toFixed(1), 'RSI']}
                      />
                      <Line type="monotone" dataKey="indicators.rsi" stroke="#F59E0B" strokeWidth={2} />
                      <Line y={70} stroke="#EF4444" strokeDasharray="5 5" />
                      <Line y={30} stroke="#10B981" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 価格アラートタブ */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* アラート作成フォーム */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  新しい価格アラート
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">暗号通貨</Label>
                    <Input 
                      value={alertForm.coinName}
                      placeholder="選択してください"
                      readOnly
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">条件</Label>
                    <select 
                      value={alertForm.condition}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, condition: e.target.value as any }))}
                      className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                    >
                      <option value="above">以上</option>
                      <option value="below">以下</option>
                      <option value="change_percent">変動率</option>
                    </select>
                  </div>
                </div>

                {(alertForm.condition === 'above' || alertForm.condition === 'below') && (
                  <div>
                    <Label className="text-gray-300">目標価格 (USD)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={alertForm.targetPrice}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, targetPrice: e.target.value }))}
                      placeholder="0.00"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                )}

                {alertForm.condition === 'change_percent' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">変動率 (%)</Label>
                      <Input 
                        type="number"
                        step="0.1"
                        value={alertForm.changePercent}
                        onChange={(e) => setAlertForm(prev => ({ ...prev, changePercent: e.target.value }))}
                        placeholder="5.0"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">時間枠</Label>
                      <select 
                        value={alertForm.timeframe}
                        onChange={(e) => setAlertForm(prev => ({ ...prev, timeframe: e.target.value as any }))}
                        className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                      >
                        <option value="1h">1時間</option>
                        <option value="4h">4時間</option>
                        <option value="24h">24時間</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-gray-300">通知方法</Label>
                  <div className="flex gap-2 mt-2">
                    {['email', 'push', 'webhook'].map(method => (
                      <label key={method} className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          checked={alertForm.notificationMethod.includes(method as any)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAlertForm(prev => ({ 
                                ...prev, 
                                notificationMethod: [...prev.notificationMethod, method as any] 
                              }))
                            } else {
                              setAlertForm(prev => ({ 
                                ...prev, 
                                notificationMethod: prev.notificationMethod.filter(m => m !== method) 
                              }))
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-gray-300 capitalize">{method}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {alertForm.notificationMethod.includes('webhook') && (
                  <div>
                    <Label className="text-gray-300">Webhook URL</Label>
                    <Input 
                      type="url"
                      value={alertForm.webhookUrl}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, webhookUrl: e.target.value }))}
                      placeholder="https://your-webhook.com/alerts"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                )}

                <Button 
                  onClick={createAlert}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!alertForm.symbol || (!alertForm.targetPrice && !alertForm.changePercent)}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  アラートを作成
                </Button>
              </CardContent>
            </Card>

            {/* アラート一覧 */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  アクティブアラート ({alerts.filter(a => a.isActive && !a.isTriggered).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">アラートがありません</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div key={alert.id} className="p-4 bg-slate-900 rounded border border-slate-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-blue-600">
                                {alert.coinName} ({alert.symbol.toUpperCase()})
                              </Badge>
                              {alert.isTriggered ? (
                                <Badge className="bg-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  発動済み
                                </Badge>
                              ) : alert.isActive ? (
                                <Badge className="bg-orange-600">
                                  <Activity className="h-3 w-3 mr-1" />
                                  監視中
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-600">
                                  無効
                                </Badge>
                              )}
                            </div>
                            <p className="text-white text-sm mb-1">
                              {alert.condition === 'above' && `価格が $${alert.targetPrice?.toLocaleString()} 以上`}
                              {alert.condition === 'below' && `価格が $${alert.targetPrice?.toLocaleString()} 以下`}
                              {alert.condition === 'change_percent' && `${alert.timeframe}で${Math.abs(alert.changePercent || 0)}%以上変動`}
                            </p>
                            <p className="text-gray-400 text-xs">
                              作成: {new Date(alert.createdAt).toLocaleString('ja-JP')}
                              {alert.triggeredAt && ` | 発動: ${new Date(alert.triggeredAt).toLocaleString('ja-JP')}`}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleAlert(alert.id)}
                              className="border-slate-600"
                            >
                              {alert.isActive ? <Eye className="h-3 w-3" /> : <Settings className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteAlert(alert.id)}
                              className="border-red-600 text-red-400 hover:bg-red-900"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}