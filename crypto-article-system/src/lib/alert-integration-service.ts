import { createComponentLogger } from './simple-logger'
import { MarketDataCollectionService } from './market-alert-service'
import { AlertDetectionService } from './alert-detection-service'
import { alertWebSocketServer } from './websocket-server'
import { MarketDataAPI } from './market-data'
import { PrismaClient } from '@/generated/prisma'

const componentLogger = createComponentLogger('AlertIntegrationService')
const prisma = new PrismaClient()

// アラートシステム統合サービス
export class AlertIntegrationService {
  private static instance: AlertIntegrationService
  private isRunning = false
  private dataCollectionInterval: NodeJS.Timeout | null = null
  private alertDetectionInterval: NodeJS.Timeout | null = null
  private systemStatsInterval: NodeJS.Timeout | null = null

  private constructor() {}

  public static getInstance(): AlertIntegrationService {
    if (!AlertIntegrationService.instance) {
      AlertIntegrationService.instance = new AlertIntegrationService()
    }
    return AlertIntegrationService.instance
  }

  // システム全体を開始
  public async startSystem(): Promise<void> {
    if (this.isRunning) {
      componentLogger.warn('アラートシステムは既に実行中です')
      return
    }

    try {
      componentLogger.info('アラートシステムを開始')
      this.isRunning = true

      // 1. WebSocketサーバーを開始
      alertWebSocketServer.startServer(3002)

      // 2. 初回データ収集を実行
      await this.executeDataCollection()

      // 3. 定期データ収集を開始（5分間隔）
      this.dataCollectionInterval = setInterval(async () => {
        await this.executeDataCollection()
      }, 5 * 60 * 1000)

      // 4. 定期アラート検出を開始（1分間隔）
      this.alertDetectionInterval = setInterval(async () => {
        await this.executeAlertDetection()
      }, 1 * 60 * 1000)

      // 5. システム統計の定期送信を開始（30秒間隔）
      this.systemStatsInterval = setInterval(async () => {
        await this.broadcastSystemStats()
      }, 30 * 1000)

      componentLogger.info('アラートシステムが正常に開始されました')
    } catch (error) {
      componentLogger.error('アラートシステム開始に失敗', error as Error)
      this.isRunning = false
      throw error
    }
  }

  // データ収集を実行
  private async executeDataCollection(): Promise<void> {
    try {
      componentLogger.info('データ収集を実行')
      
      // 市場データを収集
      await MarketDataCollectionService.collectMarketData()

      // 最新の市場データを取得してブロードキャスト
      await this.broadcastMarketUpdate()

      componentLogger.info('データ収集が完了')
    } catch (error) {
      componentLogger.error('データ収集に失敗', error as Error)
      
      // エラー統計をブロードキャスト
      alertWebSocketServer.broadcastSystemStats({
        alertsToday: await this.getTodayAlertsCount(),
        dataCollectionStatus: 'error',
        lastCollection: new Date().toISOString(),
        connectedClients: alertWebSocketServer.getConnectedClientsCount()
      })
    }
  }

  // アラート検出を実行
  private async executeAlertDetection(): Promise<void> {
    try {
      componentLogger.info('アラート検出を実行')

      // 全てのアラートを検出
      const detectedAlerts = await AlertDetectionService.detectAllAlerts()

      if (detectedAlerts.length > 0) {
        // アラートをデータベースに保存
        await AlertDetectionService.saveAlerts(detectedAlerts)

        // WebSocketでブロードキャスト
        alertWebSocketServer.broadcastAlerts(detectedAlerts)

        componentLogger.info(`${detectedAlerts.length}件のアラートを検出・送信`)
      }
    } catch (error) {
      componentLogger.error('アラート検出に失敗', error as Error)
    }
  }

  // 市場データ更新をブロードキャスト
  private async broadcastMarketUpdate(): Promise<void> {
    try {
      // 最新のグローバル市場データを取得
      const globalData = await MarketDataAPI.getGlobalMarketData()
      
      // TOP8暗号通貨データを取得
      const topCoins = await MarketDataAPI.getTopCryptocurrencies(8)

      const marketUpdateData = {
        totalMarketCap: globalData.totalMarketCap,
        btcDominance: globalData.btcDominance,
        fearGreedIndex: globalData.fearGreedIndex,
        topCoins: topCoins.map(coin => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coin.current_price,
          change24h: coin.price_change_percentage_24h || 0,
          volume: coin.total_volume / 1000000000, // GB単位
          image: coin.image,
          trend: (coin.price_change_percentage_24h || 0) > 5 ? 'bullish' : 
                 (coin.price_change_percentage_24h || 0) < -3 ? 'bearish' : 'neutral'
        })),
        lastUpdate: new Date().toISOString()
      }

      alertWebSocketServer.broadcastMarketUpdate(marketUpdateData)
    } catch (error) {
      componentLogger.error('市場データブロードキャストに失敗', error as Error)
    }
  }

  // システム統計をブロードキャスト
  private async broadcastSystemStats(): Promise<void> {
    try {
      const stats = {
        alertsToday: await this.getTodayAlertsCount(),
        dataCollectionStatus: 'active' as const,
        lastCollection: await this.getLastCollectionTime(),
        connectedClients: alertWebSocketServer.getConnectedClientsCount()
      }

      alertWebSocketServer.broadcastSystemStats(stats)
    } catch (error) {
      componentLogger.error('システム統計ブロードキャストに失敗', error as Error)
    }
  }

  // 今日のアラート数を取得
  private async getTodayAlertsCount(): Promise<number> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return await prisma.alertHistory.count({
        where: {
          timestamp: {
            gte: today
          }
        }
      })
    } catch (error) {
      componentLogger.error('今日のアラート数取得に失敗', error as Error)
      return 0
    }
  }

  // 最後のデータ収集時刻を取得
  private async getLastCollectionTime(): Promise<string> {
    try {
      const latestData = await prisma.priceHistory.findFirst({
        orderBy: {
          timestamp: 'desc'
        },
        select: {
          timestamp: true
        }
      })

      return latestData?.timestamp.toISOString() || new Date().toISOString()
    } catch (error) {
      componentLogger.error('最後のデータ収集時刻取得に失敗', error as Error)
      return new Date().toISOString()
    }
  }

  // 最新のアラートを取得（API用）
  public async getLatestAlerts(limit: number = 10): Promise<any[]> {
    try {
      const alerts = await prisma.alertHistory.findMany({
        orderBy: {
          timestamp: 'desc'
        },
        take: limit,
        where: {
          isActive: true
        }
      })

      return alerts.map(alert => ({
        id: alert.id,
        symbol: alert.symbol,
        alertType: alert.alertType,
        level: alert.level,
        title: alert.title,
        description: alert.description,
        changePercent: alert.changePercent,
        timeframe: alert.timeframe,
        volume: alert.volume,
        details: alert.details,
        timestamp: alert.timestamp.toISOString()
      }))
    } catch (error) {
      componentLogger.error('最新アラート取得に失敗', error as Error)
      return []
    }
  }

  // アラートを既読にする
  public async dismissAlert(alertId: number): Promise<boolean> {
    try {
      await prisma.alertHistory.update({
        where: { id: alertId },
        data: { dismissed: true }
      })

      componentLogger.info('アラートを既読に設定', { alertId })
      return true
    } catch (error) {
      componentLogger.error('アラート既読設定に失敗', error as Error)
      return false
    }
  }

  // システムを停止
  public stopSystem(): void {
    if (!this.isRunning) {
      componentLogger.warn('アラートシステムは実行されていません')
      return
    }

    try {
      componentLogger.info('アラートシステムを停止')

      // 定期実行を停止
      if (this.dataCollectionInterval) {
        clearInterval(this.dataCollectionInterval)
        this.dataCollectionInterval = null
      }

      if (this.alertDetectionInterval) {
        clearInterval(this.alertDetectionInterval)
        this.alertDetectionInterval = null
      }

      if (this.systemStatsInterval) {
        clearInterval(this.systemStatsInterval)
        this.systemStatsInterval = null
      }

      // WebSocketサーバーを停止
      alertWebSocketServer.stopServer()

      this.isRunning = false
      componentLogger.info('アラートシステムが停止されました')
    } catch (error) {
      componentLogger.error('アラートシステム停止に失敗', error as Error)
    }
  }

  // システム状態を取得
  public getSystemStatus(): {
    isRunning: boolean
    connectedClients: number
    uptime: string
  } {
    return {
      isRunning: this.isRunning,
      connectedClients: alertWebSocketServer.getConnectedClientsCount(),
      uptime: process.uptime().toString()
    }
  }
}

// シングルトンインスタンス
export const alertIntegrationService = AlertIntegrationService.getInstance()