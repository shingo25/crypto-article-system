import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { addArticleGenerationJob, initializeArticleGeneratorWorker } from '@/lib/workers/article-generator-worker'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'
import { createComponentLogger } from '@/lib/simple-logger'
import { createMockJob } from '@/lib/mock-job-system'
import { z } from 'zod'

const componentLogger = createComponentLogger('ArticleGenerateAPI')

// ワーカーを初期化（一度だけ実行）
let workerInitialized = false
if (!workerInitialized) {
  initializeArticleGeneratorWorker()
  workerInitialized = true
}

// リクエストバリデーションスキーマ
const generateRequestSchema = z.object({
  newsId: z.string().min(1, 'ニュースIDは必須です'),
  templateId: z.string().optional(),
  options: z.object({
    style: z.enum(['detailed', 'concise', 'technical']).optional(),
    length: z.enum(['short', 'medium', 'long']).optional()
  }).optional()
})

interface GenerateRequest {
  newsId: string
  templateId?: string
  options?: {
    style?: 'detailed' | 'concise' | 'technical'
    length?: 'short' | 'medium' | 'long'
  }
}

export const POST = requireAuth(async (_request: NextRequest, user) => {
  
  try {
    const body = await _request.json() as GenerateRequest
    
    // リクエストデータを検証
    const validatedData = generateRequestSchema.parse(body)
    
    componentLogger.info('記事生成リクエスト受信', {
      userId: user.userId,
      newsId: validatedData.newsId,
      options: validatedData.options
    })

    // モックジョブを作成
    const jobId = createMockJob(validatedData.newsId, user.userId)

    componentLogger.info('記事生成ジョブを追加', {
      jobId,
      userId: user.userId,
      newsId: validatedData.newsId
    })

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: 'queued',
        message: '記事生成を開始しました。生成には数分かかる場合があります。',
        estimatedTime: '2-5分',
        checkStatusUrl: `/api/jobs/${jobId}/status`
      }
    })

  } catch (error) {
    componentLogger.error('記事生成リクエストエラー', error as Error, {
      userId: user.userId
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

      return NextResponse.json(
        formatApiError(new AppError('記事生成の開始に失敗しました', {
          type: ErrorType.PROCESSING_ERROR,
          code: 'GENERATION_START_FAILED',
          statusCode: 500
        })),
        { status: 500 }
      )
    }
})