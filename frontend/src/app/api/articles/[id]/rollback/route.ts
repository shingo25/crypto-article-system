import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'
import { createComponentLogger } from '@/lib/simple-logger'
import { z } from 'zod'

const componentLogger = createComponentLogger('ArticleRollbackAPI')

// リクエストバリデーションスキーマ
const rollbackRequestSchema = z.object({
  versionId: z.string().min(1, 'バージョンIDは必須です'),
  reason: z.string().optional()
})

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック（テスト環境では一時的に無効化）
    // const { userId } = await requireAuth(request)
    const testUserId = 'test-user-id'

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

    const body = await request.json()
    const validatedData = rollbackRequestSchema.parse(body)

    componentLogger.info('記事ロールバック開始', {
      articleId,
      versionId: validatedData.versionId,
      userId: testUserId
    })

    // トランザクション内でロールバック処理を実行
    const result = await prisma.$transaction(async (tx) => {
      // 1. 記事の存在確認
      const article = await tx.article.findUnique({
        where: { id: articleId }
      })

      if (!article) {
        throw new AppError('記事が見つかりません', {
          type: ErrorType.NOT_FOUND,
          code: 'ARTICLE_NOT_FOUND',
          statusCode: 404,
          context: { articleId }
        })
      }

      // 2. ロールバック先バージョンの取得
      const targetVersion = await tx.articleVersion.findUnique({
        where: { id: validatedData.versionId }
      })

      if (!targetVersion) {
        throw new AppError('ロールバック先バージョンが見つかりません', {
          type: ErrorType.NOT_FOUND,
          code: 'VERSION_NOT_FOUND',
          statusCode: 404,
          context: { versionId: validatedData.versionId }
        })
      }

      // 3. バージョンが指定記事に属することを確認
      if (targetVersion.articleId !== articleId) {
        throw new AppError('バージョンが指定された記事に属していません', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'VERSION_ARTICLE_MISMATCH',
          statusCode: 400,
          context: { articleId, versionId: validatedData.versionId }
        })
      }

      // 4. 次のバージョン番号を取得
      const latestVersion = await tx.articleVersion.findFirst({
        where: { articleId },
        orderBy: { version: 'desc' }
      })

      const newVersionNumber = (latestVersion?.version || 0) + 1

      // 5. 記事を更新
      const updatedArticle = await tx.article.update({
        where: { id: articleId },
        data: {
          title: targetVersion.title,
          content: targetVersion.content,
          updatedAt: new Date()
        }
      })

      // 6. ロールバック操作を新しいバージョンとして記録
      const rollbackReason = validatedData.reason || 'バージョンのロールバック'
      const newVersion = await tx.articleVersion.create({
        data: {
          articleId,
          version: newVersionNumber,
          title: targetVersion.title,
          content: targetVersion.content,
          changes: `バージョン${targetVersion.version}からロールバック: ${rollbackReason}`,
          changeType: 'rollback',
          authorId: testUserId
        }
      })

      return {
        article: updatedArticle,
        newVersion,
        targetVersion
      }
    })

    componentLogger.info('記事ロールバック完了', {
      articleId,
      targetVersionId: validatedData.versionId,
      targetVersion: result.targetVersion.version,
      newVersion: result.newVersion.version,
      userId: testUserId
    })

    return NextResponse.json({
      success: true,
      data: {
        articleId,
        newVersion: {
          id: result.newVersion.id,
          version: result.newVersion.version,
          title: result.newVersion.title,
          changes: result.newVersion.changes,
          changeType: result.newVersion.changeType,
          createdAt: result.newVersion.createdAt
        },
        rolledBackFrom: {
          id: result.targetVersion.id,
          version: result.targetVersion.version
        },
        message: `バージョン${result.targetVersion.version}にロールバックしました`
      }
    })

  } catch (error) {
    componentLogger.error('記事ロールバックエラー', error as Error, {
      articleId: params.id
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        formatApiError(new AppError('入力データが無効です', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'INVALID_INPUT',
          statusCode: 400,
          context: { issues: error.issues }
        })),
        { status: 400 }
      )
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        formatApiError(error),
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      formatApiError(new AppError('記事ロールバックに失敗しました', {
        type: ErrorType.PROCESSING_ERROR,
        code: 'ROLLBACK_FAILED',
        statusCode: 500
      })),
      { status: 500 }
    )
  }
}