import { NextRequest, NextResponse } from 'next/server'
import { contentDistributionManager } from '@/lib/content-distribution'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'
import { requireAuth } from '@/lib/auth'
import { withRateLimit } from '@/lib/rate-limit'
import { 
  CreateContentSchema, 
  ContentSearchSchema, 
  sanitizeContent, 
  sanitizeTitle, 
  containsSuspiciousContent 
} from '@/lib/validation/content'
import { z } from 'zod'

const componentLogger = createComponentLogger('ContentAPI')

// コンテンツ一覧取得
const getContentHandler = requireAuth(async (request: NextRequest, user) => {
  const startTime = Date.now()
  
  try {
    // URLパラメータを検証
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const validatedParams = ContentSearchSchema.parse(searchParams)

    componentLogger.info('コンテンツ一覧を取得中', { 
      tenantId: validatedParams.tenantId, 
      page: validatedParams.page, 
      limit: validatedParams.limit,
      userId: user.userId,
      role: user.role
    })

    // フィルタ構築
    const filter: Record<string, unknown> = {}
    if (validatedParams.categories) filter.categories = validatedParams.categories
    if (validatedParams.tags) filter.tags = validatedParams.tags
    if (validatedParams.status) filter.status = validatedParams.status
    if (validatedParams.priority) filter.priority = validatedParams.priority
    if (validatedParams.language) filter.language = validatedParams.language
    if (validatedParams.sentiment) filter.sentiment = validatedParams.sentiment
    if (validatedParams.minConfidence !== undefined) filter.minConfidence = validatedParams.minConfidence
    if (validatedParams.from && validatedParams.to) filter.dateRange = { from: validatedParams.from, to: validatedParams.to }

    const result = await contentDistributionManager.getContent(validatedParams.tenantId, filter, validatedParams.page, validatedParams.limit)

    componentLogger.performance('コンテンツ一覧取得', Date.now() - startTime, {
      tenantId: validatedParams.tenantId,
      resultCount: result.content.length,
      total: result.total,
      userId: user.userId
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
      duration: Date.now() - startTime,
      userId: user.userId
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'バリデーションエラー',
        details: error.errors
      }, { status: 400 })
    }

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
})

// コンテンツ登録
const postContentHandler = requireAuth(async (request: NextRequest, user) => {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const validatedData = CreateContentSchema.parse(body)

    // セキュリティチェック
    if (containsSuspiciousContent(validatedData.content)) {
      throw new AppError('Suspicious content detected', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'SUSPICIOUS_CONTENT',
        statusCode: 400,
        userMessage: '不正なコンテンツが検出されました'
      })
    }

    if (containsSuspiciousContent(validatedData.title)) {
      throw new AppError('Suspicious title detected', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'SUSPICIOUS_TITLE',
        statusCode: 400,
        userMessage: '不正なタイトルが検出されました'
      })
    }

    // コンテンツをサニタイズ
    const sanitizedTitle = sanitizeTitle(validatedData.title)
    const sanitizedContent = sanitizeContent(validatedData.content)
    const sanitizedSummary = validatedData.summary ? sanitizeContent(validatedData.summary) : undefined

    componentLogger.info('コンテンツを登録中', { 
      tenantId: validatedData.tenantId, 
      type: validatedData.type, 
      title: sanitizedTitle,
      userId: user.userId,
      role: user.role
    })

    // デフォルト値設定
    const contentData = {
      tenantId: validatedData.tenantId,
      type: validatedData.type,
      title: sanitizedTitle,
      content: sanitizedContent,
      summary: sanitizedSummary || sanitizedTitle,
      metadata: {
        tags: [],
        categories: [],
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published' as const,
        priority: 'medium' as const,
        language: 'ja',
        readingTime: Math.ceil(sanitizedContent.length / 200), // 概算読了時間
        wordCount: sanitizedContent.length,
        authorId: user.userId, // 作成者を記録
        ...validatedData.metadata
      },
      distribution: {
        channels: [],
        publishedChannels: [],
        failedChannels: [],
        ...validatedData.distribution
      }
    }

    const registeredContent = await contentDistributionManager.registerContent(contentData)

    componentLogger.business('コンテンツ登録完了', {
      contentId: registeredContent.id,
      type: registeredContent.type,
      tenantId: validatedData.tenantId,
      userId: user.userId,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: registeredContent
    })

  } catch (error) {
    componentLogger.error('コンテンツ登録に失敗', error as Error, {
      duration: Date.now() - startTime,
      userId: user.userId
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'バリデーションエラー',
        details: error.errors
      }, { status: 400 })
    }

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
})

// レート制限を適用してエクスポート
export const GET = withRateLimit(getContentHandler, 'public')
export const POST = withRateLimit(postContentHandler, 'content')