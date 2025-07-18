import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { simpleQueueManager } from '@/lib/queue-simple'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'
import { createComponentLogger } from '@/lib/simple-logger'
import { getMockJob } from '@/lib/mock-job-system'
import { prisma } from '@/lib/prisma'

const componentLogger = createComponentLogger('JobStatusAPI')

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // 一時的に認証を無効化してテスト
  const testUserId = 'test-user-id'
  
  try {
    const jobId = params.jobId
    
    if (!jobId) {
      return NextResponse.json(
        formatApiError(new AppError('ジョブIDが必要です', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'MISSING_JOB_ID',
          statusCode: 400
        })),
        { status: 400 }
      )
    }

    componentLogger.info('ジョブステータス確認', {
      jobId,
      userId: testUserId
    })

      // モックジョブの状態を取得
      const mockJob = getMockJob(jobId)
      
      if (!mockJob) {
        return NextResponse.json(
          formatApiError(new AppError('ジョブが見つかりません', {
            type: ErrorType.NOT_FOUND,
            code: 'JOB_NOT_FOUND',
            statusCode: 404,
            context: { jobId }
          })),
          { status: 404 }
        )
      }

      // レスポンスを構築
      const response = {
        jobId: mockJob.id,
        status: mockJob.status,
        createdAt: mockJob.createdAt,
        processedAt: mockJob.processedAt,
        error: mockJob.error,
        data: {
          newsId: mockJob.newsId,
          options: {}
        },
        ...(mockJob.article && { article: mockJob.article })
      }

      return NextResponse.json({
        success: true,
        data: {
          ...response,
          message: mockJob.message || getDefaultMessage(mockJob.status),
          progress: mockJob.progress || getJobProgress(mockJob.status),
          estimatedRemainingTime: getEstimatedTime(mockJob.status, mockJob.createdAt)
        }
      })

  } catch (error) {
    componentLogger.error('ジョブステータス確認エラー', error as Error, {
      jobId: params.jobId,
      userId: testUserId
    })

    return NextResponse.json(
      formatApiError(new AppError('ジョブステータスの確認に失敗しました', {
        type: ErrorType.PROCESSING_ERROR,
        code: 'STATUS_CHECK_FAILED',
        statusCode: 500
      })),
      { status: 500 }
    )
  }
}

// デフォルトメッセージを取得
function getDefaultMessage(status: string): string {
  const statusMessages = {
    pending: '記事生成を開始しています...',
    processing: 'AI が記事を生成中です...',
    completed: '記事生成が完了しました！',
    failed: '記事生成に失敗しました。'
  }
  return statusMessages[status as keyof typeof statusMessages] || '処理中...'
}

// ジョブの進捗率を計算
function getJobProgress(status: string): number {
  switch (status) {
    case 'pending':
      return 10
    case 'processing':
      return 60
    case 'completed':
      return 100
    case 'failed':
      return 0
    default:
      return 0
  }
}

// 残り時間の推定
function getEstimatedTime(status: string, createdAt: string): string {
  if (status === 'completed' || status === 'failed') {
    return '0分'
  }

  const elapsed = Date.now() - new Date(createdAt).getTime()
  const elapsedMinutes = Math.floor(elapsed / 60000)

  switch (status) {
    case 'pending':
      return '2-5分'
    case 'processing':
      // 平均3分として、経過時間から推定
      const remaining = Math.max(1, 3 - elapsedMinutes)
      return `${remaining}分`
    default:
      return '不明'
  }
}