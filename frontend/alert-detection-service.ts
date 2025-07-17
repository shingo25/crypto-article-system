import { createComponentLogger } from './simple-logger'
import { PrismaClient } from '@/generated/prisma'
import { AlertLevel, AlertType, ALERT_CONDITIONS } from './market-alert-service'

const componentLogger = createComponentLogger('AlertDetectionService')
const prisma = new PrismaClient()

// アラート検出結果の型定義
export interface DetectedAlert {
  symbol: string
  alertType: AlertType
  level: AlertLevel
  title: string
  description: string
  changePercent?: number
  timeframe?: string
  volume?: number
  details: Record<string, any>
  timestamp: Date
}

// 価格変動アラート検出サービス
export class PriceChangeAlertDetector {
  // 指定時間内の価格変動をチェック
  static async detectPriceChangeAlerts(): Promise<DetectedAlert[]> {
    const alerts: DetectedAlert[] = []
    
    try {
      // 現在時刻から各時間枠での変動をチェック
      const timeframes = [
        { period: '1h', hours: 1, levels: [AlertLevel.HIGH] },
        { period: '4h', hours: 4, levels: [AlertLevel.MEDIUM] },
        { period: '24h', hours: 24, levels: [AlertLevel.LOW] }
      ]

      for (const timeframe of timeframes) {
        const timeframeAlerts = await this.checkTimeframePriceChanges(
          timeframe.period as '1h' | '4h' | '24h',
          timeframe.hours,
          timeframe.levels
        )
        alerts.push(...timeframeAlerts)
      }

      componentLogger.info(`価格変動アラートを検出`, { count: alerts.length })
      return alerts
    } catch (error) {
      componentLogger.error('価格変動アラート検出に失敗', error as Error)
      return []
    }
  }

  // 指定時間枠での価格変動をチェック
  private static async checkTimeframePriceChanges(
    timeframe: '1h' | '4h' | '24h',
    hours: number,
    levels: AlertLevel[]
  ): Promise<DetectedAlert[]> {
    const alerts: DetectedAlert[] = []
    const now = new Date()
    const pastTime = new Date(now.getTime() - hours * 60 * 60 * 1000)

    try {
      // 最新の価格データを取得
      const latestPrices = await prisma.priceHistory.findMany({
        where: {
          timestamp: {
            gte: new Date(now.getTime() - 10 * 60 * 1000) // 最新10分以内
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        distinct: ['symbol']
      })

      // 指定時間前の価格データを取得
      for (const latestPrice of latestPrices) {
        const pastPrice = await prisma.priceHistory.findFirst({
          where: {
            symbol: latestPrice.symbol,
            timestamp: {
              lte: pastTime,
              gte: new Date(pastTime.getTime() - 30 * 60 * 1000) // 30分の幅を持たせる
            }
          },
          orderBy: {
            timestamp: 'desc'
          }
        })

        if (!pastPrice || pastPrice.price === 0) continue

        // 価格変動率を計算
        const changePercent = ((latestPrice.price - pastPrice.price) / pastPrice.price) * 100
        const absChangePercent = Math.abs(changePercent)

        // 各レベルの閾値をチェック
        for (const level of levels) {
          const threshold = ALERT_CONDITIONS.PRICE_CHANGE[level].threshold
          
          if (absChangePercent >= threshold) {
            // クールダウンチェック
            const canAlert = await this.checkCooldown(latestPrice.symbol, level)
            if (!canAlert) continue

            // 1日のアラート上限チェック
            const dailyLimitOk = await this.checkDailyLimit(latestPrice.symbol)
            if (!dailyLimitOk) continue

            alerts.push({
              symbol: latestPrice.symbol,
              alertType: AlertType.PRICE_CHANGE,
              level,
              title: `${latestPrice.name}が${timeframe}で${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%変動`,
              description: this.generatePriceChangeDescription(
                latestPrice.name,
                changePercent,
                timeframe,
                latestPrice.price,
                pastPrice.price
              ),
              changePercent,
              timeframe,
              details: {
                currentPrice: latestPrice.price,
                pastPrice: pastPrice.price,
                marketCap: latestPrice.marketCap,
                volume: latestPrice.volume,
                rank: latestPrice.rank
              },
              timestamp: now
            })
          }
        }
      }

      return alerts
    } catch (error) {
      componentLogger.error(`${timeframe}価格変動チェックに失敗`, error as Error)
      return []
    }
  }

  // クールダウンチェック
  private static async checkCooldown(symbol: string, level: AlertLevel): Promise<boolean> {
    const cooldownHours = ALERT_CONDITIONS.COOLDOWN.same_level_hours
    const cooldownTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000)

    const recentAlert = await prisma.alertHistory.findFirst({
      where: {
        symbol,
        level,
        alertType: AlertType.PRICE_CHANGE,
        timestamp: {
          gte: cooldownTime
        }
      }
    })

    return !recentAlert
  }

  // 1日のアラート上限チェック
  private static async checkDailyLimit(symbol: string): Promise<boolean> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayAlerts = await prisma.alertHistory.count({
      where: {
        symbol,
        timestamp: {
          gte: today
        }
      }
    })

    return todayAlerts < ALERT_CONDITIONS.COOLDOWN.max_alerts_per_symbol_day
  }

  // 価格変動の説明文を生成
  private static generatePriceChangeDescription(
    name: string,
    changePercent: number,
    timeframe: string,
    currentPrice: number,
    pastPrice: number
  ): string {
    const direction = changePercent > 0 ? '急騰' : '急落'
    const urgency = Math.abs(changePercent) > 15 ? '大幅な' : ''
    
    return `${name}が${timeframe}で${urgency}${direction}しています。` +
           `価格は$${pastPrice.toFixed(4)}から$${currentPrice.toFixed(4)}へ` +
           `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%変動しました。`
  }
}

// 出来高異常アラート検出サービス  
export class VolumeAlertDetector {
  static async detectVolumeSpikeAlerts(): Promise<DetectedAlert[]> {
    const alerts: DetectedAlert[] = []
    
    try {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // 最新の出来高データを取得
      const latestVolumes = await prisma.priceHistory.findMany({
        where: {
          timestamp: {
            gte: oneHourAgo
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        distinct: ['symbol']
      })

      for (const latest of latestVolumes) {
        // 過去24時間の平均出来高を計算
        const averageVolume = await this.calculateAverageVolume(latest.symbol, oneDayAgo)
        
        if (averageVolume === 0) continue

        const volumeMultiplier = latest.volume / averageVolume
        
        // 通常の出来高異常をチェック
        if (volumeMultiplier >= ALERT_CONDITIONS.VOLUME_SPIKE.normal_multiplier) {
          alerts.push({
            symbol: latest.symbol,
            alertType: AlertType.VOLUME_SPIKE,
            level: AlertLevel.MEDIUM,
            title: `${latest.name}で出来高が${volumeMultiplier.toFixed(1)}倍に急増`,
            description: `${latest.name}の出来高が平常時の${volumeMultiplier.toFixed(1)}倍に急増しています。大きな資金の動きが発生している可能性があります。`,
            volume: latest.volume,
            details: {
              currentVolume: latest.volume,
              averageVolume,
              multiplier: volumeMultiplier,
              price: latest.price
            },
            timestamp: now
          })
        }

        // 強いシグナル（価格変動+出来高急増）をチェック
        await this.checkStrongVolumeSignal(latest, averageVolume, alerts, now)
      }

      componentLogger.info(`出来高異常アラートを検出`, { count: alerts.length })
      return alerts
    } catch (error) {
      componentLogger.error('出来高異常アラート検出に失敗', error as Error)
      return []
    }
  }

  // 過去24時間の平均出来高を計算
  private static async calculateAverageVolume(symbol: string, oneDayAgo: Date): Promise<number> {
    const volumes = await prisma.priceHistory.findMany({
      where: {
        symbol,
        timestamp: {
          gte: oneDayAgo
        }
      },
      select: {
        volume: true
      }
    })

    if (volumes.length === 0) return 0

    const totalVolume = volumes.reduce((sum, v) => sum + v.volume, 0)
    return totalVolume / volumes.length
  }

  // 強いシグナル（価格変動+出来高）をチェック
  private static async checkStrongVolumeSignal(
    latest: any,
    averageVolume: number,
    alerts: DetectedAlert[],
    now: Date
  ): Promise<void> {
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
    
    const pastPrice = await prisma.priceHistory.findFirst({
      where: {
        symbol: latest.symbol,
        timestamp: {
          lte: fifteenMinutesAgo,
          gte: new Date(fifteenMinutesAgo.getTime() - 10 * 60 * 1000)
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    if (!pastPrice || pastPrice.price === 0) return

    const priceChangePercent = Math.abs((latest.price - pastPrice.price) / pastPrice.price * 100)
    const volumeMultiplier = latest.volume / averageVolume

    if (
      priceChangePercent >= ALERT_CONDITIONS.VOLUME_SPIKE.price_change_threshold &&
      volumeMultiplier >= ALERT_CONDITIONS.VOLUME_SPIKE.strong_multiplier
    ) {
      alerts.push({
        symbol: latest.symbol,
        alertType: AlertType.VOLUME_SPIKE,
        level: AlertLevel.HIGH,
        title: `${latest.name}で強いシグナル検出`,
        description: `${latest.name}で15分間に${priceChangePercent.toFixed(1)}%の価格変動と${volumeMultiplier.toFixed(1)}倍の出来高急増を検出。強い方向性を持つ動きの可能性があります。`,
        changePercent: (latest.price - pastPrice.price) / pastPrice.price * 100,
        timeframe: '15m',
        volume: latest.volume,
        details: {
          priceChange: priceChangePercent,
          volumeMultiplier,
          currentPrice: latest.price,
          pastPrice: pastPrice.price
        },
        timestamp: now
      })
    }
  }
}

// センチメントアラート検出サービス
export class SentimentAlertDetector {
  static async detectSentimentAlerts(): Promise<DetectedAlert[]> {
    const alerts: DetectedAlert[] = []
    
    try {
      // 最新のFear & Greed Indexをチェック
      const latestIndicator = await prisma.marketIndicators.findFirst({
        orderBy: {
          timestamp: 'desc'
        }
      })

      if (latestIndicator?.fearGreedIndex !== null && latestIndicator?.fearGreedIndex !== undefined) {
        const fearGreedIndex = latestIndicator.fearGreedIndex

        // 極度の恐怖をチェック
        if (fearGreedIndex <= ALERT_CONDITIONS.SENTIMENT.fear_greed_extreme_fear) {
          alerts.push({
            symbol: 'MARKET',
            alertType: AlertType.SENTIMENT,
            level: AlertLevel.HIGH,
            title: `市場が極度の恐怖状態 (Fear & Greed: ${fearGreedIndex})`,
            description: `Fear & Greed Indexが${fearGreedIndex}となり、極度の恐怖状態です。過度な売り圧力により買い場となる可能性があります。`,
            details: {
              fearGreedIndex,
              sentiment: 'extreme_fear',
              marketCondition: 'potential_buying_opportunity'
            },
            timestamp: new Date()
          })
        }

        // 極度の強欲をチェック
        if (fearGreedIndex >= ALERT_CONDITIONS.SENTIMENT.fear_greed_extreme_greed) {
          alerts.push({
            symbol: 'MARKET',
            alertType: AlertType.SENTIMENT,
            level: AlertLevel.HIGH,
            title: `市場が極度の強欲状態 (Fear & Greed: ${fearGreedIndex})`,
            description: `Fear & Greed Indexが${fearGreedIndex}となり、極度の強欲状態です。過度な買い圧力により調整局面となる可能性があります。`,
            details: {
              fearGreedIndex,
              sentiment: 'extreme_greed',
              marketCondition: 'potential_selling_opportunity'
            },
            timestamp: new Date()
          })
        }
      }

      componentLogger.info(`センチメントアラートを検出`, { count: alerts.length })
      return alerts
    } catch (error) {
      componentLogger.error('センチメントアラート検出に失敗', error as Error)
      return []
    }
  }
}

// 市場構造変化アラート検出サービス
export class MarketStructureAlertDetector {
  static async detectMarketStructureAlerts(): Promise<DetectedAlert[]> {
    const alerts: DetectedAlert[] = []
    
    try {
      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // 最新と24時間前の市場指標を取得
      const [latest, past] = await Promise.all([
        prisma.marketIndicators.findFirst({
          orderBy: { timestamp: 'desc' }
        }),
        prisma.marketIndicators.findFirst({
          where: {
            timestamp: {
              lte: twentyFourHoursAgo,
              gte: new Date(twentyFourHoursAgo.getTime() - 2 * 60 * 60 * 1000) // 2時間の幅
            }
          },
          orderBy: { timestamp: 'desc' }
        })
      ])

      if (!latest || !past) return alerts

      // BTC Dominanceの変化をチェック
      const btcDominanceChange = Math.abs(latest.btcDominance - past.btcDominance)
      if (btcDominanceChange >= ALERT_CONDITIONS.MARKET_STRUCTURE.btc_dominance_change) {
        const direction = latest.btcDominance > past.btcDominance ? '上昇' : '下降'
        const trend = latest.btcDominance > past.btcDominance ? 'アルトコインからBTCへの資金流入' : 'BTCからアルトコインへの資金流出'
        
        alerts.push({
          symbol: 'BTC',
          alertType: AlertType.MARKET_STRUCTURE,
          level: AlertLevel.MEDIUM,
          title: `BTC Dominanceが24時間で${btcDominanceChange.toFixed(1)}%${direction}`,
          description: `BTC Dominanceが${past.btcDominance.toFixed(1)}%から${latest.btcDominance.toFixed(1)}%へ変化。${trend}の兆候が見られます。`,
          changePercent: latest.btcDominance - past.btcDominance,
          timeframe: '24h',
          details: {
            currentDominance: latest.btcDominance,
            pastDominance: past.btcDominance,
            change: btcDominanceChange,
            trend
          },
          timestamp: now
        })
      }

      // Total Market Capの変化をチェック
      const marketCapChangePercent = Math.abs((latest.totalMarketCap - past.totalMarketCap) / past.totalMarketCap * 100)
      if (marketCapChangePercent >= ALERT_CONDITIONS.MARKET_STRUCTURE.total_market_cap_change) {
        const direction = latest.totalMarketCap > past.totalMarketCap ? '流入' : '流出'
        
        alerts.push({
          symbol: 'MARKET',
          alertType: AlertType.MARKET_STRUCTURE,
          level: AlertLevel.HIGH,
          title: `市場全体で${marketCapChangePercent.toFixed(1)}%の資金${direction}`,
          description: `Total Market Capが24時間で${marketCapChangePercent.toFixed(1)}%変動。市場全体での大規模な資金移動が発生しています。`,
          changePercent: (latest.totalMarketCap - past.totalMarketCap) / past.totalMarketCap * 100,
          timeframe: '24h',
          details: {
            currentMarketCap: latest.totalMarketCap,
            pastMarketCap: past.totalMarketCap,
            changeAmount: latest.totalMarketCap - past.totalMarketCap,
            direction
          },
          timestamp: now
        })
      }

      componentLogger.info(`市場構造変化アラートを検出`, { count: alerts.length })
      return alerts
    } catch (error) {
      componentLogger.error('市場構造変化アラート検出に失敗', error as Error)
      return []
    }
  }
}

// メインアラート検出サービス
export class AlertDetectionService {
  // すべてのアラートを検出
  static async detectAllAlerts(): Promise<DetectedAlert[]> {
    try {
      componentLogger.info('アラート検出を開始')

      const [priceAlerts, volumeAlerts, sentimentAlerts, structureAlerts] = await Promise.all([
        PriceChangeAlertDetector.detectPriceChangeAlerts(),
        VolumeAlertDetector.detectVolumeSpikeAlerts(),
        SentimentAlertDetector.detectSentimentAlerts(),
        MarketStructureAlertDetector.detectMarketStructureAlerts()
      ])

      const allAlerts = [
        ...priceAlerts,
        ...volumeAlerts,
        ...sentimentAlerts,
        ...structureAlerts
      ]

      // グローバル1日制限をチェック
      const validAlerts = await this.applyGlobalDailyLimit(allAlerts)

      componentLogger.info('アラート検出が完了', { 
        total: allAlerts.length,
        afterLimit: validAlerts.length 
      })

      return validAlerts
    } catch (error) {
      componentLogger.error('アラート検出に失敗', error as Error)
      return []
    }
  }

  // グローバル1日制限を適用
  private static async applyGlobalDailyLimit(alerts: DetectedAlert[]): Promise<DetectedAlert[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayAlertCount = await prisma.alertHistory.count({
      where: {
        timestamp: {
          gte: today
        }
      }
    })

    const maxGlobalAlerts = ALERT_CONDITIONS.COOLDOWN.max_global_alerts_day
    const remainingSlots = maxGlobalAlerts - todayAlertCount

    if (remainingSlots <= 0) {
      componentLogger.warn('グローバル1日アラート制限に到達')
      return []
    }

    // 優先度でソート（HIGH > MEDIUM > LOW）
    const sortedAlerts = alerts.sort((a, b) => {
      const levelPriority = { [AlertLevel.HIGH]: 3, [AlertLevel.MEDIUM]: 2, [AlertLevel.LOW]: 1 }
      return levelPriority[b.level] - levelPriority[a.level]
    })

    return sortedAlerts.slice(0, remainingSlots)
  }

  // アラートをデータベースに保存
  static async saveAlerts(alerts: DetectedAlert[]): Promise<void> {
    if (alerts.length === 0) return

    try {
      const alertData = alerts.map(alert => ({
        symbol: alert.symbol,
        alertType: alert.alertType,
        level: alert.level,
        title: alert.title,
        description: alert.description,
        changePercent: alert.changePercent,
        timeframe: alert.timeframe,
        volume: alert.volume,
        details: alert.details,
        timestamp: alert.timestamp
      }))

      await prisma.alertHistory.createMany({
        data: alertData
      })

      componentLogger.info(`${alerts.length}件のアラートを保存`)
    } catch (error) {
      componentLogger.error('アラート保存に失敗', error as Error)
      throw error
    }
  }
}