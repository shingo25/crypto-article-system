import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'
import { createComponentLogger } from '@/lib/simple-logger'

const componentLogger = createComponentLogger('NewsItemAPI')

// ニュースアイテム詳細取得
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(async (req, user) => {
    try {
      const newsItemId = params.id
      
      if (!newsItemId) {
        return NextResponse.json(
          formatApiError(new AppError('ニュースアイテムIDが必要です', {
            type: ErrorType.VALIDATION_ERROR,
            code: 'MISSING_NEWS_ITEM_ID',
            statusCode: 400
          })),
          { status: 400 }
        )
      }

      componentLogger.info('ニュースアイテム詳細取得', {
        newsItemId,
        userId: user.userId
      })

      // ニュースアイテムを取得
      const newsItem = await prisma.newsItem.findUnique({
        where: {
          id: newsItemId
        },
        include: {
          // 生成された記事情報も含める
          generatedArticleId: true
        }
      })

      if (!newsItem) {
        return NextResponse.json(
          formatApiError(new AppError('ニュースアイテムが見つかりません', {
            type: ErrorType.NOT_FOUND,
            code: 'NEWS_ITEM_NOT_FOUND',
            statusCode: 404,
            context: { newsItemId }
          })),
          { status: 404 }
        )
      }

      componentLogger.info('ニュースアイテム詳細取得完了', {
        newsItemId,
        userId: user.userId,
        title: newsItem.title,
        source: newsItem.source
      })

      return NextResponse.json({
        success: true,
        data: newsItem
      })

    } catch (error) {
      componentLogger.error('ニュースアイテム詳細取得エラー', error as Error, {
        newsItemId: params.id,
        userId: user.userId
      })

      return NextResponse.json(
        formatApiError(new AppError('ニュースアイテムの取得に失敗しました', {
          type: ErrorType.PROCESSING_ERROR,
          code: 'NEWS_ITEM_FETCH_FAILED',
          statusCode: 500
        })),
        { status: 500 }
      )
    }
  })(request)
}