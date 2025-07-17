import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'
import { createComponentLogger } from '@/lib/simple-logger'

const componentLogger = createComponentLogger('ArticleAPI')

// 記事詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(async (req, user) => {
    try {
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

      componentLogger.info('記事詳細取得', {
        articleId,
        userId: user.userId
      })

      // 記事を取得（作成者本人または公開記事のみ）
      const article = await prisma.article.findFirst({
        where: {
          id: articleId,
          OR: [
            { authorId: user.userId },
            { status: 'PUBLISHED' }
          ]
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
          template: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          versions: {
            orderBy: {
              version: 'desc'
            },
            take: 5,
            select: {
              id: true,
              version: true,
              changes: true,
              createdAt: true
            }
          }
        }
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

      // ビュー数を増加（作成者以外の場合）
      if (article.authorId !== user.userId) {
        await prisma.article.update({
          where: { id: articleId },
          data: {
            viewCount: {
              increment: 1
            }
          }
        })
      }

      // レスポンスデータを構築
      const responseData = {
        id: article.id,
        title: article.title,
        content: article.content,
        summary: article.summary,
        slug: article.slug,
        status: article.status,
        sourceType: article.sourceType,
        sourceData: article.sourceData,
        generatedBy: article.generatedBy,
        tags: article.tags,
        keywords: article.keywords,
        metaTitle: article.metaTitle,
        metaDescription: article.metaDescription,
        publishedAt: article.publishedAt,
        scheduledAt: article.scheduledAt,
        viewCount: article.viewCount,
        shareCount: article.shareCount,
        engagementRate: article.engagementRate,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        author: article.author,
        template: article.template,
        versions: article.versions,
        isOwner: article.authorId === user.userId,
        url: `/articles/${article.slug}`
      }

      componentLogger.info('記事詳細取得完了', {
        articleId,
        userId: user.userId,
        title: article.title,
        status: article.status
      })

      return NextResponse.json({
        success: true,
        data: responseData
      })

    } catch (error) {
      componentLogger.error('記事詳細取得エラー', error as Error, {
        articleId: params.id,
        userId: user.userId
      })

      return NextResponse.json(
        formatApiError(new AppError('記事の取得に失敗しました', {
          type: ErrorType.PROCESSING_ERROR,
          code: 'ARTICLE_FETCH_FAILED',
          statusCode: 500
        })),
        { status: 500 }
      )
    }
  })(request)
}

// 記事更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(async (req, user) => {
    try {
      const articleId = params.id
      const body = await request.json()
      
      componentLogger.info('記事更新リクエスト', {
        articleId,
        userId: user.userId
      })

      // 記事の存在確認と権限チェック
      const existingArticle = await prisma.article.findFirst({
        where: {
          id: articleId,
          authorId: user.userId // 作成者のみ更新可能
        }
      })

      if (!existingArticle) {
        return NextResponse.json(
          formatApiError(new AppError('記事が見つからないか、更新権限がありません', {
            type: ErrorType.FORBIDDEN,
            code: 'ARTICLE_UPDATE_FORBIDDEN',
            statusCode: 403,
            context: { articleId }
          })),
          { status: 403 }
        )
      }

      // 更新データを準備
      const updateData: any = {}
      
      if (body.title !== undefined) updateData.title = body.title
      if (body.content !== undefined) updateData.content = body.content
      if (body.summary !== undefined) updateData.summary = body.summary
      if (body.status !== undefined) updateData.status = body.status
      if (body.tags !== undefined) updateData.tags = body.tags
      if (body.keywords !== undefined) updateData.keywords = body.keywords
      if (body.metaTitle !== undefined) updateData.metaTitle = body.metaTitle
      if (body.metaDescription !== undefined) updateData.metaDescription = body.metaDescription
      if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null

      // 公開ステータスの場合は公開日時を設定
      if (body.status === 'PUBLISHED' && !existingArticle.publishedAt) {
        updateData.publishedAt = new Date()
      }

      // トランザクションで記事更新とバージョン作成
      const result = await prisma.$transaction(async (tx) => {
        // 記事を更新
        const updatedArticle = await tx.article.update({
          where: { id: articleId },
          data: updateData,
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        })

        // 新しいバージョンを作成（内容が変更された場合）
        if (body.title !== undefined || body.content !== undefined) {
          const latestVersion = await tx.articleVersion.findFirst({
            where: { articleId },
            orderBy: { version: 'desc' }
          })

          const newVersion = (latestVersion?.version || 0) + 1

          await tx.articleVersion.create({
            data: {
              articleId,
              version: newVersion,
              title: updatedArticle.title,
              content: updatedArticle.content || '',
              changes: body.changeDescription || '記事を更新しました',
              changeType: 'edit',
              authorId: user.userId
            }
          })
        }

        return updatedArticle
      })

      componentLogger.info('記事更新完了', {
        articleId,
        userId: user.userId,
        title: result.title,
        status: result.status
      })

      return NextResponse.json({
        success: true,
        data: {
          id: result.id,
          title: result.title,
          content: result.content,
          summary: result.summary,
          status: result.status,
          updatedAt: result.updatedAt,
          message: '記事を更新しました'
        }
      })

    } catch (error) {
      componentLogger.error('記事更新エラー', error as Error, {
        articleId: params.id,
        userId: user.userId
      })

      return NextResponse.json(
        formatApiError(new AppError('記事の更新に失敗しました', {
          type: ErrorType.PROCESSING_ERROR,
          code: 'ARTICLE_UPDATE_FAILED',
          statusCode: 500
        })),
        { status: 500 }
      )
    }
  })(request)
}

// 記事削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(async (req, user) => {
    try {
      const articleId = params.id
      
      componentLogger.info('記事削除リクエスト', {
        articleId,
        userId: user.userId
      })

      // 記事の存在確認と権限チェック
      const article = await prisma.article.findFirst({
        where: {
          id: articleId,
          authorId: user.userId // 作成者のみ削除可能
        }
      })

      if (!article) {
        return NextResponse.json(
          formatApiError(new AppError('記事が見つからないか、削除権限がありません', {
            type: ErrorType.FORBIDDEN,
            code: 'ARTICLE_DELETE_FORBIDDEN',
            statusCode: 403,
            context: { articleId }
          })),
          { status: 403 }
        )
      }

      // アーカイブ状態に変更（物理削除ではなく）
      await prisma.article.update({
        where: { id: articleId },
        data: {
          status: 'ARCHIVED'
        }
      })

      componentLogger.info('記事削除完了', {
        articleId,
        userId: user.userId,
        title: article.title
      })

      return NextResponse.json({
        success: true,
        message: '記事をアーカイブしました'
      })

    } catch (error) {
      componentLogger.error('記事削除エラー', error as Error, {
        articleId: params.id,
        userId: user.userId
      })

      return NextResponse.json(
        formatApiError(new AppError('記事の削除に失敗しました', {
          type: ErrorType.PROCESSING_ERROR,
          code: 'ARTICLE_DELETE_FAILED',
          statusCode: 500
        })),
        { status: 500 }
      )
    }
  })(request)
}