import { NextRequest, NextResponse } from 'next/server'
import { contentDistributionManager } from '@/lib/content-distribution'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('RSSAPI')

// RSS フィード配信
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId')
    const channelId = searchParams.get('channelId')

    if (!tenantId || !channelId) {
      throw new AppError('Tenant ID and Channel ID are required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_IDENTIFIERS',
        statusCode: 400,
        userMessage: 'テナントIDとチャンネルIDが必要です'
      })
    }

    componentLogger.info('RSS フィードを生成中', { tenantId, channelId })

    const rssXml = contentDistributionManager.generateRssFeed(tenantId, channelId)

    componentLogger.performance('RSS フィード生成', Date.now() - startTime, {
      tenantId,
      channelId,
      contentLength: rssXml.length
    })

    return new Response(rssXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 5分キャッシュ
        'Last-Modified': new Date().toUTCString()
      }
    })

  } catch (error) {
    componentLogger.error('RSS フィード生成に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to generate RSS feed', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'RSS フィードの生成に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}