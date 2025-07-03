import { NextRequest, NextResponse } from 'next/server'
import { rssScheduler } from '@/lib/rss-scheduler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('RSSSchedulerAPI')

/**
 * スケジューラーの状態を取得
 */
export async function GET() {
  try {
    const status = rssScheduler.getStatus()
    
    return NextResponse.json({
      success: true,
      data: status
    })
  } catch (error) {
    logger.error('スケジューラー状態取得エラー', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to get scheduler status' },
      { status: 500 }
    )
  }
}

/**
 * スケジューラーの制御（開始/停止/手動実行）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'start':
        rssScheduler.start()
        logger.info('RSS スケジューラーを開始')
        return NextResponse.json({
          success: true,
          message: 'RSS scheduler started',
          data: rssScheduler.getStatus()
        })

      case 'stop':
        rssScheduler.stop()
        logger.info('RSS スケジューラーを停止')
        return NextResponse.json({
          success: true,
          message: 'RSS scheduler stopped',
          data: rssScheduler.getStatus()
        })

      case 'collect':
        // 手動収集を非同期で実行
        rssScheduler.performCollection()
        logger.info('RSS 手動収集を開始')
        return NextResponse.json({
          success: true,
          message: 'Manual collection started',
          data: rssScheduler.getStatus()
        })

      case 'reset-stats':
        rssScheduler.resetStats()
        logger.info('RSS スケジューラー統計をリセット')
        return NextResponse.json({
          success: true,
          message: 'Statistics reset',
          data: rssScheduler.getStatus()
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: start, stop, collect, or reset-stats' },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('スケジューラー制御エラー', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to control scheduler' },
      { status: 500 }
    )
  }
}