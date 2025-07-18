import { NextRequest, NextResponse } from 'next/server'
import { alertGenerator } from '@/lib/alert-generator'
import { alertScheduler } from '@/lib/alert-scheduler'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AlertGenerationAPI')

/**
 * アラート生成API
 * GET: 手動でアラート生成を実行
 */
export async function GET(__request: NextRequest) {
  try {
    logger.info('Manual alert generation requested')
    
    const startTime = Date.now()
    const alerts = await alertGenerator.generateAlerts()
    const executionTime = Date.now() - startTime

    logger.info('Alert generation completed', {
      alertsGenerated: alerts.length,
      executionTime: `${executionTime}ms`
    })

    return NextResponse.json({
      success: true,
      data: {
        alerts: alerts.map(alert => ({
          symbol: alert.symbol,
          alertType: alert.alertType,
          level: alert.level,
          title: alert.title,
          description: alert.description,
          changePercent: alert.changePercent,
          timeframe: alert.timeframe,
          volume: alert.volume
        })),
        statistics: {
          totalAlerts: alerts.length,
          executionTime: `${executionTime}ms`,
          breakdown: {
            high: alerts.filter(a => a.level === 'high').length,
            medium: alerts.filter(a => a.level === 'medium').length,
            low: alerts.filter(a => a.level === 'low').length
          }
        }
      }
    })

  } catch (error) {
    logger.error('Alert generation failed', error as Error)
    
    return NextResponse.json({
      success: false,
      error: 'アラート生成に失敗しました'
    }, { status: 500 })
  }
}

/**
 * アラートスケジューラーの制御
 * POST: スケジューラーを開始/停止
 */
export async function POST(_request: NextRequest) {
  try {
    const { action } = await _request.json()

    if (action === 'start') {
      alertScheduler.start()
      logger.info('Alert scheduler started via API')
      
      return NextResponse.json({
        success: true,
        data: {
          message: 'アラートスケジューラーを開始しました',
          status: alertScheduler.getStatus()
        }
      })
      
    } else if (action === 'stop') {
      alertScheduler.stop()
      logger.info('Alert scheduler stopped via API')
      
      return NextResponse.json({
        success: true,
        data: {
          message: 'アラートスケジューラーを停止しました',
          status: alertScheduler.getStatus()
        }
      })
      
    } else if (action === 'execute') {
      await alertScheduler.executeManually()
      logger.info('Manual alert generation executed via API')
      
      return NextResponse.json({
        success: true,
        data: {
          message: 'アラート生成を実行しました'
        }
      })
      
    } else {
      return NextResponse.json({
        success: false,
        error: '無効なアクションです。start, stop, execute のいずれかを指定してください'
      }, { status: 400 })
    }

  } catch (error) {
    logger.error('Alert scheduler control failed', error as Error)
    
    return NextResponse.json({
      success: false,
      error: 'アラートスケジューラーの制御に失敗しました'
    }, { status: 500 })
  }
}

/**
 * アラートスケジューラーの状態取得
 */
export async function PUT(_request: NextRequest) {
  try {
    const status = alertScheduler.getStatus()
    
    return NextResponse.json({
      success: true,
      data: {
        scheduler: {
          isRunning: status.isRunning,
          interval: status.interval,
          intervalMinutes: status.interval / 1000 / 60,
          nextExecution: status.nextExecution?.toISOString(),
          timeUntilNext: status.nextExecution ? 
            Math.max(0, status.nextExecution.getTime() - Date.now()) : 
            null
        }
      }
    })

  } catch (error) {
    logger.error('Failed to get alert scheduler status', error as Error)
    
    return NextResponse.json({
      success: false,
      error: 'スケジューラー状態の取得に失敗しました'
    }, { status: 500 })
  }
}