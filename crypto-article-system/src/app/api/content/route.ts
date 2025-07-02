import { NextRequest, NextResponse } from 'next/server'
import { contentDistributionManager } from '@/lib/content-distribution'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('ContentAPI')

// コンテンツ一覧取得
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // 最大100件
    
    // フィルタパラメータ
    const categories = searchParams.get('categories')?.split(',')
    const tags = searchParams.get('tags')?.split(',')
    const status = searchParams.get('status')?.split(',') as any[]
    const priority = searchParams.get('priority')?.split(',') as any[]
    const language = searchParams.get('language')?.split(',')
    const sentiment = searchParams.get('sentiment')?.split(',') as any[]
    const minConfidence = searchParams.get('minConfidence') ? parseFloat(searchParams.get('minConfidence')!) : undefined
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!tenantId) {
      throw new AppError('Tenant ID is required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_TENANT_ID',
        statusCode: 400,
        userMessage: 'テナントIDが必要です'
      })
    }

    // フィルタ構築
    const filter: any = {}
    if (categories) filter.categories = categories
    if (tags) filter.tags = tags
    if (status) filter.status = status
    if (priority) filter.priority = priority
    if (language) filter.language = language
    if (sentiment) filter.sentiment = sentiment
    if (minConfidence !== undefined) filter.minConfidence = minConfidence
    if (from && to) filter.dateRange = { from, to }

    componentLogger.info('コンテンツ一覧を取得中', { 
      tenantId, 
      page, 
      limit, 
      filterCount: Object.keys(filter).length 
    })

    const result = await contentDistributionManager.getContent(tenantId, filter, page, limit)

    componentLogger.performance('コンテンツ一覧取得', Date.now() - startTime, {
      tenantId,
      resultCount: result.content.length,
      total: result.total
    })

    return NextResponse.json({
      success: true,
      data: result.content,
      meta: {
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit)
        },
        filters: filter,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    componentLogger.error('コンテンツ一覧取得に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to fetch content', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'コンテンツ一覧の取得に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// コンテンツ登録
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const {
      tenantId,
      type,
      title,
      content,
      summary,
      metadata,
      distribution
    } = body

    // バリデーション
    if (!tenantId || !type || !title || !content) {
      throw new AppError('Missing required fields', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_REQUIRED_FIELDS',
        statusCode: 400,
        userMessage: '必須フィールドが不足しています'
      })
    }

    if (!['article', 'topic', 'analysis'].includes(type)) {
      throw new AppError('Invalid content type', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'INVALID_CONTENT_TYPE',
        statusCode: 400,
        userMessage: '無効なコンテンツタイプです'
      })
    }

    componentLogger.info('コンテンツを登録中', { tenantId, type, title })

    // デフォルト値設定
    const contentData = {
      tenantId,
      type,
      title,
      content,
      summary: summary || title,
      metadata: {
        tags: [],
        categories: [],
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published' as const,
        priority: 'medium' as const,
        language: 'ja',
        readingTime: Math.ceil(content.length / 200), // 概算読了時間
        wordCount: content.length,
        ...metadata
      },
      distribution: {
        channels: [],
        publishedChannels: [],
        failedChannels: [],
        ...distribution
      }
    }

    const registeredContent = await contentDistributionManager.registerContent(contentData)

    componentLogger.business('コンテンツ登録完了', {
      contentId: registeredContent.id,
      type: registeredContent.type,
      tenantId,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: registeredContent
    })

  } catch (error) {
    componentLogger.error('コンテンツ登録に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to register content', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'コンテンツの登録に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}