/**
 * RSS自動収集スケジューラー
 * 定期的に全RSSソースからニュースを収集する
 */

import { RSSParserService } from '@/lib/rss-parser-service'
import { PrismaClient } from '@/generated/prisma'
import { createLogger } from '@/lib/logger'
import { alertScheduler } from '@/lib/alert-scheduler'

const logger = createLogger('RSSScheduler')
const prisma = new PrismaClient()

export class RSSScheduler {
  private rssService: RSSParserService
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private collectionInProgress = false
  
  // 設定
  private readonly COLLECTION_INTERVAL = 5 * 60 * 1000 // 5分間隔（ミリ秒）
  private readonly MAX_CONCURRENT_COLLECTIONS = 3 // 同時収集数制限
  
  // 統計情報
  private stats = {
    totalCollections: 0,
    successfulCollections: 0,
    failedCollections: 0,
    lastCollectionTime: null as Date | null,
    nextCollectionTime: null as Date | null,
    itemsCollected: 0
  }

  constructor() {
    this.rssService = new RSSParserService()
  }

  /**
   * スケジューラーを開始
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('RSS スケジューラーは既に実行中です')
      return
    }

    logger.info('RSS 自動収集スケジューラーを開始', {
      interval: `${this.COLLECTION_INTERVAL / 1000}秒`,
      maxConcurrent: this.MAX_CONCURRENT_COLLECTIONS
    })

    // 即座に1回実行
    this.performCollection()

    // 定期実行を設定
    this.intervalId = setInterval(() => {
      this.performCollection()
    }, this.COLLECTION_INTERVAL)

    this.isRunning = true
    this.updateNextCollectionTime()

    // アラートスケジューラーも同時に開始
    logger.info('アラートスケジューラーも同時に開始')
    alertScheduler.start()
  }

  /**
   * スケジューラーを停止
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('RSS スケジューラーは既に停止しています')
      return
    }

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.isRunning = false
    this.stats.nextCollectionTime = null

    // アラートスケジューラーも同時に停止
    logger.info('アラートスケジューラーも同時に停止')
    alertScheduler.stop()

    logger.info('RSS 自動収集スケジューラーを停止')
  }

  /**
   * 収集を手動実行
   */
  async performCollection(): Promise<void> {
    if (this.collectionInProgress) {
      logger.info('収集が既に進行中のため、今回の実行をスキップ')
      return
    }

    this.collectionInProgress = true
    this.stats.totalCollections++
    this.stats.lastCollectionTime = new Date()
    this.updateNextCollectionTime()

    logger.info('RSS 自動収集を開始')

    try {
      // 有効なRSSソースを取得
      const sources = await prisma.rSSSource.findMany({
        where: { enabled: true },
        orderBy: { lastCollected: 'asc' } // 最も古いものから優先
      })

      if (sources.length === 0) {
        logger.info('有効なRSSソースが見つかりません')
        return
      }

      logger.info('RSS ソース収集開始', { sourceCount: sources.length })

      // 並列処理で収集（制限付き）
      const results = await this.collectFromSourcesConcurrently(sources)

      // 統計を更新
      const successCount = results.filter(r => r.success).length
      const totalItems = results.reduce((sum, r) => sum + (r.itemsCollected || 0), 0)

      this.stats.successfulCollections += successCount
      this.stats.failedCollections += (results.length - successCount)
      this.stats.itemsCollected += totalItems

      logger.info('RSS 自動収集完了', {
        sourcesProcessed: sources.length,
        successfulSources: successCount,
        failedSources: results.length - successCount,
        totalItemsCollected: totalItems,
        totalStats: this.stats
      })

    } catch (error) {
      logger.error('RSS 自動収集中にエラーが発生', error as Error)
      this.stats.failedCollections++
    } finally {
      this.collectionInProgress = false
    }
  }

  /**
   * 複数ソースから並列収集（制限付き）
   */
  private async collectFromSourcesConcurrently(sources: any[]): Promise<CollectionResult[]> {
    const results: CollectionResult[] = []
    
    // バッチ処理で並列度を制御
    for (let i = 0; i < sources.length; i += this.MAX_CONCURRENT_COLLECTIONS) {
      const batch = sources.slice(i, i + this.MAX_CONCURRENT_COLLECTIONS)
      
      const batchPromises = batch.map(source => this.collectFromSingleSource(source))
      const batchResults = await Promise.allSettled(batchPromises)
      
      // 結果を処理
      batchResults.forEach((result, index) => {
        const source = batch[index]
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          logger.error('ソース収集失敗', result.reason, { sourceId: source.id, sourceName: source.name })
          results.push({
            sourceId: source.id,
            sourceName: source.name,
            success: false,
            error: result.reason?.message || 'Unknown error',
            itemsCollected: 0
          })
        }
      })

      // バッチ間で少し待機（レート制限対策）
      if (i + this.MAX_CONCURRENT_COLLECTIONS < sources.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
  }

  /**
   * 単一ソースから収集
   */
  private async collectFromSingleSource(source: any): Promise<CollectionResult> {
    const startTime = Date.now()
    
    try {
      logger.debug('ソース収集開始', { sourceId: source.id, sourceName: source.name, url: source.url })

      // RSSフィードを取得・解析
      const items = await this.rssService.fetchAndParseFeed(source.url)
      
      if (items.length === 0) {
        logger.info('新しいアイテムが見つかりません', { sourceId: source.id, sourceName: source.name })
        
        // 最終収集時刻を更新
        await prisma.rSSSource.update({
          where: { id: source.id },
          data: {
            lastCollected: new Date(),
            status: 'active'
          }
        })

        return {
          sourceId: source.id,
          sourceName: source.name,
          success: true,
          itemsCollected: 0,
          processingTime: Date.now() - startTime
        }
      }

      // データベースに保存
      const savedCount = await this.rssService.saveNewsItems(items)

      // ソースの統計を更新
      await prisma.rSSSource.update({
        where: { id: source.id },
        data: {
          lastCollected: new Date(),
          totalCollected: {
            increment: savedCount
          },
          status: savedCount > 0 ? 'active' : 'error'
        }
      })

      logger.debug('ソース収集完了', {
        sourceId: source.id,
        sourceName: source.name,
        itemsFound: items.length,
        itemsSaved: savedCount,
        processingTime: Date.now() - startTime
      })

      return {
        sourceId: source.id,
        sourceName: source.name,
        success: true,
        itemsCollected: savedCount,
        processingTime: Date.now() - startTime
      }

    } catch (error) {
      logger.error('ソース収集エラー', error as Error, { sourceId: source.id, sourceName: source.name })

      // エラー状態を記録
      await prisma.rSSSource.update({
        where: { id: source.id },
        data: {
          status: 'error',
          lastError: error instanceof Error ? error.message : String(error)
        }
      }).catch(dbError => {
        logger.error('データベース更新エラー', dbError as Error)
      })

      return {
        sourceId: source.id,
        sourceName: source.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        itemsCollected: 0,
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * 次回収集時刻を更新
   */
  private updateNextCollectionTime(): void {
    if (this.isRunning) {
      this.stats.nextCollectionTime = new Date(Date.now() + this.COLLECTION_INTERVAL)
    }
  }

  /**
   * スケジューラーの状態を取得
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      collectionInProgress: this.collectionInProgress,
      interval: this.COLLECTION_INTERVAL,
      maxConcurrent: this.MAX_CONCURRENT_COLLECTIONS,
      stats: this.stats,
      alertScheduler: alertScheduler.getStatus()
    }
  }

  /**
   * 統計情報をリセット
   */
  resetStats(): void {
    this.stats = {
      totalCollections: 0,
      successfulCollections: 0,
      failedCollections: 0,
      lastCollectionTime: null,
      nextCollectionTime: this.stats.nextCollectionTime,
      itemsCollected: 0
    }
    logger.info('統計情報をリセット')
  }
}

interface CollectionResult {
  sourceId: string
  sourceName: string
  success: boolean
  itemsCollected: number
  error?: string
  processingTime?: number
}

// シングルトンインスタンス
export const rssScheduler = new RSSScheduler()