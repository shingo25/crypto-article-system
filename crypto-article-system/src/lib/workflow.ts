import { createComponentLogger } from './simple-logger'
import { AppError, ErrorType } from './error-handler'
// import { redisCache } from './redis' // クライアント側では使用しない

const componentLogger = createComponentLogger('WorkflowManager')

// ワークフロータイプ
export enum WorkflowType {
  ARTICLE_APPROVAL = 'article_approval',
  TOPIC_APPROVAL = 'topic_approval',
  TEMPLATE_APPROVAL = 'template_approval',
  SYSTEM_SETTING_APPROVAL = 'system_setting_approval',
  USER_REGISTRATION_APPROVAL = 'user_registration_approval'
}

// ワークフロー状態
export enum WorkflowStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

// 承認者のロール
export enum ApproverRole {
  CONTENT_REVIEWER = 'content_reviewer',
  EDITOR = 'editor',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// 承認アクション
export enum ApprovalAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_CHANGES = 'request_changes',
  DELEGATE = 'delegate'
}

// ワークフロー設定
export interface WorkflowConfig {
  id: string
  type: WorkflowType
  name: string
  description: string
  steps: WorkflowStep[]
  autoApprovalRules?: AutoApprovalRule[]
  timeoutHours?: number
  escalationConfig?: EscalationConfig
  enabled: boolean
  createdAt: string
  updatedAt: string
}

// ワークフローステップ
export interface WorkflowStep {
  id: string
  order: number
  name: string
  description?: string
  requiredApprovers: number
  allowedRoles: ApproverRole[]
  isParallel: boolean
  isOptional: boolean
  timeoutHours?: number
  conditions?: StepCondition[]
}

// ステップ条件
export interface StepCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex'
  value: any
}

// 自動承認ルール
export interface AutoApprovalRule {
  id: string
  name: string
  conditions: StepCondition[]
  skipSteps?: string[]
  autoApprove: boolean
}

// エスカレーション設定
export interface EscalationConfig {
  enabled: boolean
  timeoutHours: number
  escalateTo: ApproverRole[]
  notificationTemplate: string
}

// ワークフローインスタンス
export interface WorkflowInstance {
  id: string
  workflowConfigId: string
  type: WorkflowType
  status: WorkflowStatus
  resourceType: string
  resourceId: string
  resourceData: any
  submittedBy: string
  submittedAt: string
  currentStep?: string
  completedSteps: string[]
  approvals: Approval[]
  comments: Comment[]
  metadata: Record<string, any>
  dueDate?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

// 承認レコード
export interface Approval {
  id: string
  stepId: string
  approverId: string
  action: ApprovalAction
  comment?: string
  attachments?: string[]
  approvedAt: string
  delegatedTo?: string
}

// コメント
export interface Comment {
  id: string
  authorId: string
  content: string
  isInternal: boolean
  attachments?: string[]
  createdAt: string
}

// ワークフロー通知
export interface WorkflowNotification {
  type: 'assignment' | 'reminder' | 'escalation' | 'completion' | 'rejection'
  recipientId: string
  workflowInstanceId: string
  subject: string
  message: string
  data: Record<string, any>
}

// ワークフロー管理クラス
export class WorkflowManager {
  private static instance: WorkflowManager

  public static getInstance(): WorkflowManager {
    if (!WorkflowManager.instance) {
      WorkflowManager.instance = new WorkflowManager()
    }
    return WorkflowManager.instance
  }

  // ワークフローを開始
  public async startWorkflow(
    workflowType: WorkflowType,
    resourceType: string,
    resourceId: string,
    resourceData: any,
    submittedBy: string,
    metadata: Record<string, any> = {}
  ): Promise<WorkflowInstance> {
    try {
      componentLogger.info('ワークフローを開始', {
        workflowType,
        resourceType,
        resourceId,
        submittedBy
      })

      // ワークフロー設定を取得
      const config = await this.getWorkflowConfig(workflowType)
      if (!config || !config.enabled) {
        throw new AppError('Workflow not found or disabled', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'WORKFLOW_NOT_FOUND',
          statusCode: 404,
          context: { workflowType }
        })
      }

      // 自動承認ルールをチェック
      const autoApprovalResult = await this.checkAutoApprovalRules(config, resourceData)
      
      const workflowInstance: WorkflowInstance = {
        id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflowConfigId: config.id,
        type: workflowType,
        status: autoApprovalResult.autoApprove ? WorkflowStatus.APPROVED : WorkflowStatus.PENDING,
        resourceType,
        resourceId,
        resourceData,
        submittedBy,
        submittedAt: new Date().toISOString(),
        currentStep: autoApprovalResult.autoApprove ? undefined : config.steps[0]?.id,
        completedSteps: autoApprovalResult.skipSteps || [],
        approvals: [],
        comments: [],
        metadata,
        dueDate: config.timeoutHours ? 
          new Date(Date.now() + config.timeoutHours * 60 * 60 * 1000).toISOString() : 
          undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // データベースに保存
      await this.saveWorkflowInstance(workflowInstance)

      if (autoApprovalResult.autoApprove) {
        componentLogger.business('ワークフロー自動承認', {
          workflowInstanceId: workflowInstance.id,
          workflowType,
          rule: autoApprovalResult.ruleName
        })
        
        await this.completeWorkflow(workflowInstance.id, 'System auto-approval')
      } else {
        // 最初のステップの承認者に通知
        await this.notifyApprovers(workflowInstance, config.steps[0])
      }

      componentLogger.business('ワークフロー開始完了', {
        workflowInstanceId: workflowInstance.id,
        workflowType,
        status: workflowInstance.status
      })

      return workflowInstance
    } catch (error) {
      componentLogger.error('ワークフロー開始に失敗', error as Error, {
        workflowType,
        resourceType,
        resourceId
      })
      throw error
    }
  }

  // 承認/却下アクション
  public async processApproval(
    workflowInstanceId: string,
    approverId: string,
    action: ApprovalAction,
    comment?: string,
    attachments?: string[]
  ): Promise<WorkflowInstance> {
    try {
      componentLogger.info('承認アクションを処理', {
        workflowInstanceId,
        approverId,
        action
      })

      const workflowInstance = await this.getWorkflowInstance(workflowInstanceId)
      if (!workflowInstance) {
        throw new AppError('Workflow instance not found', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'WORKFLOW_NOT_FOUND',
          statusCode: 404
        })
      }

      if (workflowInstance.status !== WorkflowStatus.PENDING && 
          workflowInstance.status !== WorkflowStatus.IN_REVIEW) {
        throw new AppError('Workflow is not in pending state', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'INVALID_WORKFLOW_STATE',
          statusCode: 400,
          context: { currentStatus: workflowInstance.status }
        })
      }

      const config = await this.getWorkflowConfig(workflowInstance.type)
      if (!config) {
        throw new AppError('Workflow config not found', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'WORKFLOW_CONFIG_NOT_FOUND',
          statusCode: 404
        })
      }

      const currentStep = config.steps.find(step => step.id === workflowInstance.currentStep)
      if (!currentStep) {
        throw new AppError('Current step not found', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'STEP_NOT_FOUND',
          statusCode: 404
        })
      }

      // 承認者の権限チェック
      await this.validateApprover(approverId, currentStep)

      // 承認レコードを追加
      const approval: Approval = {
        id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        stepId: currentStep.id,
        approverId,
        action,
        comment,
        attachments,
        approvedAt: new Date().toISOString()
      }

      workflowInstance.approvals.push(approval)
      workflowInstance.status = WorkflowStatus.IN_REVIEW
      workflowInstance.updatedAt = new Date().toISOString()

      // アクションに応じて処理
      switch (action) {
        case ApprovalAction.APPROVE:
          await this.handleApproval(workflowInstance, config, currentStep)
          break
        case ApprovalAction.REJECT:
          await this.handleRejection(workflowInstance, comment)
          break
        case ApprovalAction.REQUEST_CHANGES:
          await this.handleChangeRequest(workflowInstance, comment)
          break
        case ApprovalAction.DELEGATE:
          await this.handleDelegation(workflowInstance, approval, attachments?.[0])
          break
      }

      // 更新を保存
      await this.saveWorkflowInstance(workflowInstance)

      componentLogger.business('承認アクション完了', {
        workflowInstanceId,
        approverId,
        action,
        newStatus: workflowInstance.status
      })

      return workflowInstance
    } catch (error) {
      componentLogger.error('承認アクション処理に失敗', error as Error, {
        workflowInstanceId,
        approverId,
        action
      })
      throw error
    }
  }

  // 承認処理
  private async handleApproval(
    workflowInstance: WorkflowInstance,
    config: WorkflowConfig,
    currentStep: WorkflowStep
  ): Promise<void> {
    // 必要な承認数をチェック
    const stepApprovals = workflowInstance.approvals.filter(
      approval => approval.stepId === currentStep.id && approval.action === ApprovalAction.APPROVE
    )

    if (stepApprovals.length >= currentStep.requiredApprovers) {
      // ステップ完了
      workflowInstance.completedSteps.push(currentStep.id)
      
      // 次のステップを確認
      const nextStep = this.getNextStep(config.steps, currentStep)
      
      if (nextStep) {
        // 次のステップに進む
        workflowInstance.currentStep = nextStep.id
        workflowInstance.status = WorkflowStatus.PENDING
        
        // 次のステップの承認者に通知
        await this.notifyApprovers(workflowInstance, nextStep)
      } else {
        // 全ステップ完了
        await this.completeWorkflow(workflowInstance.id, 'All approvals completed')
      }
    }
  }

  // 却下処理
  private async handleRejection(workflowInstance: WorkflowInstance, comment?: string): Promise<void> {
    workflowInstance.status = WorkflowStatus.REJECTED
    workflowInstance.completedAt = new Date().toISOString()
    
    // 申請者に通知
    await this.sendNotification({
      type: 'rejection',
      recipientId: workflowInstance.submittedBy,
      workflowInstanceId: workflowInstance.id,
      subject: 'ワークフローが却下されました',
      message: comment || 'ワークフローが却下されました。',
      data: { workflowInstance }
    })
  }

  // 変更要求処理
  private async handleChangeRequest(workflowInstance: WorkflowInstance, comment?: string): Promise<void> {
    workflowInstance.status = WorkflowStatus.PENDING
    
    // 申請者に通知
    await this.sendNotification({
      type: 'assignment',
      recipientId: workflowInstance.submittedBy,
      workflowInstanceId: workflowInstance.id,
      subject: '変更要求が発生しました',
      message: comment || '変更が必要です。修正後、再度申請してください。',
      data: { workflowInstance }
    })
  }

  // 委任処理
  private async handleDelegation(
    workflowInstance: WorkflowInstance,
    approval: Approval,
    delegatedTo?: string
  ): Promise<void> {
    if (!delegatedTo) {
      throw new AppError('Delegation target required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'DELEGATION_TARGET_REQUIRED',
        statusCode: 400
      })
    }

    approval.delegatedTo = delegatedTo
    
    // 委任先に通知
    await this.sendNotification({
      type: 'assignment',
      recipientId: delegatedTo,
      workflowInstanceId: workflowInstance.id,
      subject: 'ワークフローが委任されました',
      message: `${approval.approverId}からワークフローが委任されました。`,
      data: { workflowInstance, delegatedFrom: approval.approverId }
    })
  }

  // ワークフロー完了
  private async completeWorkflow(workflowInstanceId: string, reason: string): Promise<void> {
    const workflowInstance = await this.getWorkflowInstance(workflowInstanceId)
    if (!workflowInstance) return

    workflowInstance.status = WorkflowStatus.APPROVED
    workflowInstance.completedAt = new Date().toISOString()

    // リソースに承認済みフラグを設定
    await this.markResourceAsApproved(workflowInstance.resourceType, workflowInstance.resourceId)

    // 申請者に完了通知
    await this.sendNotification({
      type: 'completion',
      recipientId: workflowInstance.submittedBy,
      workflowInstanceId: workflowInstance.id,
      subject: 'ワークフローが承認されました',
      message: 'ワークフローの承認が完了しました。',
      data: { workflowInstance, reason }
    })

    await this.saveWorkflowInstance(workflowInstance)
  }

  // 自動承認ルールのチェック
  private async checkAutoApprovalRules(
    config: WorkflowConfig,
    resourceData: any
  ): Promise<{ autoApprove: boolean; skipSteps?: string[]; ruleName?: string }> {
    if (!config.autoApprovalRules) {
      return { autoApprove: false }
    }

    for (const rule of config.autoApprovalRules) {
      if (await this.evaluateConditions(rule.conditions, resourceData)) {
        return {
          autoApprove: rule.autoApprove,
          skipSteps: rule.skipSteps,
          ruleName: rule.name
        }
      }
    }

    return { autoApprove: false }
  }

  // 条件の評価
  private async evaluateConditions(conditions: StepCondition[], data: any): Promise<boolean> {
    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(data, condition.field)
      
      switch (condition.operator) {
        case 'equals':
          if (fieldValue !== condition.value) return false
          break
        case 'not_equals':
          if (fieldValue === condition.value) return false
          break
        case 'greater_than':
          if (fieldValue <= condition.value) return false
          break
        case 'less_than':
          if (fieldValue >= condition.value) return false
          break
        case 'contains':
          if (!String(fieldValue).includes(condition.value)) return false
          break
        case 'regex':
          if (!new RegExp(condition.value).test(String(fieldValue))) return false
          break
      }
    }
    return true
  }

  // ネストされた値の取得
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // 次のステップを取得
  private getNextStep(steps: WorkflowStep[], currentStep: WorkflowStep): WorkflowStep | undefined {
    const currentOrder = currentStep.order
    return steps
      .filter(step => step.order > currentOrder)
      .sort((a, b) => a.order - b.order)[0]
  }

  // 承認者に通知
  private async notifyApprovers(workflowInstance: WorkflowInstance, step: WorkflowStep): Promise<void> {
    const approvers = await this.getEligibleApprovers(step)
    
    for (const approverId of approvers) {
      await this.sendNotification({
        type: 'assignment',
        recipientId: approverId,
        workflowInstanceId: workflowInstance.id,
        subject: '承認が必要なワークフローがあります',
        message: `${step.name}の承認をお願いします。`,
        data: { workflowInstance, step }
      })
    }
  }

  // 承認者を取得
  private async getEligibleApprovers(step: WorkflowStep): Promise<string[]> {
    // 実際の実装では、ユーザーデータベースからロールに基づいて承認者を取得
    // ここでは仮の実装
    const approvers: string[] = []
    
    // ロールに基づいて承認者を検索
    for (const role of step.allowedRoles) {
      const roleApprovers = await this.getUsersByRole(role)
      approvers.push(...roleApprovers)
    }
    
    return [...new Set(approvers)] // 重複を除去
  }

  // ロール別ユーザー取得
  private async getUsersByRole(role: ApproverRole): Promise<string[]> {
    // 実際の実装では、データベースクエリを実行
    // ここでは仮の実装
    const roleUsers: Record<ApproverRole, string[]> = {
      [ApproverRole.CONTENT_REVIEWER]: ['reviewer1', 'reviewer2'],
      [ApproverRole.EDITOR]: ['editor1', 'editor2'],
      [ApproverRole.ADMIN]: ['admin1'],
      [ApproverRole.SUPER_ADMIN]: ['superadmin1']
    }
    
    return roleUsers[role] || []
  }

  // 承認者権限の検証
  private async validateApprover(approverId: string, step: WorkflowStep): Promise<void> {
    const eligibleApprovers = await this.getEligibleApprovers(step)
    
    if (!eligibleApprovers.includes(approverId)) {
      throw new AppError('User not authorized to approve this step', {
        type: ErrorType.AUTHORIZATION_ERROR,
        code: 'UNAUTHORIZED_APPROVER',
        statusCode: 403,
        context: { approverId, stepId: step.id }
      })
    }
  }

  // リソースを承認済みとしてマーク
  private async markResourceAsApproved(resourceType: string, resourceId: string): Promise<void> {
    // 実際の実装では、該当するリソースのステータスを更新
    componentLogger.info('リソースを承認済みにマーク', { resourceType, resourceId })
  }

  // 通知送信
  private async sendNotification(notification: WorkflowNotification): Promise<void> {
    // 実際の実装では、メール、Slack、プッシュ通知等を送信
    componentLogger.info('ワークフロー通知を送信', {
      type: notification.type,
      recipientId: notification.recipientId,
      subject: notification.subject
    })
    
    // 通知をキューに追加（メール送信ジョブ等）
    // await addJob('email-notifications', 'send_email', {
    //   to: [notification.recipientId],
    //   subject: notification.subject,
    //   template: 'workflow_notification',
    //   data: notification.data
    // })
  }

  // ワークフロー設定を取得
  private async getWorkflowConfig(type: WorkflowType): Promise<WorkflowConfig | null> {
    const cacheKey = `workflow_config:${type}`
    // キャッシュ機能は一時的に無効化
    // const cached = await redisCache.get<WorkflowConfig>(cacheKey)
    // 
    // if (cached) {
    //   return cached
    // }

    // 実際の実装では、データベースから取得
    // ここでは仮の設定を返す
    const defaultConfigs: Record<WorkflowType, WorkflowConfig> = {
      [WorkflowType.ARTICLE_APPROVAL]: {
        id: 'article_approval_config',
        type: WorkflowType.ARTICLE_APPROVAL,
        name: '記事承認ワークフロー',
        description: '記事の公開前承認プロセス',
        steps: [
          {
            id: 'content_review',
            order: 1,
            name: 'コンテンツレビュー',
            requiredApprovers: 1,
            allowedRoles: [ApproverRole.CONTENT_REVIEWER, ApproverRole.EDITOR],
            isParallel: false,
            isOptional: false
          },
          {
            id: 'final_approval',
            order: 2,
            name: '最終承認',
            requiredApprovers: 1,
            allowedRoles: [ApproverRole.ADMIN],
            isParallel: false,
            isOptional: false
          }
        ],
        autoApprovalRules: [
          {
            id: 'auto_approve_low_risk',
            name: '低リスク記事の自動承認',
            conditions: [
              { field: 'word_count', operator: 'less_than', value: 500 },
              { field: 'category', operator: 'equals', value: 'news' }
            ],
            autoApprove: true
          }
        ],
        timeoutHours: 48,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      [WorkflowType.TOPIC_APPROVAL]: {
        id: 'topic_approval_config',
        type: WorkflowType.TOPIC_APPROVAL,
        name: 'トピック承認ワークフロー',
        description: 'トピックの記事化前承認プロセス',
        steps: [
          {
            id: 'topic_review',
            order: 1,
            name: 'トピックレビュー',
            requiredApprovers: 1,
            allowedRoles: [ApproverRole.EDITOR],
            isParallel: false,
            isOptional: false
          }
        ],
        timeoutHours: 24,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      [WorkflowType.TEMPLATE_APPROVAL]: {
        id: 'template_approval_config',
        type: WorkflowType.TEMPLATE_APPROVAL,
        name: 'テンプレート承認ワークフロー',
        description: '記事テンプレートの承認プロセス',
        steps: [
          {
            id: 'template_review',
            order: 1,
            name: 'テンプレートレビュー',
            requiredApprovers: 1,
            allowedRoles: [ApproverRole.ADMIN],
            isParallel: false,
            isOptional: false
          }
        ],
        timeoutHours: 72,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      [WorkflowType.SYSTEM_SETTING_APPROVAL]: {
        id: 'system_setting_approval_config',
        type: WorkflowType.SYSTEM_SETTING_APPROVAL,
        name: 'システム設定承認ワークフロー',
        description: 'システム設定変更の承認プロセス',
        steps: [
          {
            id: 'setting_review',
            order: 1,
            name: '設定変更レビュー',
            requiredApprovers: 2,
            allowedRoles: [ApproverRole.SUPER_ADMIN],
            isParallel: false,
            isOptional: false
          }
        ],
        timeoutHours: 24,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      [WorkflowType.USER_REGISTRATION_APPROVAL]: {
        id: 'user_registration_approval_config',
        type: WorkflowType.USER_REGISTRATION_APPROVAL,
        name: 'ユーザー登録承認ワークフロー',
        description: '新規ユーザー登録の承認プロセス',
        steps: [
          {
            id: 'user_review',
            order: 1,
            name: 'ユーザー審査',
            requiredApprovers: 1,
            allowedRoles: [ApproverRole.ADMIN],
            isParallel: false,
            isOptional: false
          }
        ],
        timeoutHours: 48,
        enabled: false, // デフォルトでは無効
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }

    const config = defaultConfigs[type]
    // if (config) {
    //   await redisCache.set(cacheKey, config, 3600) // 1時間キャッシュ
    // }

    return config || null
  }

  // ワークフローインスタンスを取得
  private async getWorkflowInstance(id: string): Promise<WorkflowInstance | null> {
    const cacheKey = `workflow_instance:${id}`
    // const cached = await redisCache.get<WorkflowInstance>(cacheKey)
    // 
    // if (cached) {
    //   return cached
    // }

    // 実際の実装では、データベースから取得
    // ここでは null を返す（実装が必要）
    return null
  }

  // ワークフローインスタンスを保存
  private async saveWorkflowInstance(instance: WorkflowInstance): Promise<void> {
    const cacheKey = `workflow_instance:${instance.id}`
    // await redisCache.set(cacheKey, instance, 86400) // 24時間キャッシュ
    
    // 実際の実装では、データベースにも保存
    componentLogger.debug('ワークフローインスタンスを保存', { instanceId: instance.id })
  }

  // ワークフロー統計を取得
  public async getWorkflowStats(timeRange: '1d' | '7d' | '30d' = '7d'): Promise<{
    total: number
    pending: number
    approved: number
    rejected: number
    byType: Record<WorkflowType, number>
    avgApprovalTime: number
  }> {
    // 実際の実装では、データベースから集計
    // ここでは仮のデータを返す
    return {
      total: 150,
      pending: 12,
      approved: 128,
      rejected: 10,
      byType: {
        [WorkflowType.ARTICLE_APPROVAL]: 120,
        [WorkflowType.TOPIC_APPROVAL]: 20,
        [WorkflowType.TEMPLATE_APPROVAL]: 5,
        [WorkflowType.SYSTEM_SETTING_APPROVAL]: 3,
        [WorkflowType.USER_REGISTRATION_APPROVAL]: 2
      },
      avgApprovalTime: 18.5 // 時間
    }
  }
}

// シングルトンインスタンス
export const workflowManager = WorkflowManager.getInstance()

// コンビニエンス関数
export const startWorkflow = (
  type: WorkflowType,
  resourceType: string,
  resourceId: string,
  resourceData: any,
  submittedBy: string,
  metadata?: Record<string, any>
) => workflowManager.startWorkflow(type, resourceType, resourceId, resourceData, submittedBy, metadata)

export const processApproval = (
  workflowInstanceId: string,
  approverId: string,
  action: ApprovalAction,
  comment?: string,
  attachments?: string[]
) => workflowManager.processApproval(workflowInstanceId, approverId, action, comment, attachments)