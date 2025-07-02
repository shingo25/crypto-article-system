import { createComponentLogger } from './simple-logger'
import { AppError, ErrorType } from './error-handler'

const componentLogger = createComponentLogger('MarketData')

// 市場データの型定義
export interface CryptoCurrency {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_24h: number
  price_change_percentage_24h: number
  market_cap: number
  volume_24h: number
  circulating_supply: number
  total_supply: number
  max_supply: number | null
  market_cap_rank: number
  last_updated: string
}

export interface PriceData {
  timestamp: number
  price: number
  volume: number
}

export interface MarketTrend {
  symbol: string
  direction: 'up' | 'down' | 'stable'
  strength: number // 0-100
  timeframe: '1h' | '4h' | '24h' | '7d'
  indicators: {
    rsi: number
    macd: number
    bollinger_position: number
  }
}

export interface NewsAlert {
  id: string
  title: string
  summary: string
  sentiment: 'positive' | 'negative' | 'neutral'
  impact_score: number // 0-100
  symbols_affected: string[]
  timestamp: string
  source: string
}

// WebSocket接続管理クラス
export class MarketDataService {
  private static instance: MarketDataService
  private ws: WebSocket | null = null
  private subscribers: Map<string, Set<Function>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 5000
  private isConnected = false

  public static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService()
    }
    return MarketDataService.instance
  }

  // WebSocket接続を開始
  public async connect(): Promise<void> {
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        return
      }

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://stream.binance.com:9443/ws/btcusdt@ticker'
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        componentLogger.info('WebSocket接続成功')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.subscribeToStreams()
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }

      this.ws.onclose = () => {
        componentLogger.warn('WebSocket接続が閉じられました')
        this.isConnected = false
        this.handleReconnect()
      }

      this.ws.onerror = (error) => {
        componentLogger.error('WebSocket エラー', error as Error)
        this.isConnected = false
      }
    } catch (error) {
      componentLogger.error('WebSocket接続に失敗', error as Error)
      throw new AppError('Failed to connect to market data', {
        type: ErrorType.SYSTEM_ERROR,
        statusCode: 500,
        userMessage: '市場データへの接続に失敗しました'
      })
    }
  }

  // 再接続処理
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      componentLogger.error('WebSocket再接続の最大試行回数に達しました')
      return
    }

    this.reconnectAttempts++
    componentLogger.info(`WebSocket再接続を試行中 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      this.connect()
    }, this.reconnectInterval * this.reconnectAttempts)
  }

  // メッセージ処理
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)
      
      // Binance ticker フォーマット
      if (message.e === '24hrTicker') {
        const priceData: PriceData = {
          timestamp: message.E,
          price: parseFloat(message.c),
          volume: parseFloat(message.v)
        }
        
        this.notifySubscribers(`price_${message.s.toLowerCase()}`, priceData)
      }
      
      // カスタムメッセージフォーマット
      if (message.type) {
        this.notifySubscribers(message.type, message.data)
      }
    } catch (error) {
      componentLogger.error('WebSocketメッセージの解析に失敗', error as Error)
    }
  }

  // ストリーム購読
  private subscribeToStreams(): void {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT']
    
    symbols.forEach(symbol => {
      this.sendMessage({
        method: 'SUBSCRIBE',
        params: [`${symbol.toLowerCase()}@ticker`],
        id: Date.now()
      })
    })
  }

  // メッセージ送信
  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  // イベント購読
  public subscribe(event: string, callback: Function): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set())
    }
    
    this.subscribers.get(event)!.add(callback)
    
    // 購読解除関数を返す
    return () => {
      const eventSubscribers = this.subscribers.get(event)
      if (eventSubscribers) {
        eventSubscribers.delete(callback)
        if (eventSubscribers.size === 0) {
          this.subscribers.delete(event)
        }
      }
    }
  }

  // 購読者に通知
  private notifySubscribers(event: string, data: any): void {
    const eventSubscribers = this.subscribers.get(event)
    if (eventSubscribers) {
      eventSubscribers.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          componentLogger.error('購読者コールバックでエラー', error as Error)
        }
      })
    }
  }

  // 接続状態確認
  public isConnectedToMarket(): boolean {
    return this.isConnected
  }

  // 接続終了
  public disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
      this.subscribers.clear()
    }
  }
}

// REST API でのデータ取得
export class MarketDataAPI {
  private static baseUrl = 'https://api.coingecko.com/api/v3'
  private static cache: Map<string, { data: any; timestamp: number }> = new Map()
  private static cacheTimeout = 60000 // 1分

  // トップ暗号通貨取得
  public static async getTopCryptocurrencies(limit = 50): Promise<CryptoCurrency[]> {
    const cacheKey = `top_cryptos_${limit}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      const response = await fetch(
        `${this.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      this.setCache(cacheKey, data)
      
      componentLogger.info(`トップ${limit}暗号通貨データを取得`, { count: data.length })
      return data
    } catch (error) {
      componentLogger.error('暗号通貨データの取得に失敗', error as Error)
      throw new AppError('Failed to fetch cryptocurrency data', {
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        statusCode: 500,
        userMessage: '暗号通貨データの取得に失敗しました'
      })
    }
  }

  // 価格履歴取得
  public static async getPriceHistory(
    coinId: string,
    days = 7
  ): Promise<PriceData[]> {
    const cacheKey = `price_history_${coinId}_${days}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      const response = await fetch(
        `${this.baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=hourly`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const priceHistory: PriceData[] = data.prices.map((price: [number, number], index: number) => ({
        timestamp: price[0],
        price: price[1],
        volume: data.total_volumes[index] ? data.total_volumes[index][1] : 0
      }))

      this.setCache(cacheKey, priceHistory)
      
      componentLogger.info(`${coinId}の価格履歴を取得`, { days, dataPoints: priceHistory.length })
      return priceHistory
    } catch (error) {
      componentLogger.error('価格履歴の取得に失敗', error as Error)
      throw new AppError('Failed to fetch price history', {
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        statusCode: 500,
        userMessage: '価格履歴の取得に失敗しました'
      })
    }
  }

  // 市場トレンド分析
  public static async analyzeMarketTrends(symbols: string[]): Promise<MarketTrend[]> {
    const trends: MarketTrend[] = []

    for (const symbol of symbols) {
      try {
        const history = await this.getPriceHistory(symbol.toLowerCase(), 7)
        const trend = this.calculateTrend(symbol, history)
        trends.push(trend)
      } catch (error) {
        componentLogger.warn(`${symbol}のトレンド分析に失敗`, { error })
      }
    }

    return trends
  }

  // トレンド計算
  private static calculateTrend(symbol: string, history: PriceData[]): MarketTrend {
    if (history.length < 14) {
      return {
        symbol,
        direction: 'stable',
        strength: 0,
        timeframe: '24h',
        indicators: { rsi: 50, macd: 0, bollinger_position: 0.5 }
      }
    }

    const prices = history.map(h => h.price)
    const latest = prices[prices.length - 1]
    const previous = prices[prices.length - 24] || prices[0]
    
    const change = ((latest - previous) / previous) * 100
    const direction = change > 1 ? 'up' : change < -1 ? 'down' : 'stable'
    const strength = Math.min(Math.abs(change) * 10, 100)

    // 簡易RSI計算
    const rsi = this.calculateRSI(prices.slice(-14))
    
    return {
      symbol,
      direction,
      strength,
      timeframe: '24h',
      indicators: {
        rsi,
        macd: change, // 簡略化
        bollinger_position: Math.random() // 実装時は実際の計算を行う
      }
    }
  }

  // RSI計算
  private static calculateRSI(prices: number[]): number {
    if (prices.length < 14) return 50

    let gains = 0
    let losses = 0

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      if (change > 0) {
        gains += change
      } else {
        losses += Math.abs(change)
      }
    }

    const avgGain = gains / (prices.length - 1)
    const avgLoss = losses / (prices.length - 1)
    
    if (avgLoss === 0) return 100
    
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  // キャッシュ管理
  private static getFromCache(key: string): any {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }
    return null
  }

  private static setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }
}

// シングルトンインスタンス
export const marketDataService = MarketDataService.getInstance()