import { createComponentLogger } from './simple-logger'
import { AppError, ErrorType } from './error-handler'
import { PrismaClient } from '@/generated/prisma'

const componentLogger = createComponentLogger('MarketAlertService')
const prisma = new PrismaClient()

// アラートレベルの定義
export enum AlertLevel {
  HIGH = 'high',
  MEDIUM = 'medium', 
  LOW = 'low'
}

// アラートタイプの定義
export enum AlertType {
  PRICE_CHANGE = 'price_change',
  VOLUME_SPIKE = 'volume_spike',
  SENTIMENT = 'sentiment',
  MARKET_STRUCTURE = 'market_structure'
}

// アラート条件の設定
export const ALERT_CONDITIONS = {
  // 価格変動アラート (CoinGecko TOP300対象)
  PRICE_CHANGE: {
    [AlertLevel.HIGH]: { timeframe: '1h', threshold: 10 },    // 1時間で±10%
    [AlertLevel.MEDIUM]: { timeframe: '4h', threshold: 10 },  // 4時間で±10%
    [AlertLevel.LOW]: { timeframe: '24h', threshold: 15 }     // 24時間で±15%
  },
  
  // 出来高異常アラート
  VOLUME_SPIKE: {
    normal_multiplier: 10,    // 平常時比10倍
    strong_multiplier: 15,    // 強いシグナル15倍
    price_change_threshold: 3 // 15分で±3%
  },
  
  // センチメントアラート  
  SENTIMENT: {
    fear_greed_extreme_fear: 20,     // 極度の恐怖
    fear_greed_extreme_greed: 80,    // 極度の強欲
    news_sentiment_threshold: 0.85   // ニュースセンチメント閾値
  },
  
  // 市場構造変化アラート
  MARKET_STRUCTURE: {
    btc_dominance_change: 2.5,       // 24時間で±2.5%
    total_market_cap_change: 8       // 24時間で±8%
  },
  
  // アラート疲れ防止
  COOLDOWN: {
    same_level_hours: 4,             // 同レベル再アラート間隔
    max_alerts_per_symbol_day: 5,    // 1銘柄1日最大アラート数
    max_global_alerts_day: 50        // 全体1日最大アラート数
  }
} as const

// CoinGecko データ収集サービス
export class CoinGeckoDataCollector {
  private static baseUrl = 'https://api.coingecko.com/api/v3'
  private static requestDelay = 6000 // 6秒間隔（無料版レート制限対策）

  // TOP300暗号通貨のリストを取得
  static async getTop300CryptocurrencyIds(): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=300&page=1&sparkline=false`
      )
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`)
      }
      
      const data = await response.json()
      const cryptoIds = data.map((crypto: any) => crypto.id)
      
      componentLogger.info(`TOP300暗号通貨IDを取得`, { count: cryptoIds.length })
      return cryptoIds
    } catch (error) {
      componentLogger.error('TOP300暗号通貨ID取得に失敗', error as Error)
      throw new AppError('Failed to fetch TOP300 cryptocurrency IDs', {
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        statusCode: 500,
        userMessage: 'TOP300暗号通貨データの取得に失敗しました'
      })
    }
  }

  // 指定された暗号通貨の価格データを取得
  static async getCryptocurrencyData(cryptoIds: string[]): Promise<any[]> {
    try {
      // CoinGecko APIは一度に250銘柄まで取得可能、300銘柄なら2回に分割
      const batchSize = 250
      const allData: any[] = []
      
      for (let i = 0; i < cryptoIds.length; i += batchSize) {
        const batch = cryptoIds.slice(i, i + batchSize)
        const ids = batch.join(',')
        
        const response = await fetch(
          `${this.baseUrl}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=${batchSize}&page=1&sparkline=false&price_change_percentage=1h,24h,7d`
        )
        
        if (!response.ok) {
          throw new Error(`CoinGecko API error: ${response.status}`)
        }
        
        const batchData = await response.json()
        allData.push(...batchData)
        
        // API制限対策: バッチ間で待機
        if (i + batchSize < cryptoIds.length) {
          await this.delay(this.requestDelay)
        }
      }
      
      componentLogger.info(`暗号通貨データを取得`, { count: allData.length })
      return allData
    } catch (error) {
      componentLogger.error('暗号通貨データ取得に失敗', error as Error)
      throw new AppError('Failed to fetch cryptocurrency data', {
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        statusCode: 500,
        userMessage: '暗号通貨データの取得に失敗しました'
      })
    }
  }

  // グローバル市場データを取得
  static async getGlobalMarketData(): Promise<{
    totalMarketCap: number
    btcDominance: number
    totalVolume: number
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/global`)
      
      if (!response.ok) {
        throw new Error(`CoinGecko Global API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      return {
        totalMarketCap: data.data.total_market_cap.usd,
        btcDominance: data.data.market_cap_percentage.btc,
        totalVolume: data.data.total_volume.usd
      }
    } catch (error) {
      componentLogger.error('グローバル市場データ取得に失敗', error as Error)
      throw error
    }
  }

  // Fear & Greed Index を取得
  static async getFearGreedIndex(): Promise<number | null> {
    try {
      const response = await fetch('https://api.alternative.me/fng/')
      
      if (!response.ok) {
        componentLogger.warn('Fear & Greed API接続失敗', { status: response.status })
        return null
      }
      
      const data = await response.json()
      return parseInt(data.data[0]?.value || '50')
    } catch (error) {
      componentLogger.warn('Fear & Greed Index取得に失敗', { error })
      return null
    }
  }

  // 待機関数
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// データベース保存サービス
export class MarketDataStorage {
  // 価格履歴データを保存
  static async savePriceHistory(cryptoData: any[]): Promise<void> {
    try {
      const priceHistoryData = cryptoData.map(crypto => ({
        symbol: crypto.id,
        name: crypto.name,
        price: crypto.current_price || 0,
        volume: crypto.total_volume || 0,
        marketCap: crypto.market_cap,
        rank: crypto.market_cap_rank,
        change1h: crypto.price_change_percentage_1h_in_currency,
        change24h: crypto.price_change_percentage_24h,
        change7d: crypto.price_change_percentage_7d_in_currency,
        timestamp: new Date()
      }))

      // SQLiteでは一括挿入を個別に処理
      for (const data of priceHistoryData) {
        try {
          await prisma.priceHistory.create({ data })
        } catch (error) {
          // 重複エラーは無視
          if (!(error as any).code === 'P2002') {
            throw error
          }
        }
      }

      componentLogger.info(`価格履歴データを保存`, { count: priceHistoryData.length })
    } catch (error) {
      componentLogger.error('価格履歴データ保存に失敗', error as Error)
      throw error
    }
  }

  // 市場指標データを保存
  static async saveMarketIndicators(
    globalData: { totalMarketCap: number; btcDominance: number; totalVolume: number },
    fearGreedIndex: number | null
  ): Promise<void> {
    try {
      await prisma.marketIndicators.create({
        data: {
          totalMarketCap: globalData.totalMarketCap,
          btcDominance: globalData.btcDominance,
          totalVolume24h: globalData.totalVolume,
          fearGreedIndex: fearGreedIndex,
          timestamp: new Date()
        }
      })

      componentLogger.info('市場指標データを保存', globalData)
    } catch (error) {
      componentLogger.error('市場指標データ保存に失敗', error as Error)
      throw error
    }
  }

  // 古いデータのクリーンアップ（30日以上古いデータを削除）
  static async cleanupOldData(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [deletedPriceHistory, deletedMarketIndicators] = await Promise.all([
        prisma.priceHistory.deleteMany({
          where: {
            timestamp: {
              lt: thirtyDaysAgo
            }
          }
        }),
        prisma.marketIndicators.deleteMany({
          where: {
            timestamp: {
              lt: thirtyDaysAgo
            }
          }
        })
      ])

      componentLogger.info('古いデータをクリーンアップ', {
        priceHistory: deletedPriceHistory.count,
        marketIndicators: deletedMarketIndicators.count
      })
    } catch (error) {
      componentLogger.error('データクリーンアップに失敗', error as Error)
    }
  }
}

// メイン市場データ収集サービス
export class MarketDataCollectionService {
  private static isRunning = false

  // データ収集を実行
  static async collectMarketData(): Promise<void> {
    if (this.isRunning) {
      componentLogger.warn('データ収集が既に実行中です')
      return
    }

    this.isRunning = true
    
    try {
      componentLogger.info('市場データ収集を開始')

      // 1. TOP300暗号通貨IDを取得
      const cryptoIds = await CoinGeckoDataCollector.getTop300CryptocurrencyIds()
      
      // 2. 暗号通貨データを取得
      const cryptoData = await CoinGeckoDataCollector.getCryptocurrencyData(cryptoIds)
      
      // 3. グローバル市場データを取得
      const globalData = await CoinGeckoDataCollector.getGlobalMarketData()
      
      // 4. Fear & Greed Indexを取得
      const fearGreedIndex = await CoinGeckoDataCollector.getFearGreedIndex()
      
      // 5. データベースに保存
      await Promise.all([
        MarketDataStorage.savePriceHistory(cryptoData),
        MarketDataStorage.saveMarketIndicators(globalData, fearGreedIndex)
      ])
      
      // 6. 古いデータのクリーンアップ（週1回実行）
      const now = new Date()
      if (now.getDay() === 0 && now.getHours() === 0) { // 日曜日の0時
        await MarketDataStorage.cleanupOldData()
      }
      
      componentLogger.info('市場データ収集が完了')
    } catch (error) {
      componentLogger.error('市場データ収集に失敗', error as Error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  // 定期実行の開始
  static startPeriodicCollection(intervalMinutes: number = 5): void {
    componentLogger.info(`定期データ収集を開始`, { intervalMinutes })
    
    // 初回実行
    this.collectMarketData().catch(error => {
      componentLogger.error('初回データ収集に失敗', error as Error)
    })
    
    // 定期実行
    setInterval(() => {
      this.collectMarketData().catch(error => {
        componentLogger.error('定期データ収集に失敗', error as Error)
      })
    }, intervalMinutes * 60 * 1000)
  }
}