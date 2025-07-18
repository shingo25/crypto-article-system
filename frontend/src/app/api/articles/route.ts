import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'
import { createComponentLogger } from '@/lib/simple-logger'

const componentLogger = createComponentLogger('ArticlesAPI')

// 記事一覧取得
export async function GET(_request: NextRequest) {
  return requireAuth(async (req, user) => {
    try {
      const { searchParams } = new URL(req.url)
      
      // クエリパラメータを取得
      const page = parseInt(searchParams.get('page') || '1')
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // 最大100件
      const status = searchParams.get('status') as 'DRAFT' | 'REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED' | null
      const authorId = searchParams.get('authorId')
      const search = searchParams.get('search')
      const sortBy = searchParams.get('sortBy') || 'createdAt'
      const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
      const sourceType = searchParams.get('sourceType')
      
      componentLogger.info('記事一覧取得', {
        userId: user.userId,
        page,
        limit,
        status,
        authorId,
        search
      })

      // 基本的なwhere条件を構築
      const whereConditions: any = {
        OR: [
          { authorId: user.userId }, // 自分の記事
          { status: 'PUBLISHED' }    // 公開記事
        ]
      }

      // フィルター条件を追加
      if (status) {
        whereConditions.status = status
      }

      if (authorId && authorId !== 'all') {
        whereConditions.authorId = authorId
      }

      if (sourceType) {
        whereConditions.sourceType = sourceType
      }

      // 検索条件を追加
      if (search) {
        whereConditions.AND = [
          {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { summary: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } }
            ]
          }
        ]
      }

      // ソート条件を構築
      const orderBy: any = {}
      if (sortBy === 'title') {
        orderBy.title = sortOrder
      } else if (sortBy === 'status') {
        orderBy.status = sortOrder
      } else if (sortBy === 'publishedAt') {
        orderBy.publishedAt = sortOrder
      } else if (sortBy === 'viewCount') {
        orderBy.viewCount = sortOrder
      } else {
        orderBy.createdAt = sortOrder
      }

      // ページネーション計算
      const skip = (page - 1) * limit

      // 記事一覧とカウントを並行取得
      const [articles, totalCount] = await Promise.all([
        prisma.article.findMany({
          where: whereConditions,
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            },
            template: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy,
          skip,
          take: limit
        }),
        prisma.article.count({
          where: whereConditions
        })
      ])

      // レスポンスデータを構築
      const responseData = articles.map(article => ({
        id: article.id,
        title: article.title,
        summary: article.summary,
        slug: article.slug,
        status: article.status,
        sourceType: article.sourceType,
        generatedBy: article.generatedBy,
        tags: article.tags,
        publishedAt: article.publishedAt,
        scheduledAt: article.scheduledAt,
        viewCount: article.viewCount,
        shareCount: article.shareCount,
        engagementRate: article.engagementRate,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        author: article.author,
        template: article.template,
        isOwner: article.authorId === user.userId,
        url: `/articles/${article.slug}`
      }))

      // ページネーション情報
      const totalPages = Math.ceil(totalCount / limit)
      const hasNextPage = page < totalPages
      const hasPrevPage = page > 1

      componentLogger.info('記事一覧取得完了', {
        userId: user.userId,
        page,
        limit,
        totalCount,
        articlesCount: articles.length
      })

      return NextResponse.json({
        success: true,
        data: {
          articles: responseData,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage,
            hasPrevPage
          },
          filters: {
            status,
            authorId,
            search,
            sourceType,
            sortBy,
            sortOrder
          }
        }
      })

    } catch (error) {
      componentLogger.error('記事一覧取得エラー', error as Error, {
        userId: user.userId
      })

      return NextResponse.json(
        formatApiError(new AppError('記事一覧の取得に失敗しました', {
          type: ErrorType.PROCESSING_ERROR,
          code: 'ARTICLES_FETCH_FAILED',
          statusCode: 500
        })),
        { status: 500 }
      )
    }
  })(_request)
}