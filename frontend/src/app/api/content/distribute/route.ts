import { NextRequest, NextResponse } from 'next/server'
import { contentDistributionManager } from '@/lib/content-distribution'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('ContentDistributeAPI')

// コンテンツ配信
export async function POST(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { contentId, channelIds, force = false } = body

    if (!contentId) {
      throw new AppError('Content ID is required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_CONTENT_ID',
        statusCode: 400,
        userMessage: 'コンテンツIDが必要です'
      })
    }

    componentLogger.info('コンテンツ配信を開始', { 
      contentId, 
      channelIds: channelIds?.length || 'all',
      force 
    })

    const results = await contentDistributionManager.distributeContent(
      contentId,
      channelIds,
      force
    )

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    componentLogger.business('コンテンツ配信完了', {
      contentId,
      totalChannels: results.length,
      successCount,
      errorCount,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: {
        contentId,
        results,
        summary: {
          total: results.length,
          success: successCount,
          errors: errorCount,
          successRate: results.length > 0 ? (successCount / results.length) * 100 : 0
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        force
      }
    })

  } catch (error) {
    componentLogger.error('コンテンツ配信に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to distribute content', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'コンテンツの配信に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}