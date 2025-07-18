import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'
import { createComponentLogger } from '@/lib/simple-logger'

const componentLogger = createComponentLogger('NewsItemsAPI')

// ニュースアイテム一覧取得
export async function GET(_request: NextRequest) {
  // 一時的に認証を無効化してテスト
  try {
    const { searchParams } = new URL(request.url)
    
    // クエリパラメータを取得
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // 最大100件
    const source = searchParams.get('source')
    const importance = searchParams.get('importance') ? parseInt(searchParams.get('importance')!) : undefined
    const hasGeneratedArticle = searchParams.get('hasGeneratedArticle') === 'true' ? true : 
                               searchParams.get('hasGeneratedArticle') === 'false' ? false : undefined
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'publishedAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
    
    componentLogger.info('ニュースアイテム一覧取得', {
      page,
      limit,
      source,
      importance,
      hasGeneratedArticle,
      search,
      sortBy,
      sortOrder
    })

      // 基本的なwhere条件を構築
      const whereConditions: any = {}

      // フィルター条件を追加
      if (source) {
        whereConditions.source = source
      }

      if (importance !== undefined) {
        whereConditions.importance = {
          gte: importance
        }
      }

      if (hasGeneratedArticle !== undefined) {
        whereConditions.hasGeneratedArticle = hasGeneratedArticle
      }

      // 検索条件を追加
      if (search) {
        whereConditions.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { source: { contains: search, mode: 'insensitive' } }
        ]
      }

      // ソート条件を構築
      const orderBy: any = {}
      if (sortBy === 'title') {
        orderBy.title = sortOrder
      } else if (sortBy === 'source') {
        orderBy.source = sortOrder
      } else if (sortBy === 'importance') {
        orderBy.importance = sortOrder
      } else if (sortBy === 'publishedAt') {
        orderBy.publishedAt = sortOrder
      } else {
        orderBy.publishedAt = sortOrder
      }

      // ページネーション計算
      const skip = (page - 1) * limit

      // ニュースアイテム一覧とカウントを並行取得
      const [newsItems, totalCount] = await Promise.all([
        prisma.newsItem.findMany({
          where: whereConditions,
          orderBy,
          skip,
          take: limit,
          select: {
            id: true,
            title: true,
            summary: true,
            url: true,
            imageUrl: true,
            source: true,
            author: true,
            sentiment: true,
            importance: true,
            publishedAt: true,
            hasGeneratedArticle: true,
            generatedArticleId: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.newsItem.count({
          where: whereConditions
        })
      ])

      // ページネーション情報
      const totalPages = Math.ceil(totalCount / limit)
      const hasNextPage = page < totalPages
      const hasPrevPage = page > 1

      componentLogger.info('ニュースアイテム一覧取得完了', {
        page,
        limit,
        totalCount,
        newsItemsCount: newsItems.length
      })

      return NextResponse.json({
        success: true,
        data: {
          newsItems,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage,
            hasPrevPage
          },
          filters: {
            source,
            importance,
            hasGeneratedArticle,
            search,
            sortBy,
            sortOrder
          }
        }
      })

    } catch (error) {
      componentLogger.error('ニュースアイテム一覧取得エラー', error as Error)

      return NextResponse.json(
        formatApiError(new AppError('ニュースアイテム一覧の取得に失敗しました', {
          type: ErrorType.PROCESSING_ERROR,
          code: 'NEWS_ITEMS_FETCH_FAILED',
          statusCode: 500
        })),
        { status: 500 }
      )
    }
}