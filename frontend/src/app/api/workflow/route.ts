import { NextRequest, NextResponse } from 'next/server'
import { 
  workflowManager, 
  WorkflowType, 
  ApprovalAction,
  WorkflowStatus 
} from '@/lib/workflow'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('WorkflowAPI')

// ワークフロー一覧取得
export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as WorkflowStatus
    const type = searchParams.get('type') as WorkflowType
    const submittedBy = searchParams.get('submittedBy')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    componentLogger.info('ワークフロー一覧を取得中', {
      status,
      type,
      submittedBy,
      page,
      limit
    })

    // 実際の実装では、データベースからフィルタリングして取得
    // ここでは仮のデータを返す
    const workflows = await getMockWorkflows(status, type, submittedBy, page, limit)
    const total = await getMockWorkflowCount(status, type, submittedBy)

    componentLogger.performance('ワークフロー一覧取得', Date.now() - startTime, {
      count: workflows.length,
      total,
      page,
      limit
    })

    return NextResponse.json({
      success: true,
      data: workflows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    componentLogger.error('ワークフロー一覧取得に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    const appError = new AppError('Failed to get workflows', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'ワークフローの取得に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// ワークフロー開始
export async function POST(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { 
      type, 
      resourceType, 
      resourceId, 
      resourceData, 
      submittedBy, 
      metadata = {} 
    } = body

    // バリデーション
    if (!type || !resourceType || !resourceId || !resourceData || !submittedBy) {
      throw new AppError('Missing required fields', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_FIELDS',
        statusCode: 400,
        userMessage: '必須フィールドが不足しています'
      })
    }

    if (!Object.values(WorkflowType).includes(type)) {
      throw new AppError('Invalid workflow type', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'INVALID_WORKFLOW_TYPE',
        statusCode: 400,
        userMessage: '無効なワークフロータイプです'
      })
    }

    componentLogger.info('ワークフローを開始', {
      type,
      resourceType,
      resourceId,
      submittedBy
    })

    const workflowInstance = await workflowManager.startWorkflow(
      type,
      resourceType,
      resourceId,
      resourceData,
      submittedBy,
      metadata
    )

    componentLogger.business('ワークフロー開始完了', {
      workflowInstanceId: workflowInstance.id,
      type,
      status: workflowInstance.status,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: workflowInstance
    })

  } catch (error) {
    componentLogger.error('ワークフロー開始に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to start workflow', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'ワークフローの開始に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// ワークフロー承認/却下
export async function PATCH(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { 
      workflowInstanceId, 
      approverId, 
      action, 
      comment, 
      attachments 
    } = body

    // バリデーション
    if (!workflowInstanceId || !approverId || !action) {
      throw new AppError('Missing required fields', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_FIELDS',
        statusCode: 400,
        userMessage: 'workflowInstanceId, approverId, actionは必須です'
      })
    }

    if (!Object.values(ApprovalAction).includes(action)) {
      throw new AppError('Invalid approval action', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'INVALID_ACTION',
        statusCode: 400,
        userMessage: '無効なアクションです'
      })
    }

    componentLogger.info('承認アクションを処理', {
      workflowInstanceId,
      approverId,
      action
    })

    const updatedWorkflow = await workflowManager.processApproval(
      workflowInstanceId,
      approverId,
      action,
      comment,
      attachments
    )

    componentLogger.business('承認アクション完了', {
      workflowInstanceId,
      approverId,
      action,
      newStatus: updatedWorkflow.status,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: updatedWorkflow
    })

  } catch (error) {
    componentLogger.error('承認アクション処理に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to process approval', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: '承認処理に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// ワークフロー削除/キャンセル
export async function DELETE(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const workflowInstanceId = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!workflowInstanceId || !userId) {
      throw new AppError('Missing required parameters', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_PARAMETERS',
        statusCode: 400,
        userMessage: 'idとuserIdは必須です'
      })
    }

    componentLogger.info('ワークフローをキャンセル', {
      workflowInstanceId,
      userId
    })

    // 実際の実装では、ワークフローをキャンセル状態に更新
    // ここでは仮の処理
    const result = await cancelWorkflow(workflowInstanceId, userId)

    componentLogger.business('ワークフローキャンセル完了', {
      workflowInstanceId,
      userId,
      duration: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      message: 'Workflow cancelled successfully'
    })

  } catch (error) {
    componentLogger.error('ワークフローキャンセルに失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to cancel workflow', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'ワークフローのキャンセルに失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// ヘルパー関数（実際の実装では、データベースアクセス層に移動）

async function getMockWorkflows(
  status?: WorkflowStatus,
  type?: WorkflowType,
  submittedBy?: string,
  page: number = 1,
  limit: number = 20
) {
  // 仮のワークフローデータ
  const allWorkflows = [
    {
      id: 'workflow_1',
      type: WorkflowType.ARTICLE_APPROVAL,
      status: WorkflowStatus.PENDING,
      resourceType: 'article',
      resourceId: 'article_123',
      submittedBy: 'user_1',
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      currentStep: 'content_review',
      metadata: {
        title: 'Bitcoin価格分析レポート',
        priority: 'high'
      }
    },
    {
      id: 'workflow_2',
      type: WorkflowType.ARTICLE_APPROVAL,
      status: WorkflowStatus.APPROVED,
      resourceType: 'article',
      resourceId: 'article_124',
      submittedBy: 'user_2',
      submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      metadata: {
        title: 'Ethereum 2.0 アップデート',
        priority: 'medium'
      }
    },
    {
      id: 'workflow_3',
      type: WorkflowType.TOPIC_APPROVAL,
      status: WorkflowStatus.IN_REVIEW,
      resourceType: 'topic',
      resourceId: 'topic_456',
      submittedBy: 'user_1',
      submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      currentStep: 'topic_review',
      metadata: {
        title: 'DeFi新興プロトコル分析',
        priority: 'low'
      }
    }
  ]

  // フィルタリング
  let filteredWorkflows = allWorkflows

  if (status) {
    filteredWorkflows = filteredWorkflows.filter(w => w.status === status)
  }

  if (type) {
    filteredWorkflows = filteredWorkflows.filter(w => w.type === type)
  }

  if (submittedBy) {
    filteredWorkflows = filteredWorkflows.filter(w => w.submittedBy === submittedBy)
  }

  // ページネーション
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit

  return filteredWorkflows.slice(startIndex, endIndex)
}

async function getMockWorkflowCount(
  status?: WorkflowStatus,
  type?: WorkflowType,
  submittedBy?: string
): Promise<number> {
  const workflows = await getMockWorkflows(status, type, submittedBy, 1, 1000)
  return workflows.length
}

async function cancelWorkflow(workflowInstanceId: string, userId: string): Promise<boolean> {
  // 実際の実装では、以下を行う：
  // 1. ワークフローインスタンスの存在確認
  // 2. ユーザーの権限確認（申請者または管理者のみキャンセル可能）
  // 3. ワークフローの状態確認（PENDING または IN_REVIEW のみキャンセル可能）
  // 4. ステータスを CANCELLED に更新
  // 5. 関係者に通知

  componentLogger.info('ワークフローキャンセル処理', {
    workflowInstanceId,
    userId
  })

  return true
}