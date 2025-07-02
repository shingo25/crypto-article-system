// 簡易版キューマネージャー（Redisなし）
import { createComponentLogger } from './simple-logger'
import { AppError, ErrorType } from './error-handler'

const componentLogger = createComponentLogger('SimpleQueueManager')

// ジョブのタイプ定義
export enum JobType {
  GENERATE_ARTICLE = 'generate_article',
  PUBLISH_ARTICLE = 'publish_article',
  COLLECT_TOPICS = 'collect_topics',
  FACT_CHECK = 'fact_check',
  SEND_EMAIL = 'send_email',
  CLEANUP_FILES = 'cleanup_files',
  PROCESS_WEBHOOK = 'process_webhook',
  GENERATE_RSS = 'generate_rss',
  UPDATE_PRICES = 'update_prices'
}

// 簡易ジョブ定義
export interface SimpleJob {
  id: string
  type: JobType
  data: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  processedAt?: string
  error?: string
}

// 簡易キューマネージャー
export class SimpleQueueManager {
  private static instance: SimpleQueueManager
  private jobs: Map<string, SimpleJob> = new Map()
  private processors: Map<JobType, (data: any) => Promise<any>> = new Map()

  public static getInstance(): SimpleQueueManager {
    if (!SimpleQueueManager.instance) {
      SimpleQueueManager.instance = new SimpleQueueManager()
    }
    return SimpleQueueManager.instance
  }

  // ジョブを追加
  public async addJob(type: JobType, data: any): Promise<string> {
    const jobId = Math.random().toString(36).substring(2, 15)
    const job: SimpleJob = {
      id: jobId,
      type,
      data,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    this.jobs.set(jobId, job)
    componentLogger.info('ジョブを追加', { jobId, type })

    // 即座に処理を開始（非同期）
    this.processJob(jobId).catch(error => {
      componentLogger.error('ジョブ処理に失敗', error)
    })

    return jobId
  }

  // プロセッサを登録
  public registerProcessor(type: JobType, processor: (data: any) => Promise<any>): void {
    this.processors.set(type, processor)
    componentLogger.info('プロセッサを登録', { type })
  }

  // ジョブを処理
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) return

    const processor = this.processors.get(job.type)
    if (!processor) {
      job.status = 'failed'
      job.error = 'プロセッサが見つかりません'
      return
    }

    try {
      job.status = 'processing'
      job.processedAt = new Date().toISOString()
      
      await processor(job.data)
      
      job.status = 'completed'
      componentLogger.info('ジョブ処理完了', { jobId: job.id, type: job.type })
    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : '不明なエラー'
      componentLogger.error('ジョブ処理エラー', error as Error, { jobId: job.id })
    }
  }

  // ジョブ状態を取得
  public getJob(jobId: string): SimpleJob | undefined {
    return this.jobs.get(jobId)
  }

  // 全ジョブを取得
  public getAllJobs(): SimpleJob[] {
    return Array.from(this.jobs.values())
  }

  // 統計情報を取得
  public getStats(): {
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
  } {
    const jobs = Array.from(this.jobs.values())
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length
    }
  }
}

// シングルトンインスタンス
export const simpleQueueManager = SimpleQueueManager.getInstance()