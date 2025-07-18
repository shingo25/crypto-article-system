import { NextRequest, NextResponse } from 'next/server'
import { alertIntegrationService } from '@/lib/alert-integration-service'
import { createErrorResponse } from '@/lib/error-handler'
import { createComponentLogger } from '@/lib/simple-logger'

const componentLogger = createComponentLogger('AlertSystemAPI')

// GET /api/alerts/system - システム状態を取得
export async function GET(_request: NextRequest) {
  try {
    const status = alertIntegrationService.getSystemStatus()
    
    componentLogger.info('システム状態を取得', status)
    
    return NextResponse.json({
      success: true,
      data: status
    })
  } catch (error) {
    componentLogger.error('システム状態取得に失敗', error as Error)
    return createErrorResponse(
      'Failed to get system status',
      500,
      'システム状態の取得に失敗しました'
    )
  }
}

// POST /api/alerts/system/start - アラートシステムを開始
export async function POST(_request: NextRequest) {
  try {
    await alertIntegrationService.startSystem()
    
    componentLogger.info('アラートシステムを開始')
    
    return NextResponse.json({
      success: true,
      message: 'アラートシステムを開始しました'
    })
  } catch (error) {
    componentLogger.error('アラートシステム開始に失敗', error as Error)
    return createErrorResponse(
      'Failed to start alert system',
      500,
      'アラートシステムの開始に失敗しました'
    )
  }
}