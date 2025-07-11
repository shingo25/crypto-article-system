import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'
import { createComponentLogger } from '@/lib/simple-logger'

const componentLogger = createComponentLogger('ArticleVersionsAPI')

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック（必要に応じて）
    // const { userId } = await requireAuth(request)

    const articleId = params.id

    if (!articleId) {
      return NextResponse.json(
        formatApiError(new AppError('記事IDが必要です', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'MISSING_ARTICLE_ID',
          statusCode: 400
        })),
        { status: 400 }
      )
    }

    componentLogger.info('記事バージョン履歴取得', { articleId })

    // 記事の存在確認
    const article = await prisma.article.findUnique({
      where: { id: articleId }
    })

    if (!article) {
      return NextResponse.json(
        formatApiError(new AppError('記事が見つかりません', {
          type: ErrorType.NOT_FOUND,
          code: 'ARTICLE_NOT_FOUND',
          statusCode: 404,
          context: { articleId }
        })),
        { status: 404 }
      )
    }

    // バージョン履歴を取得
    const versions = await prisma.articleVersion.findMany({
      where: {
        articleId: articleId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        version: 'desc'
      }
    })

    componentLogger.info('記事バージョン履歴取得完了', {
      articleId,
      versionCount: versions.length
    })

    return NextResponse.json({
      success: true,
      data: {
        articleId,
        articleTitle: article.title,
        versions: versions.map(version => ({
          id: version.id,
          version: version.version,
          title: version.title,
          changes: version.changes,
          changeType: version.changeType,
          createdAt: version.createdAt,
          author: version.author ? {
            id: version.author.id,
            username: version.author.username,
            displayName: version.author.firstName && version.author.lastName
              ? `${version.author.firstName} ${version.author.lastName}`
              : version.author.username
          } : null,
          wordCount: version.content ? version.content.replace(/\s+/g, '').length : 0
        }))
      }
    })

  } catch (error) {
    componentLogger.error('記事バージョン履歴取得エラー', error as Error, {
      articleId: params.id
    })

    return NextResponse.json(
      formatApiError(new AppError('記事バージョン履歴の取得に失敗しました', {
        type: ErrorType.PROCESSING_ERROR,
        code: 'VERSION_FETCH_FAILED',
        statusCode: 500
      })),
      { status: 500 }
    )
  }
}