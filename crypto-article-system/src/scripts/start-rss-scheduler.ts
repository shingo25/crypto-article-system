#!/usr/bin/env tsx

/**
 * RSS自動収集スケジューラーの起動スクリプト
 * システム起動時やサーバー再起動時に自動実行
 */

import { rssScheduler } from '@/lib/rss-scheduler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('RSSSchedulerStartup')

async function startScheduler() {
  try {
    logger.info('RSS自動収集スケジューラーを起動中...')
    
    // スケジューラーを開始
    rssScheduler.start()
    
    // 状態確認
    const status = rssScheduler.getStatus()
    logger.info('RSS自動収集スケジューラーが正常に起動しました', {
      isRunning: status.isRunning,
      interval: `${status.interval / 1000}秒間隔`,
      nextCollection: status.stats.nextCollectionTime
    })

    // プロセス終了時のクリーンアップ
    const cleanup = () => {
      logger.info('RSS自動収集スケジューラーを停止中...')
      rssScheduler.stop()
      process.exit(0)
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
    process.on('exit', cleanup)

    // keep alive
    process.stdin.resume()

  } catch (error) {
    logger.error('RSS自動収集スケジューラーの起動に失敗', error as Error)
    process.exit(1)
  }
}

// 即座に実行
startScheduler()