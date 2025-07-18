import { NextRequest, NextResponse } from 'next/server'
import { simpleQueueManager as queueManager, JobType } from '@/lib/queue'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('QueueAPI')

// キューの統計情報を取得
export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    componentLogger.info('キュー統計情報を取得中')
    
    const searchParams = request.nextUrl.searchParams
    const queueName = searchParams.get('queue')
    
    // 簡易版では全体の統計のみ
    const stats = queueManager.getStats()
    
    componentLogger.performance('キュー統計取得', Date.now() - startTime, {
      queueName,
      stats
    })
    
    return NextResponse.json({
      success: true,
      queue: queueName || 'all',
      stats
    })

  } catch (error) {
    componentLogger.error('キュー統計取得に失敗', error as Error, {
      duration: Date.now() - startTime
    })
    
    const appError = new AppError('Failed to get queue stats', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'キューの統計情報取得に失敗しました'
    })
    
    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// ジョブを追加
export async function POST(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { queueName, jobType, data, options } = body
    
    // バリデーション
    if (!jobType || !data) {
      throw new AppError('Missing required fields', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_FIELDS',
        statusCode: 400,
        userMessage: 'jobType, dataは必須です'
      })
    }
    
    // ジョブタイプの検証
    if (!Object.values(JobType).includes(jobType)) {
      throw new AppError('Invalid job type', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'INVALID_JOB_TYPE',
        statusCode: 400,
        userMessage: '無効なジョブタイプです',
        context: { jobType, validTypes: Object.values(JobType) }
      })
    }
    
    componentLogger.info('ジョブを追加中', {
      queueName,
      jobType,
      options
    })
    
    // ジョブを追加
    const jobId = await queueManager.addJob(jobType, data)
    
    componentLogger.business('ジョブ追加完了', {
      queueName,
      jobType,
      jobId,
      priority: options?.priority,
      delay: options?.delay,
      duration: Date.now() - startTime
    })
    
    return NextResponse.json({
      success: true,
      job: {
        id: jobId,
        type: jobType,
        data,
        status: 'pending',
        queueName
      }
    })
    
  } catch (error) {
    componentLogger.error('ジョブ追加に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to add job', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'ジョブの追加に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// キュー管理操作
export async function PATCH(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { action, queueName, jobId } = body
    
    componentLogger.info('キュー管理操作を実行中', {
      action,
      queueName,
      jobId
    })
    
    // 簡易版では管理機能は未実装
    throw new AppError('Queue management not implemented', {
      type: ErrorType.SYSTEM_ERROR,
      code: 'NOT_IMPLEMENTED',
      statusCode: 501,
      userMessage: 'この機能は実装されていません',
      context: { action, queueName }
    })

  } catch (error) {
    componentLogger.error('キュー管理操作に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to execute queue operation', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'キュー操作の実行に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// 特定のジョブを削除
export async function DELETE(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const queueName = searchParams.get('queue')
    const jobId = searchParams.get('jobId')
    
    if (!queueName || !jobId) {
      throw new AppError('Queue name and job ID required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_PARAMETERS',
        statusCode: 400,
        userMessage: 'キュー名とジョブIDが必要です'
      })
    }

    componentLogger.info('ジョブを削除中', { queueName, jobId })
    
    // 簡易版では削除機能は未実装
    throw new AppError('Job deletion not implemented', {
      type: ErrorType.SYSTEM_ERROR,
      code: 'NOT_IMPLEMENTED',
      statusCode: 501,
      userMessage: 'この機能は実装されていません'
    })

  } catch (error) {
    componentLogger.error('ジョブ削除に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to delete job', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'ジョブの削除に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}