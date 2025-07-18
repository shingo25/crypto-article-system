import { NextRequest, NextResponse } from 'next/server'
import { alertIntegrationService } from '@/lib/alert-integration-service'
import { createErrorResponse } from '@/lib/error-handler'
import { createComponentLogger } from '@/lib/simple-logger'

const componentLogger = createComponentLogger('AlertsAPI')

// GET /api/alerts - 最新のアラートを取得
export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // 最新のアラートを取得
    const alerts = await alertIntegrationService.getLatestAlerts(limit)
    
    componentLogger.info('最新アラートを取得', { count: alerts.length, limit })
    
    return NextResponse.json({
      success: true,
      data: alerts,
      meta: {
        count: alerts.length,
        limit
      }
    })
  } catch (error) {
    componentLogger.error('アラート取得に失敗', error as Error)
    return createErrorResponse(
      'Failed to fetch alerts',
      500,
      'アラートの取得に失敗しました'
    )
  }
}

// POST /api/alerts/dismiss - アラートを既読にする
export async function POST(_request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId } = body
    
    if (!alertId || typeof alertId !== 'number') {
      return createErrorResponse(
        'Invalid alert ID',
        400,
        '有効なアラートIDを指定してください'
      )
    }
    
    const success = await alertIntegrationService.dismissAlert(alertId)
    
    if (!success) {
      return createErrorResponse(
        'Failed to dismiss alert',
        500,
        'アラートの既読設定に失敗しました'
      )
    }
    
    componentLogger.info('アラートを既読に設定', { alertId })
    
    return NextResponse.json({
      success: true,
      message: 'アラートを既読にしました'
    })
  } catch (error) {
    componentLogger.error('アラート既読設定に失敗', error as Error)
    return createErrorResponse(
      'Failed to dismiss alert',
      500,
      'アラートの既読設定に失敗しました'
    )
  }
}

