/**
 * 緊急マーケットアラート自動生成システム
 * 価格データと市場指標を分析してアラートを生成
 */

import { PrismaClient } from '@/generated/prisma'
import { createLogger } from '@/lib/logger'

const prisma = new PrismaClient()
const logger = createLogger('AlertGenerator')

interface AlertCondition {
  symbol: string
  name: string
  currentPrice: number
  change24h: number
  volume: number
  previousPrice?: number
  marketCap?: number
}

interface GeneratedAlert {
  symbol: string
  alertType: string
  level: 'high' | 'medium' | 'low'
  title: string
  description: string
  changePercent?: number
  timeframe: string
  volume: number
  details: any
}

export class AlertGenerator {
  private readonly ALERT_THRESHOLDS = {
    // 価格変動閾値
    HIGH_PRICE_CHANGE: 8,      // 8%以上の変動で高レベルアラート
    MEDIUM_PRICE_CHANGE: 5,    // 5%以上の変動で中レベルアラート
    LOW_PRICE_CHANGE: 3,       // 3%以上の変動で低レベルアラート
    
    // 出来高急増閾値
    HIGH_VOLUME_SPIKE: 4,      // 平均の4倍以上
    MEDIUM_VOLUME_SPIKE: 2.5,  // 平均の2.5倍以上
    
    // 価格レベル
    BTC_PSYCHOLOGICAL_LEVELS: [100000, 110000, 120000, 150000],
    ETH_PSYCHOLOGICAL_LEVELS: [2500, 3000, 3500, 4000],
    
    // 市場指標
    FEAR_GREED_EXTREME: 80,    // 恐怖・欲指数の極端な値
    BTC_DOMINANCE_CHANGE: 2    // BTC支配率の大幅変動
  }

  /**
   * 現在の市場状況を分析してアラートを生成
   */
  async generateAlerts(): Promise<GeneratedAlert[]> {
    try {
      logger.info('市場アラート分析を開始')
      
      const alerts: GeneratedAlert[] = []
      
      // 最新の価格データを取得
      const latestPrices = await this.getLatestPrices()
      
      // 各通貨の分析
      for (const priceData of latestPrices) {
        const symbolAlerts = await this.analyzeCurrency(priceData)
        alerts.push(...symbolAlerts)
      }
      
      // 市場全体の分析
      const marketAlerts = await this.analyzeMarketConditions()
      alerts.push(...marketAlerts)
      
      // 重複アラートの除去と優先順位付け
      const filteredAlerts = this.filterAndPrioritizeAlerts(alerts)
      
      // データベースに保存
      for (const alert of filteredAlerts) {
        await this.saveAlert(alert)
      }
      
      logger.info('市場アラート分析完了', { 
        alertsGenerated: filteredAlerts.length,
        breakdown: this.getAlertBreakdown(filteredAlerts)
      })
      
      return filteredAlerts
      
    } catch (error) {
      logger.error('アラート生成エラー', error as Error)
      return []
    }
  }

  /**
   * 最新の価格データを取得
   */
  private async getLatestPrices(): Promise<AlertCondition[]> {
    const latestPrices = await prisma.priceHistory.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50, // 上位50通貨
      distinct: ['symbol']
    })

    return latestPrices.map(price => ({
      symbol: price.symbol,
      name: price.name,
      currentPrice: price.price,
      change24h: price.change24h || 0,
      volume: price.volume,
      marketCap: price.marketCap
    }))
  }

  /**
   * 個別通貨の分析
   */
  private async analyzeCurrency(data: AlertCondition): Promise<GeneratedAlert[]> {
    const alerts: GeneratedAlert[] = []
    
    // 価格変動アラート
    const priceAlert = this.checkPriceChange(data)
    if (priceAlert) alerts.push(priceAlert)
    
    // 心理的価格レベル突破アラート
    const levelAlert = this.checkPsychologicalLevels(data)
    if (levelAlert) alerts.push(levelAlert)
    
    // 出来高異常アラート
    const volumeAlert = await this.checkVolumeAnomaly(data)
    if (volumeAlert) alerts.push(volumeAlert)
    
    return alerts
  }

  /**
   * 価格変動チェック
   */
  private checkPriceChange(data: AlertCondition): GeneratedAlert | null {
    const absChange = Math.abs(data.change24h)
    const direction = data.change24h > 0 ? '上昇' : '下降'
    const emoji = data.change24h > 0 ? '🚀' : '📉'
    
    let level: 'high' | 'medium' | 'low' | null = null
    
    if (absChange >= this.ALERT_THRESHOLDS.HIGH_PRICE_CHANGE) {
      level = 'high'
    } else if (absChange >= this.ALERT_THRESHOLDS.MEDIUM_PRICE_CHANGE) {
      level = 'medium'
    } else if (absChange >= this.ALERT_THRESHOLDS.LOW_PRICE_CHANGE) {
      level = 'low'
    }
    
    if (!level) return null
    
    return {
      symbol: data.symbol,
      alertType: 'price_change',
      level,
      title: `${data.name} ${emoji} 急激な価格${direction}`,
      description: `${data.name}が24時間で${absChange.toFixed(1)}%${direction}し、$${data.currentPrice.toLocaleString()}に到達しました。`,
      changePercent: data.change24h,
      timeframe: '24h',
      volume: data.volume,
      details: {
        trigger: 'price_change',
        threshold: level === 'high' ? this.ALERT_THRESHOLDS.HIGH_PRICE_CHANGE : 
                  level === 'medium' ? this.ALERT_THRESHOLDS.MEDIUM_PRICE_CHANGE :
                  this.ALERT_THRESHOLDS.LOW_PRICE_CHANGE,
        current_price: data.currentPrice,
        direction: data.change24h > 0 ? 'up' : 'down'
      }
    }
  }

  /**
   * 心理的価格レベル突破チェック
   */
  private checkPsychologicalLevels(data: AlertCondition): GeneratedAlert | null {
    let levels: number[] = []
    
    if (data.symbol === 'bitcoin') {
      levels = this.ALERT_THRESHOLDS.BTC_PSYCHOLOGICAL_LEVELS
    } else if (data.symbol === 'ethereum') {
      levels = this.ALERT_THRESHOLDS.ETH_PSYCHOLOGICAL_LEVELS
    }
    
    if (levels.length === 0) return null
    
    // 最近突破した可能性のあるレベルをチェック
    const recentBreakthrough = levels.find(level => 
      Math.abs(data.currentPrice - level) < (level * 0.02) && // 2%以内
      data.change24h > 2 // 上昇トレンド
    )
    
    if (!recentBreakthrough) return null
    
    return {
      symbol: data.symbol,
      alertType: 'level_breakthrough',
      level: 'medium',
      title: `${data.name} 重要価格レベル突破`,
      description: `${data.name}が心理的重要レベルの$${recentBreakthrough.toLocaleString()}を突破しました。`,
      changePercent: data.change24h,
      timeframe: '24h',
      volume: data.volume,
      details: {
        trigger: 'psychological_level',
        level_broken: recentBreakthrough,
        current_price: data.currentPrice,
        significance: 'psychological_resistance'
      }
    }
  }

  /**
   * 出来高異常チェック
   */
  private async checkVolumeAnomaly(data: AlertCondition): Promise<GeneratedAlert | null> {
    // 過去7日間の平均出来高を取得
    const historicalVolumes = await prisma.priceHistory.findMany({
      where: {
        symbol: data.symbol,
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      select: { volume: true }
    })
    
    if (historicalVolumes.length < 5) return null
    
    const avgVolume = historicalVolumes.reduce((sum, h) => sum + h.volume, 0) / historicalVolumes.length
    const volumeRatio = data.volume / avgVolume
    
    let level: 'high' | 'medium' | null = null
    
    if (volumeRatio >= this.ALERT_THRESHOLDS.HIGH_VOLUME_SPIKE) {
      level = 'high'
    } else if (volumeRatio >= this.ALERT_THRESHOLDS.MEDIUM_VOLUME_SPIKE) {
      level = 'medium'
    }
    
    if (!level) return null
    
    return {
      symbol: data.symbol,
      alertType: 'volume_spike',
      level,
      title: `${data.name} 異常な出来高急増`,
      description: `${data.name}の取引量が平均の${volumeRatio.toFixed(1)}倍に急増。大口取引の可能性があります。`,
      changePercent: data.change24h,
      timeframe: '24h',
      volume: data.volume,
      details: {
        trigger: 'volume_spike',
        volume_ratio: volumeRatio,
        average_volume: avgVolume,
        current_volume: data.volume
      }
    }
  }

  /**
   * 市場全体の状況分析
   */
  private async analyzeMarketConditions(): Promise<GeneratedAlert[]> {
    const alerts: GeneratedAlert[] = []
    
    // 最新の市場指標を取得
    const latestIndicator = await prisma.marketIndicators.findFirst({
      orderBy: { timestamp: 'desc' }
    })
    
    if (!latestIndicator) return alerts
    
    // 恐怖・欲指数の極端な値チェック
    if (latestIndicator.fearGreedIndex) {
      if (latestIndicator.fearGreedIndex >= this.ALERT_THRESHOLDS.FEAR_GREED_EXTREME) {
        alerts.push({
          symbol: 'market',
          alertType: 'market_sentiment',
          level: 'medium',
          title: '市場センチメント：極度の欲',
          description: `恐怖・欲指数が${latestIndicator.fearGreedIndex}に達し、市場が過熱状態にあります。`,
          timeframe: 'current',
          volume: 0,
          details: {
            trigger: 'fear_greed_extreme',
            fear_greed_index: latestIndicator.fearGreedIndex,
            sentiment: 'extreme_greed'
          }
        })
      } else if (latestIndicator.fearGreedIndex <= (100 - this.ALERT_THRESHOLDS.FEAR_GREED_EXTREME)) {
        alerts.push({
          symbol: 'market',
          alertType: 'market_sentiment',
          level: 'medium',
          title: '市場センチメント：極度の恐怖',
          description: `恐怖・欲指数が${latestIndicator.fearGreedIndex}まで低下し、市場が悲観的になっています。`,
          timeframe: 'current',
          volume: 0,
          details: {
            trigger: 'fear_greed_extreme',
            fear_greed_index: latestIndicator.fearGreedIndex,
            sentiment: 'extreme_fear'
          }
        })
      }
    }
    
    return alerts
  }

  /**
   * アラートのフィルタリングと優先順位付け
   */
  private filterAndPrioritizeAlerts(alerts: GeneratedAlert[]): GeneratedAlert[] {
    // 重複除去（同じシンボル・タイプは1つまで）
    const uniqueAlerts = alerts.filter((alert, index, arr) => 
      arr.findIndex(a => a.symbol === alert.symbol && a.alertType === alert.alertType) === index
    )
    
    // 優先順位でソート（high > medium > low）
    return uniqueAlerts.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 }
      return priorities[b.level] - priorities[a.level]
    })
  }

  /**
   * アラートをデータベースに保存
   */
  private async saveAlert(alert: GeneratedAlert): Promise<void> {
    // 同じアラートが最近生成されていないかチェック（重複防止）
    const recentAlert = await prisma.alertHistory.findFirst({
      where: {
        symbol: alert.symbol,
        alertType: alert.alertType,
        timestamp: {
          gte: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4時間以内
        }
      }
    })
    
    if (recentAlert) {
      logger.debug('重複アラートをスキップ', { 
        symbol: alert.symbol, 
        alertType: alert.alertType 
      })
      return
    }
    
    await prisma.alertHistory.create({
      data: {
        symbol: alert.symbol,
        alertType: alert.alertType,
        level: alert.level,
        title: alert.title,
        description: alert.description,
        changePercent: alert.changePercent,
        timeframe: alert.timeframe,
        volume: alert.volume,
        details: alert.details,
        timestamp: new Date(),
        isActive: true,
        dismissed: false
      }
    })
    
    logger.info('アラート生成', { 
      symbol: alert.symbol, 
      level: alert.level, 
      title: alert.title 
    })
  }

  /**
   * アラートの内訳を取得
   */
  private getAlertBreakdown(alerts: GeneratedAlert[]): Record<string, number> {
    return alerts.reduce((acc, alert) => {
      acc[alert.level] = (acc[alert.level] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
}

// シングルトンインスタンス
export const alertGenerator = new AlertGenerator()