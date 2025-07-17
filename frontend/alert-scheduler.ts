/**
 * 緊急マーケットアラート自動生成スケジューラー
 * 定期的に市場を監視してアラートを生成
 */

import { createLogger } from '@/lib/logger'
import { alertGenerator } from '@/lib/alert-generator'

const logger = createLogger('AlertScheduler')

export class AlertScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private readonly ALERT_INTERVAL = 10 * 60 * 1000 // 10分間隔

  constructor() {
    logger.info('AlertScheduler initialized')
  }

  /**
   * アラートスケジューラーを開始
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('AlertScheduler is already running')
      return
    }

    logger.info('Starting alert scheduler', {
      interval: this.ALERT_INTERVAL / 1000 / 60,
      unit: 'minutes'
    })

    // 即座に初回実行
    this.executeAlertGeneration()

    // 定期実行を開始
    this.intervalId = setInterval(() => {
      this.executeAlertGeneration()
    }, this.ALERT_INTERVAL)

    this.isRunning = true
  }

  /**
   * アラートスケジューラーを停止
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('AlertScheduler is not running')
      return
    }

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.isRunning = false
    logger.info('Alert scheduler stopped')
  }

  /**
   * スケジューラーの実行状態を取得
   */
  getStatus(): {
    isRunning: boolean
    interval: number
    nextExecution?: Date
  } {
    return {
      isRunning: this.isRunning,
      interval: this.ALERT_INTERVAL,
      nextExecution: this.isRunning ? 
        new Date(Date.now() + this.ALERT_INTERVAL) : 
        undefined
    }
  }

  /**
   * 手動でアラート生成を実行
   */
  async executeManually(): Promise<void> {
    logger.info('Manual alert generation triggered')
    await this.executeAlertGeneration()
  }

  /**
   * アラート生成を実行
   */
  private async executeAlertGeneration(): Promise<void> {
    try {
      logger.info('Executing alert generation cycle')
      
      const startTime = Date.now()
      const alerts = await alertGenerator.generateAlerts()
      const executionTime = Date.now() - startTime

      logger.info('Alert generation completed', {
        alertsGenerated: alerts.length,
        executionTime: `${executionTime}ms`,
        alertBreakdown: this.categorizeAlerts(alerts)
      })

      // 重要度の高いアラートがある場合は特別にログ出力
      const highPriorityAlerts = alerts.filter(alert => alert.level === 'high')
      if (highPriorityAlerts.length > 0) {
        logger.warn('High priority alerts generated', {
          count: highPriorityAlerts.length,
          alerts: highPriorityAlerts.map(alert => ({
            symbol: alert.symbol,
            title: alert.title,
            type: alert.alertType
          }))
        })
      }

    } catch (error) {
      logger.error('Alert generation failed', error as Error)
    }
  }

  /**
   * アラートを分類してカウント
   */
  private categorizeAlerts(alerts: any[]): Record<string, number> {
    const categories = {
      price_change: 0,
      volume_spike: 0,
      level_breakthrough: 0,
      market_sentiment: 0,
      high_priority: 0,
      medium_priority: 0,
      low_priority: 0
    }

    alerts.forEach(alert => {
      // タイプ別
      if (categories.hasOwnProperty(alert.alertType)) {
        categories[alert.alertType as keyof typeof categories]++
      }
      
      // 優先度別
      if (alert.level === 'high') categories.high_priority++
      else if (alert.level === 'medium') categories.medium_priority++
      else if (alert.level === 'low') categories.low_priority++
    })

    return categories
  }
}

// シングルトンインスタンス
export const alertScheduler = new AlertScheduler()