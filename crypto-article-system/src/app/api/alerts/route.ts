import { NextRequest, NextResponse } from 'next/server'
import { priceAlertManager } from '@/lib/price-alerts'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('AlertsAPI')

// アラート一覧取得
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status') // 'active', 'triggered', 'all'

    if (!userId || !tenantId) {
      throw new AppError('User ID and Tenant ID are required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_IDENTIFIERS',
        statusCode: 400,
        userMessage: 'ユーザーIDとテナントIDが必要です'
      })
    }

    componentLogger.info('アラート一覧を取得中', { userId, tenantId, status })

    let alerts = await priceAlertManager.getUserAlerts(userId, tenantId)

    // ステータスでフィルタリング
    if (status === 'active') {
      alerts = alerts.filter(alert => alert.isActive && !alert.isTriggered)
    } else if (status === 'triggered') {
      alerts = alerts.filter(alert => alert.isTriggered)
    }

    // 統計情報を計算
    const stats = {
      total: alerts.length,
      active: alerts.filter(a => a.isActive && !a.isTriggered).length,
      triggered: alerts.filter(a => a.isTriggered).length,
      inactive: alerts.filter(a => !a.isActive).length,
      conditions: {
        above: alerts.filter(a => a.condition === 'above').length,
        below: alerts.filter(a => a.condition === 'below').length,
        change_percent: alerts.filter(a => a.condition === 'change_percent').length
      }
    }

    componentLogger.performance('アラート一覧取得', Date.now() - startTime, {
      userId,
      tenantId,
      alertCount: alerts.length,
      activeCount: stats.active
    })

    return NextResponse.json({
      success: true,
      data: alerts,
      meta: {
        stats,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    componentLogger.error('アラート一覧取得に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to fetch alerts', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'アラート一覧の取得に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// アラート作成
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const {
      userId,
      tenantId,
      symbol,
      coinName,
      condition,
      targetPrice,
      changePercent,
      timeframe,
      notificationMethod,
      webhookUrl,
      message
    } = body

    // バリデーション
    if (!userId || !tenantId || !symbol || !coinName || !condition) {
      throw new AppError('Missing required fields', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_REQUIRED_FIELDS',
        statusCode: 400,
        userMessage: '必須フィールドが不足しています'
      })
    }

    if (!notificationMethod || notificationMethod.length === 0) {
      throw new AppError('At least one notification method is required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_NOTIFICATION_METHOD',
        statusCode: 400,
        userMessage: '少なくとも1つの通知方法が必要です'
      })
    }

    componentLogger.info('アラートを作成中', { 
      userId, 
      tenantId, 
      symbol, 
      condition, 
      targetPrice,
      changePercent 
    })

    const alertData = {
      userId,
      tenantId,
      symbol,
      coinName,
      condition,
      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      changePercent: changePercent ? parseFloat(changePercent) : undefined,
      timeframe,
      isActive: true,
      notificationMethod,
      webhookUrl,
      message
    }

    const newAlert = await priceAlertManager.createAlert(alertData)

    componentLogger.business('アラート作成完了', {
      alertId: newAlert.id,
      userId,
      tenantId,
      symbol,
      condition,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: newAlert
    })

  } catch (error) {
    componentLogger.error('アラート作成に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to create alert', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'アラートの作成に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// アラート更新
export async function PATCH(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { alertId, ...updates } = body

    if (!alertId) {
      throw new AppError('Alert ID is required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_ALERT_ID',
        statusCode: 400,
        userMessage: 'アラートIDが必要です'
      })
    }

    componentLogger.info('アラートを更新中', { alertId, updates: Object.keys(updates) })

    const updatedAlert = await priceAlertManager.updateAlert(alertId, updates)

    componentLogger.business('アラート更新完了', {
      alertId,
      updatedFields: Object.keys(updates),
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: updatedAlert
    })

  } catch (error) {
    componentLogger.error('アラート更新に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to update alert', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'アラートの更新に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// アラート削除
export async function DELETE(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const alertId = searchParams.get('alertId')

    if (!alertId) {
      throw new AppError('Alert ID is required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_ALERT_ID',
        statusCode: 400,
        userMessage: 'アラートIDが必要です'
      })
    }

    componentLogger.info('アラートを削除中', { alertId })

    await priceAlertManager.deleteAlert(alertId)

    componentLogger.business('アラート削除完了', {
      alertId,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      message: 'アラートを削除しました'
    })

  } catch (error) {
    componentLogger.error('アラート削除に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to delete alert', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'アラートの削除に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}