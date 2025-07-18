import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'
import { createComponentLogger } from '@/lib/simple-logger'

const componentLogger = createComponentLogger('ArticleVersionAPI')

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    // 認証チェック（必要に応じて）
    // const { userId } = await requireAuth(request)

    const { id: articleId, versionId } = params

    if (!articleId || !versionId) {
      return NextResponse.json(
        formatApiError(new AppError('記事IDとバージョンIDが必要です', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'MISSING_IDS',
          statusCode: 400
        })),
        { status: 400 }
      )
    }

    componentLogger.info('記事バージョン詳細取得', { articleId, versionId })

    // バージョンを取得
    const version = await prisma.articleVersion.findUnique({
      where: {
        id: versionId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        article: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    if (!version) {
      return NextResponse.json(
        formatApiError(new AppError('バージョンが見つかりません', {
          type: ErrorType.NOT_FOUND,
          code: 'VERSION_NOT_FOUND',
          statusCode: 404,
          context: { articleId, versionId }
        })),
        { status: 404 }
      )
    }

    // 記事IDの一致確認
    if (version.articleId !== articleId) {
      return NextResponse.json(
        formatApiError(new AppError('バージョンが指定された記事に属していません', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'VERSION_ARTICLE_MISMATCH',
          statusCode: 400,
          context: { articleId, versionId, actualArticleId: version.articleId }
        })),
        { status: 400 }
      )
    }

    componentLogger.info('記事バージョン詳細取得完了', {
      articleId,
      versionId,
      version: version.version
    })

    return NextResponse.json({
      success: true,
      data: {
        id: version.id,
        articleId: version.articleId,
        version: version.version,
        title: version.title,
        content: version.content,
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
        article: {
          id: version.article.id,
          title: version.article.title
        },
        wordCount: version.content ? version.content.replace(/\s+/g, '').length : 0
      }
    })

  } catch (error) {
    componentLogger.error('記事バージョン詳細取得エラー', error as Error, {
      articleId: params.id,
      versionId: params.versionId
    })

    return NextResponse.json(
      formatApiError(new AppError('記事バージョン詳細の取得に失敗しました', {
        type: ErrorType.PROCESSING_ERROR,
        code: 'VERSION_DETAIL_FETCH_FAILED',
        statusCode: 500
      })),
      { status: 500 }
    )
  }
}