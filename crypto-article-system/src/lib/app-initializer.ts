/**
 * アプリケーション初期化処理
 * サーバー起動時に必要なサービスを自動開始
 */

import { rssScheduler } from '@/lib/rss-scheduler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AppInitializer')

let isInitialized = false

/**
 * アプリケーション初期化
 * サーバー起動時に一度だけ実行される
 */
export async function initializeApplication() {
  if (isInitialized) {
    logger.info('アプリケーションは既に初期化済み')
    return
  }

  try {
    logger.info('アプリケーション初期化を開始')

    // RSS自動収集スケジューラーを開始
    logger.info('RSS自動収集スケジューラーを開始')
    rssScheduler.start()

    // 初期化完了フラグを設定
    isInitialized = true

    logger.info('アプリケーション初期化が完了', {
      rssScheduler: rssScheduler.getStatus().isRunning,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('アプリケーション初期化エラー', error as Error)
    throw error
  }
}

/**
 * 初期化状態を取得
 */
export function getInitializationStatus() {
  return {
    isInitialized,
    rssScheduler: rssScheduler.getStatus(),
    timestamp: new Date().toISOString()
  }
}

/**
 * アプリケーションの健全性チェック
 */
export function checkApplicationHealth() {
  const rssStatus = rssScheduler.getStatus()
  
  return {
    overall: isInitialized && rssStatus.isRunning ? 'healthy' : 'warning',
    services: {
      initialized: isInitialized,
      rssScheduler: {
        running: rssStatus.isRunning,
        collectionInProgress: rssStatus.collectionInProgress,
        lastCollection: rssStatus.stats.lastCollectionTime,
        nextCollection: rssStatus.stats.nextCollectionTime
      }
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  }
}