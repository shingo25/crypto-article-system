import { NextRequest, NextResponse } from 'next/server'
import { workflowManager } from '@/lib/workflow'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('WorkflowStatsAPI')

// ワークフロー統計情報を取得
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') as '1d' | '7d' | '30d' || '7d'

    componentLogger.info('ワークフロー統計を取得中', { timeRange })

    const stats = await workflowManager.getWorkflowStats(timeRange)

    componentLogger.performance('ワークフロー統計取得', Date.now() - startTime, {
      timeRange,
      totalWorkflows: stats.total
    })

    return NextResponse.json({
      success: true,
      data: {
        timeRange,
        ...stats,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    componentLogger.error('ワークフロー統計取得に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    const appError = new AppError('Failed to get workflow stats', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'ワークフロー統計の取得に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}