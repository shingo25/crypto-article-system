import { NextRequest } from 'next/server'
import { createComponentLogger } from './simple-logger'
import { AppError, ErrorType } from './error-handler'
// import { redisRateLimit } from './redis' // サーバーサイドのみで使用

const componentLogger = createComponentLogger('ExternalAPI')

// API キー管理
export interface APIKey {
  id: string
  name: string
  key: string
  permissions: APIPermission[]
  rateLimit: RateLimit
  isActive: boolean
  expiresAt?: string
  lastUsedAt?: string
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

// API 権限
export enum APIPermission {
  // 記事関連
  ARTICLES_READ = 'articles:read',
  ARTICLES_CREATE = 'articles:create',
  ARTICLES_UPDATE = 'articles:update',
  ARTICLES_DELETE = 'articles:delete',
  
  // トピック関連
  TOPICS_READ = 'topics:read',
  TOPICS_CREATE = 'topics:create',
  TOPICS_UPDATE = 'topics:update',
  TOPICS_DELETE = 'topics:delete',
  
  // RSS関連
  RSS_READ = 'rss:read',
  RSS_MANAGE = 'rss:manage',
  
  // 統計・分析
  ANALYTICS_READ = 'analytics:read',
  
  // システム管理
  SYSTEM_READ = 'system:read',
  SYSTEM_WRITE = 'system:write',
  
  // ワークフロー
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_SUBMIT = 'workflow:submit',
  WORKFLOW_APPROVE = 'workflow:approve',
  
  // キュー管理
  QUEUE_READ = 'queue:read',
  QUEUE_MANAGE = 'queue:manage'
}

// レート制限設定
export interface RateLimit {
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number
  burstLimit?: number
}

// API レスポンス形式
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    version: string
    rateLimit?: {
      remaining: number
      resetTime: number
    }
    pagination?: {
      page: number
      limit: number
      total: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
}

// ページネーション設定
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// フィルタリング設定
export interface FilterParams {
  status?: string[]
  category?: string[]
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  search?: string
}

// 外部API管理クラス
export class ExternalAPIManager {
  private static instance: ExternalAPIManager

  public static getInstance(): ExternalAPIManager {
    if (!ExternalAPIManager.instance) {
      ExternalAPIManager.instance = new ExternalAPIManager()
    }
    return ExternalAPIManager.instance
  }

  // APIキー認証
  public async authenticateAPIKey(request: NextRequest): Promise<{
    apiKey: APIKey
    rateLimitResult: {
      allowed: boolean
      remaining: number
      resetTime: number
    }
  }> {
    const apiKeyHeader = request.headers.get('X-API-Key') || 
                        request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!apiKeyHeader) {
      throw new AppError('API key required', {
        type: ErrorType.AUTHENTICATION_ERROR,
        code: 'MISSING_API_KEY',
        statusCode: 401,
        userMessage: 'APIキーが必要です'
      })
    }

    // APIキーの検証
    const apiKey = await this.validateAPIKey(apiKeyHeader)
    if (!apiKey) {
      throw new AppError('Invalid API key', {
        type: ErrorType.AUTHENTICATION_ERROR,
        code: 'INVALID_API_KEY',
        statusCode: 401,
        userMessage: '無効なAPIキーです'
      })
    }

    if (!apiKey.isActive) {
      throw new AppError('API key is disabled', {
        type: ErrorType.AUTHENTICATION_ERROR,
        code: 'DISABLED_API_KEY',
        statusCode: 401,
        userMessage: 'APIキーが無効化されています'
      })
    }

    // 有効期限チェック
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      throw new AppError('API key expired', {
        type: ErrorType.AUTHENTICATION_ERROR,
        code: 'EXPIRED_API_KEY',
        statusCode: 401,
        userMessage: 'APIキーの有効期限が切れています'
      })
    }

    // レート制限チェック
    const rateLimitResult = await this.checkRateLimit(apiKey, request)
    
    // 最終使用日時を更新
    await this.updateLastUsed(apiKey.id)

    componentLogger.info('API認証成功', {
      apiKeyId: apiKey.id,
      apiKeyName: apiKey.name,
      clientIp: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    })

    return { apiKey, rateLimitResult }
  }

  // 権限チェック
  public hasPermission(apiKey: APIKey, permission: APIPermission): boolean {
    return apiKey.permissions.includes(permission)
  }

  // リソース権限チェック
  public async checkResourcePermission(
    apiKey: APIKey,
    action: string,
    resourceType: string,
    resourceId?: string
  ): Promise<boolean> {
    const permissionMap: Record<string, APIPermission[]> = {
      'articles:read': [APIPermission.ARTICLES_READ],
      'articles:create': [APIPermission.ARTICLES_CREATE],
      'articles:update': [APIPermission.ARTICLES_UPDATE],
      'articles:delete': [APIPermission.ARTICLES_DELETE],
      'topics:read': [APIPermission.TOPICS_READ],
      'topics:create': [APIPermission.TOPICS_CREATE],
      'topics:update': [APIPermission.TOPICS_UPDATE],
      'topics:delete': [APIPermission.TOPICS_DELETE],
      'rss:read': [APIPermission.RSS_READ],
      'rss:manage': [APIPermission.RSS_MANAGE],
      'analytics:read': [APIPermission.ANALYTICS_READ],
      'system:read': [APIPermission.SYSTEM_READ],
      'system:write': [APIPermission.SYSTEM_WRITE],
      'workflow:read': [APIPermission.WORKFLOW_READ],
      'workflow:submit': [APIPermission.WORKFLOW_SUBMIT],
      'workflow:approve': [APIPermission.WORKFLOW_APPROVE],
      'queue:read': [APIPermission.QUEUE_READ],
      'queue:manage': [APIPermission.QUEUE_MANAGE]
    }

    const requiredPermissions = permissionMap[`${resourceType}:${action}`]
    if (!requiredPermissions) {
      return false
    }

    return requiredPermissions.some(permission => 
      apiKey.permissions.includes(permission)
    )
  }

  // APIレスポンス生成
  public createResponse<T>(
    data: T,
    options: {
      success?: boolean
      meta?: Partial<APIResponse['meta']>
      pagination?: PaginationParams & { total: number }
      rateLimit?: { remaining: number; resetTime: number }
    } = {}
  ): APIResponse<T> {
    const response: APIResponse<T> = {
      success: options.success !== false,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        ...options.meta
      }
    }

    // ページネーション情報
    if (options.pagination) {
      const { page, limit, total } = options.pagination
      response.meta!.pagination = {
        page,
        limit,
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }

    // レート制限情報
    if (options.rateLimit) {
      response.meta!.rateLimit = options.rateLimit
    }

    return response
  }

  // エラーレスポンス生成
  public createErrorResponse(
    error: AppError | Error,
    rateLimit?: { remaining: number; resetTime: number }
  ): APIResponse {
    const response: APIResponse = {
      success: false,
      error: {
        code: error instanceof AppError ? error.code || 'UNKNOWN_ERROR' : 'INTERNAL_ERROR',
        message: error instanceof AppError ? error.userMessage : 'Internal server error'
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    }

    if (rateLimit) {
      response.meta!.rateLimit = rateLimit
    }

    // 開発環境では詳細なエラー情報を含める
    if (process.env.NODE_ENV === 'development') {
      response.error!.details = {
        originalMessage: error.message,
        stack: error.stack
      }
    }

    return response
  }

  // ページネーション解析
  public parsePaginationParams(request: NextRequest): PaginationParams {
    const searchParams = request.nextUrl.searchParams
    
    return {
      page: Math.max(1, parseInt(searchParams.get('page') || '1')),
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20'))),
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    }
  }

  // フィルタ解析
  public parseFilterParams(request: NextRequest): FilterParams {
    const searchParams = request.nextUrl.searchParams
    
    return {
      status: searchParams.get('status')?.split(','),
      category: searchParams.get('category')?.split(','),
      tags: searchParams.get('tags')?.split(','),
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      search: searchParams.get('search') || undefined
    }
  }

  // APIキー生成
  public async generateAPIKey(config: {
    name: string
    permissions: APIPermission[]
    rateLimit: RateLimit
    expiresAt?: string
    metadata?: Record<string, any>
  }): Promise<APIKey> {
    const apiKey: APIKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      key: this.generateRandomKey(),
      permissions: config.permissions,
      rateLimit: config.rateLimit,
      isActive: true,
      expiresAt: config.expiresAt,
      metadata: config.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // データベースに保存
    await this.saveAPIKey(apiKey)

    componentLogger.business('APIキー生成', {
      apiKeyId: apiKey.id,
      name: config.name,
      permissions: config.permissions
    })

    return apiKey
  }

  // プライベートメソッド

  private async validateAPIKey(key: string): Promise<APIKey | null> {
    // 実際の実装では、データベースからAPIキーを検索
    // ここでは仮の実装
    const mockAPIKeys: APIKey[] = [
      {
        id: 'key_1',
        name: 'Development Key',
        key: 'dev_key_12345',
        permissions: [
          APIPermission.ARTICLES_READ,
          APIPermission.TOPICS_READ,
          APIPermission.ANALYTICS_READ
        ],
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000
        },
        isActive: true,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    return mockAPIKeys.find(apiKey => apiKey.key === key) || null
  }

  private async checkRateLimit(
    apiKey: APIKey,
    request: NextRequest
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    // クライアントサイドでは使用しない
    throw new Error('このメソッドはサーバーサイドでのみ使用できます')
    
    /*
    const clientId = `api_key:${apiKey.id}`
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    
    // 分単位のレート制限
    const minuteResult = await redisRateLimit.checkLimit(
      `${clientId}:minute`,
      apiKey.rateLimit.requestsPerMinute,
      60
    )

    if (!minuteResult.allowed) {
      componentLogger.warn('APIレート制限（分）に達しました', {
        apiKeyId: apiKey.id,
        clientIp,
        limit: apiKey.rateLimit.requestsPerMinute
      })
      
      throw new AppError('Rate limit exceeded (per minute)', {
        type: ErrorType.RATE_LIMIT_ERROR,
        code: 'RATE_LIMIT_MINUTE',
        statusCode: 429,
        userMessage: '分あたりのリクエスト制限に達しました',
        context: {
          limit: apiKey.rateLimit.requestsPerMinute,
          resetTime: minuteResult.resetTime
        }
      })
    }

    // 時間単位のレート制限
    const hourResult = await redisRateLimit.checkLimit(
      `${clientId}:hour`,
      apiKey.rateLimit.requestsPerHour,
      3600
    )

    if (!hourResult.allowed) {
      componentLogger.warn('APIレート制限（時間）に達しました', {
        apiKeyId: apiKey.id,
        clientIp,
        limit: apiKey.rateLimit.requestsPerHour
      })

      throw new AppError('Rate limit exceeded (per hour)', {
        type: ErrorType.RATE_LIMIT_ERROR,
        code: 'RATE_LIMIT_HOUR',
        statusCode: 429,
        userMessage: '時間あたりのリクエスト制限に達しました',
        context: {
          limit: apiKey.rateLimit.requestsPerHour,
          resetTime: hourResult.resetTime
        }
      })
    }

    // 日単位のレート制限
    const dayResult = await redisRateLimit.checkLimit(
      `${clientId}:day`,
      apiKey.rateLimit.requestsPerDay,
      86400
    )

    if (!dayResult.allowed) {
      componentLogger.warn('APIレート制限（日）に達しました', {
        apiKeyId: apiKey.id,
        clientIp,
        limit: apiKey.rateLimit.requestsPerDay
      })

      throw new AppError('Rate limit exceeded (per day)', {
        type: ErrorType.RATE_LIMIT_ERROR,
        code: 'RATE_LIMIT_DAY',
        statusCode: 429,
        userMessage: '日あたりのリクエスト制限に達しました',
        context: {
          limit: apiKey.rateLimit.requestsPerDay,
          resetTime: dayResult.resetTime
        }
      })
    }

    return {
      allowed: true,
      remaining: Math.min(minuteResult.remaining, hourResult.remaining, dayResult.remaining),
      resetTime: Math.min(minuteResult.resetTime, hourResult.resetTime, dayResult.resetTime)
    }
    */
  }

  private generateRandomKey(): string {
    const prefix = 'crypto_'
    const randomPart = Array.from({ length: 32 }, () => 
      Math.random().toString(36).charAt(2)
    ).join('')
    
    return prefix + randomPart
  }

  private async saveAPIKey(apiKey: APIKey): Promise<void> {
    // 実際の実装では、データベースに保存
    componentLogger.debug('APIキーを保存', { apiKeyId: apiKey.id })
  }

  private async updateLastUsed(apiKeyId: string): Promise<void> {
    // 実際の実装では、データベースの最終使用日時を更新
    componentLogger.debug('APIキー最終使用日時を更新', { apiKeyId })
  }

  // API使用統計を取得
  public async getAPIUsageStats(
    apiKeyId?: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<{
    totalRequests: number
    successfulRequests: number
    errorRequests: number
    avgResponseTime: number
    topEndpoints: Array<{ endpoint: string; count: number }>
    rateLimitHits: number
  }> {
    // 実際の実装では、ログデータから統計を集計
    // ここでは仮のデータを返す
    return {
      totalRequests: 1250,
      successfulRequests: 1180,
      errorRequests: 70,
      avgResponseTime: 145, // ms
      topEndpoints: [
        { endpoint: '/api/v1/articles', count: 480 },
        { endpoint: '/api/v1/topics', count: 320 },
        { endpoint: '/api/v1/analytics', count: 280 },
        { endpoint: '/api/v1/rss', count: 170 }
      ],
      rateLimitHits: 15
    }
  }
}

// シングルトンインスタンス
export const externalAPIManager = ExternalAPIManager.getInstance()

// ミドルウェア用のヘルパー関数
export const withAPIAuth = (
  handler: (
    request: NextRequest,
    context: { apiKey: APIKey; rateLimitResult: any }
  ) => Promise<Response>
) => {
  return async (request: NextRequest) => {
    try {
      const authResult = await externalAPIManager.authenticateAPIKey(request)
      return await handler(request, authResult)
    } catch (error) {
      componentLogger.error('API認証エラー', error as Error)
      
      const errorResponse = externalAPIManager.createErrorResponse(error as AppError)
      return new Response(JSON.stringify(errorResponse), {
        status: error instanceof AppError ? error.statusCode : 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}

// 権限チェック用のヘルパー
export const requirePermissions = (permissions: APIPermission[]) => {
  return (apiKey: APIKey) => {
    for (const permission of permissions) {
      if (!externalAPIManager.hasPermission(apiKey, permission)) {
        throw new AppError('Insufficient permissions', {
          type: ErrorType.AUTHORIZATION_ERROR,
          code: 'INSUFFICIENT_PERMISSIONS',
          statusCode: 403,
          userMessage: '権限が不足しています',
          context: { requiredPermissions: permissions }
        })
      }
    }
  }
}