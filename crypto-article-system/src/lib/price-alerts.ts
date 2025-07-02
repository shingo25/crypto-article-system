import { createComponentLogger } from './simple-logger'
import { AppError, ErrorType } from './error-handler'
import { marketDataService } from './market-data'

const componentLogger = createComponentLogger('PriceAlerts')

// アラートの型定義
export interface PriceAlert {
  id: string
  userId: string
  tenantId: string
  symbol: string
  coinName: string
  condition: 'above' | 'below' | 'change_percent'
  targetPrice?: number
  changePercent?: number
  timeframe?: '1h' | '4h' | '24h'
  isActive: boolean
  isTriggered: boolean
  triggeredAt?: string
  triggeredPrice?: number
  notificationMethod: ('email' | 'push' | 'webhook')[]
  webhookUrl?: string
  message?: string
  createdAt: string
  updatedAt: string
}

export interface AlertNotification {
  alertId: string
  symbol: string
  condition: string
  currentPrice: number
  targetPrice?: number
  changePercent?: number
  message: string
  timestamp: string
}

// 価格アラート管理クラス
export class PriceAlertManager {
  private static instance: PriceAlertManager
  private alerts: Map<string, PriceAlert> = new Map()
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map()
  private checkInterval: NodeJS.Timeout | null = null
  private isMonitoring = false

  public static getInstance(): PriceAlertManager {
    if (!PriceAlertManager.instance) {
      PriceAlertManager.instance = new PriceAlertManager()
    }
    return PriceAlertManager.instance
  }

  // アラート作成
  public async createAlert(alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'updatedAt' | 'isTriggered'>): Promise<PriceAlert> {
    try {
      // バリデーション
      this.validateAlertData(alertData)

      const alert: PriceAlert = {
        ...alertData,
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isTriggered: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      this.alerts.set(alert.id, alert)
      
      // 実際の実装では、データベースに保存
      await this.saveAlert(alert)
      
      // 監視開始（まだ開始していない場合）
      if (!this.isMonitoring) {
        await this.startMonitoring()
      }

      componentLogger.info('価格アラートを作成', {
        alertId: alert.id,
        symbol: alert.symbol,
        condition: alert.condition,
        targetPrice: alert.targetPrice
      })

      return alert
    } catch (error) {
      componentLogger.error('価格アラートの作成に失敗', error as Error)
      throw error
    }
  }

  // アラート更新
  public async updateAlert(alertId: string, updates: Partial<PriceAlert>): Promise<PriceAlert> {
    const alert = this.alerts.get(alertId)
    if (!alert) {
      throw new AppError('Alert not found', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'ALERT_NOT_FOUND',
        statusCode: 404,
        userMessage: 'アラートが見つかりません'
      })
    }

    const updatedAlert: PriceAlert = {
      ...alert,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    this.alerts.set(alertId, updatedAlert)
    await this.saveAlert(updatedAlert)

    componentLogger.info('価格アラートを更新', { alertId, updates: Object.keys(updates) })
    return updatedAlert
  }

  // アラート削除
  public async deleteAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId)
    if (!alert) {
      throw new AppError('Alert not found', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'ALERT_NOT_FOUND',
        statusCode: 404
      })
    }

    this.alerts.delete(alertId)
    await this.removeAlert(alertId)

    componentLogger.info('価格アラートを削除', { alertId })
  }

  // ユーザーのアラート一覧取得
  public async getUserAlerts(userId: string, tenantId: string): Promise<PriceAlert[]> {
    const userAlerts = Array.from(this.alerts.values()).filter(
      alert => alert.userId === userId && alert.tenantId === tenantId
    )

    // 実際の実装では、データベースから取得
    return userAlerts
  }

  // アラート監視開始
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return
    }

    componentLogger.info('価格アラート監視を開始')
    this.isMonitoring = true

    // WebSocket接続開始
    await marketDataService.connect()

    // 定期チェック開始（WebSocketの補完）
    this.checkInterval = setInterval(async () => {
      await this.checkAllAlerts()
    }, 30000) // 30秒間隔

    // リアルタイム価格監視
    this.subscribeToMarketData()
  }

  // アラート監視停止
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    componentLogger.info('価格アラート監視を停止')
    this.isMonitoring = false

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    marketDataService.disconnect()
  }

  // 市場データ購読
  private subscribeToMarketData(): void {
    const symbols = new Set<string>()
    
    // アクティブなアラートのシンボルを収集
    this.alerts.forEach(alert => {
      if (alert.isActive && !alert.isTriggered) {
        symbols.add(alert.symbol.toLowerCase())
      }
    })

    // 各シンボルの価格変動を監視
    symbols.forEach(symbol => {
      marketDataService.subscribe(`price_${symbol}`, (priceData: any) => {
        this.updatePriceCache(symbol, priceData.price)
        this.checkAlertsForSymbol(symbol, priceData.price)
      })
    })
  }

  // 価格キャッシュ更新
  private updatePriceCache(symbol: string, price: number): void {
    this.priceCache.set(symbol, {
      price,
      timestamp: Date.now()
    })
  }

  // 特定シンボルのアラートチェック
  private async checkAlertsForSymbol(symbol: string, currentPrice: number): Promise<void> {
    const symbolAlerts = Array.from(this.alerts.values()).filter(
      alert => alert.symbol.toLowerCase() === symbol && alert.isActive && !alert.isTriggered
    )

    for (const alert of symbolAlerts) {
      const shouldTrigger = await this.shouldTriggerAlert(alert, currentPrice)
      if (shouldTrigger) {
        await this.triggerAlert(alert, currentPrice)
      }
    }
  }

  // 全アラートチェック
  private async checkAllAlerts(): Promise<void> {
    const activeAlerts = Array.from(this.alerts.values()).filter(
      alert => alert.isActive && !alert.isTriggered
    )

    for (const alert of activeAlerts) {
      try {
        const cached = this.priceCache.get(alert.symbol.toLowerCase())
        if (cached && Date.now() - cached.timestamp < 60000) {
          // キャッシュが1分以内なら使用
          const shouldTrigger = await this.shouldTriggerAlert(alert, cached.price)
          if (shouldTrigger) {
            await this.triggerAlert(alert, cached.price)
          }
        }
      } catch (error) {
        componentLogger.error('アラートチェック中にエラー', error as Error, { alertId: alert.id })
      }
    }
  }

  // アラート発動判定
  private async shouldTriggerAlert(alert: PriceAlert, currentPrice: number): Promise<boolean> {
    switch (alert.condition) {
      case 'above':
        return alert.targetPrice !== undefined && currentPrice >= alert.targetPrice

      case 'below':
        return alert.targetPrice !== undefined && currentPrice <= alert.targetPrice

      case 'change_percent':
        if (!alert.changePercent || !alert.timeframe) return false
        
        // 履歴価格と比較して変動率をチェック
        const historicalPrice = await this.getHistoricalPrice(alert.symbol, alert.timeframe)
        if (!historicalPrice) return false

        const changePercent = ((currentPrice - historicalPrice) / historicalPrice) * 100
        return Math.abs(changePercent) >= Math.abs(alert.changePercent)

      default:
        return false
    }
  }

  // 履歴価格取得
  private async getHistoricalPrice(symbol: string, timeframe: string): Promise<number | null> {
    try {
      const hours = timeframe === '1h' ? 1 : timeframe === '4h' ? 4 : 24
      // 実際の実装では、市場データAPIから取得
      // ここでは簡略化してキャッシュから推定
      const cached = this.priceCache.get(symbol.toLowerCase())
      return cached ? cached.price * (1 + (Math.random() - 0.5) * 0.1) : null
    } catch (error) {
      componentLogger.error('履歴価格の取得に失敗', error as Error)
      return null
    }
  }

  // アラート発動
  private async triggerAlert(alert: PriceAlert, currentPrice: number): Promise<void> {
    try {
      // アラートを発動済みに更新
      const triggeredAlert = await this.updateAlert(alert.id, {
        isTriggered: true,
        triggeredAt: new Date().toISOString(),
        triggeredPrice: currentPrice
      })

      // 通知作成
      const notification: AlertNotification = {
        alertId: alert.id,
        symbol: alert.symbol,
        condition: this.formatCondition(alert),
        currentPrice,
        targetPrice: alert.targetPrice,
        changePercent: alert.changePercent,
        message: alert.message || this.generateAlertMessage(alert, currentPrice),
        timestamp: new Date().toISOString()
      }

      // 通知送信
      await this.sendNotification(alert, notification)

      componentLogger.business('価格アラートが発動', {
        alertId: alert.id,
        symbol: alert.symbol,
        condition: alert.condition,
        currentPrice,
        targetPrice: alert.targetPrice
      })

    } catch (error) {
      componentLogger.error('アラート発動処理でエラー', error as Error, { alertId: alert.id })
    }
  }

  // 通知送信
  private async sendNotification(alert: PriceAlert, notification: AlertNotification): Promise<void> {
    const promises: Promise<void>[] = []

    if (alert.notificationMethod.includes('email')) {
      promises.push(this.sendEmailNotification(alert, notification))
    }

    if (alert.notificationMethod.includes('push')) {
      promises.push(this.sendPushNotification(alert, notification))
    }

    if (alert.notificationMethod.includes('webhook') && alert.webhookUrl) {
      promises.push(this.sendWebhookNotification(alert, notification))
    }

    await Promise.allSettled(promises)
  }

  // メール通知送信
  private async sendEmailNotification(alert: PriceAlert, notification: AlertNotification): Promise<void> {
    // 実際の実装では、メール送信サービスを使用
    componentLogger.info('メール通知を送信', {
      alertId: alert.id,
      symbol: alert.symbol,
      message: notification.message
    })
  }

  // プッシュ通知送信
  private async sendPushNotification(alert: PriceAlert, notification: AlertNotification): Promise<void> {
    // 実際の実装では、プッシュ通知サービスを使用
    componentLogger.info('プッシュ通知を送信', {
      alertId: alert.id,
      symbol: alert.symbol,
      message: notification.message
    })
  }

  // Webhook通知送信
  private async sendWebhookNotification(alert: PriceAlert, notification: AlertNotification): Promise<void> {
    if (!alert.webhookUrl) return

    try {
      const response = await fetch(alert.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification)
      })

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`)
      }

      componentLogger.info('Webhook通知を送信', {
        alertId: alert.id,
        webhookUrl: alert.webhookUrl,
        status: response.status
      })
    } catch (error) {
      componentLogger.error('Webhook通知の送信に失敗', error as Error, {
        alertId: alert.id,
        webhookUrl: alert.webhookUrl
      })
    }
  }

  // アラートメッセージ生成
  private generateAlertMessage(alert: PriceAlert, currentPrice: number): string {
    const symbol = alert.symbol.toUpperCase()
    const price = currentPrice.toLocaleString('ja-JP', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    })

    switch (alert.condition) {
      case 'above':
        return `${alert.coinName} (${symbol}) が目標価格 $${alert.targetPrice?.toLocaleString()} を上回りました。現在価格: ${price}`
      
      case 'below':
        return `${alert.coinName} (${symbol}) が目標価格 $${alert.targetPrice?.toLocaleString()} を下回りました。現在価格: ${price}`
      
      case 'change_percent':
        const direction = (alert.changePercent || 0) > 0 ? '上昇' : '下落'
        return `${alert.coinName} (${symbol}) が${alert.timeframe}で${Math.abs(alert.changePercent || 0)}%以上${direction}しました。現在価格: ${price}`
      
      default:
        return `${alert.coinName} (${symbol}) のアラートが発動しました。現在価格: ${price}`
    }
  }

  // 条件フォーマット
  private formatCondition(alert: PriceAlert): string {
    switch (alert.condition) {
      case 'above':
        return `価格が $${alert.targetPrice?.toLocaleString()} 以上`
      case 'below':
        return `価格が $${alert.targetPrice?.toLocaleString()} 以下`
      case 'change_percent':
        const direction = (alert.changePercent || 0) > 0 ? '上昇' : '下落'
        return `${alert.timeframe}で${Math.abs(alert.changePercent || 0)}%以上${direction}`
      default:
        return '不明な条件'
    }
  }

  // バリデーション
  private validateAlertData(alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'updatedAt' | 'isTriggered'>): void {
    if (!alertData.symbol || !alertData.coinName) {
      throw new AppError('Symbol and coin name are required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_REQUIRED_FIELDS',
        statusCode: 400,
        userMessage: 'シンボルとコイン名は必須です'
      })
    }

    if (alertData.condition === 'above' || alertData.condition === 'below') {
      if (!alertData.targetPrice || alertData.targetPrice <= 0) {
        throw new AppError('Valid target price is required', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'INVALID_TARGET_PRICE',
          statusCode: 400,
          userMessage: '有効な目標価格が必要です'
        })
      }
    }

    if (alertData.condition === 'change_percent') {
      if (!alertData.changePercent || !alertData.timeframe) {
        throw new AppError('Change percent and timeframe are required', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'MISSING_CHANGE_PARAMS',
          statusCode: 400,
          userMessage: '変動率と時間枠が必要です'
        })
      }
    }

    if (!alertData.notificationMethod || alertData.notificationMethod.length === 0) {
      throw new AppError('At least one notification method is required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_NOTIFICATION_METHOD',
        statusCode: 400,
        userMessage: '少なくとも1つの通知方法が必要です'
      })
    }
  }

  // データ永続化メソッド（実際の実装ではデータベースを使用）
  private async saveAlert(alert: PriceAlert): Promise<void> {
    // 実際の実装では、データベースに保存
    componentLogger.debug('アラートを保存', { alertId: alert.id })
  }

  private async removeAlert(alertId: string): Promise<void> {
    // 実際の実装では、データベースから削除
    componentLogger.debug('アラートを削除', { alertId })
  }
}

// シングルトンインスタンス
export const priceAlertManager = PriceAlertManager.getInstance()