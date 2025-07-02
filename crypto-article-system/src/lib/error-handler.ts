import { logger, LogContext } from './simple-logger'
import { z } from 'zod'
import { NextResponse } from 'next/server'
// import * as Sentry from '@sentry/nextjs'

// エラータイプの定義
export enum ErrorType {
  API_ERROR = 'api_error',
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  DATABASE_ERROR = 'database_error',
  EXTERNAL_SERVICE_ERROR = 'external_service_error',
  BUSINESS_LOGIC_ERROR = 'business_logic_error',
  SYSTEM_ERROR = 'system_error'
}

export interface ErrorDetails {
  type: ErrorType
  code?: string
  statusCode?: number
  retryable?: boolean
  userMessage?: string
  context?: LogContext
}

export class AppError extends Error {
  public readonly type: ErrorType
  public readonly code?: string
  public readonly statusCode: number
  public readonly retryable: boolean
  public readonly userMessage: string
  public readonly context: LogContext

  constructor(
    message: string,
    details: ErrorDetails
  ) {
    super(message)
    this.name = 'AppError'
    this.type = details.type
    this.code = details.code
    this.statusCode = details.statusCode || 500
    this.retryable = details.retryable || false
    this.userMessage = details.userMessage || 'システムエラーが発生しました'
    this.context = details.context || {}

    // スタックトレースを保持
    Error.captureStackTrace(this, AppError)
  }

  // Sentryレポート用のメタデータ
  public getSentryContext() {
    return {
      tags: {
        errorType: this.type,
        errorCode: this.code,
        retryable: this.retryable.toString()
      },
      extra: {
        statusCode: this.statusCode,
        userMessage: this.userMessage,
        context: this.context
      }
    }
  }
}

// 事前定義されたエラー
export class ValidationError extends AppError {
  constructor(message: string, field?: string, context?: LogContext) {
    super(message, {
      type: ErrorType.VALIDATION_ERROR,
      code: 'VALIDATION_FAILED',
      statusCode: 400,
      userMessage: `入力エラー: ${message}`,
      context: { ...context, field }
    })
  }
}

export class ZodValidationError extends AppError {
  constructor(zodError: z.ZodError, context?: LogContext) {
    const fieldErrors = zodError.errors.map(error => ({
      field: error.path.join('.'),
      message: error.message,
      code: error.code
    }))

    super('Validation failed', {
      type: ErrorType.VALIDATION_ERROR,
      code: 'ZOD_VALIDATION_FAILED',
      statusCode: 400,
      userMessage: '入力データに不正な値が含まれています',
      context: { ...context, fieldErrors, totalErrors: zodError.errors.length }
    })
  }

  static fromZodError(error: z.ZodError, context?: LogContext): ZodValidationError {
    return new ZodValidationError(error, context)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: LogContext) {
    super(message, {
      type: ErrorType.AUTHENTICATION_ERROR,
      code: 'AUTH_FAILED',
      statusCode: 401,
      userMessage: '認証に失敗しました',
      context
    })
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', resource?: string, context?: LogContext) {
    super(message, {
      type: ErrorType.AUTHORIZATION_ERROR,
      code: 'ACCESS_DENIED',
      statusCode: 403,
      userMessage: 'アクセス権限がありません',
      context: { ...context, resource }
    })
  }
}

export class RateLimitError extends AppError {
  constructor(limit: number, window: string, context?: LogContext) {
    super(`Rate limit exceeded: ${limit} requests per ${window}`, {
      type: ErrorType.RATE_LIMIT_ERROR,
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      retryable: true,
      userMessage: 'リクエスト制限に達しました。しばらく待ってから再試行してください',
      context: { ...context, limit, window }
    })
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, operation: string, context?: LogContext) {
    super(message, {
      type: ErrorType.DATABASE_ERROR,
      code: 'DATABASE_ERROR',
      statusCode: 500,
      retryable: true,
      userMessage: 'データベースエラーが発生しました',
      context: { ...context, operation }
    })
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, statusCode?: number, context?: LogContext) {
    super(`External service error from ${service}: ${message}`, {
      type: ErrorType.EXTERNAL_SERVICE_ERROR,
      code: 'EXTERNAL_SERVICE_ERROR',
      statusCode: statusCode || 502,
      retryable: true,
      userMessage: '外部サービスとの通信でエラーが発生しました',
      context: { ...context, service, externalStatusCode: statusCode }
    })
  }
}

// グローバルエラーハンドラー
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler

  public static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler()
    }
    return GlobalErrorHandler.instance
  }

  // エラーをログに記録
  public logError(error: Error | AppError, context?: LogContext): void {
    const enrichedContext = {
      ...context,
      timestamp: new Date().toISOString(),
      pid: process.pid
    }

    if (error instanceof AppError) {
      // アプリケーション定義エラー
      logger.error(
        `${error.type}: ${error.message}`,
        error,
        {
          ...enrichedContext,
          ...error.context,
          errorType: error.type,
          errorCode: error.code,
          statusCode: error.statusCode,
          retryable: error.retryable
        }
      )

      // Sentryにレポート（必要に応じて）
      if (error.statusCode >= 500) {
        // Sentry.withScope((scope) => {
        //   const sentryContext = error.getSentryContext()
        //   Object.entries(sentryContext.tags).forEach(([key, value]) => {
        //     scope.setTag(key, value)
        //   })
        //   Object.entries(sentryContext.extra).forEach(([key, value]) => {
        //     scope.setExtra(key, value)
        //   })
        //   scope.setLevel('error')
        //   Sentry.captureException(error)
        // })
      }
    } else {
      // 一般的なエラー
      logger.error('Unhandled error occurred', error, enrichedContext)
      
      // Sentry.withScope((scope) => {
      //   Object.entries(enrichedContext).forEach(([key, value]) => {
      //     scope.setTag(key, String(value))
      //   })
      //   scope.setLevel('error')
      //   Sentry.captureException(error)
      // })
    }
  }

  // API レスポンス用のエラーフォーマット
  public formatErrorResponse(error: Error | AppError) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: {
          type: error.type,
          code: error.code,
          message: error.userMessage,
          retryable: error.retryable
        },
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            originalMessage: error.message,
            stack: error.stack,
            context: error.context
          }
        })
      }
    }

    // 一般的なエラーの場合は詳細を隠す
    return {
      success: false,
      error: {
        type: ErrorType.SYSTEM_ERROR,
        message: 'システムエラーが発生しました',
        retryable: false
      },
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          originalMessage: error.message,
          stack: error.stack
        }
      })
    }
  }

  // 未処理例外・未処理Promise拒否のハンドラー設定
  public setupGlobalHandlers(): void {
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error: Error) => {
        logger.error('Uncaught Exception', error, {
          type: 'uncaught_exception',
          fatal: true
        })
        
        // アプリケーションを安全に終了
        setTimeout(() => {
          process.exit(1)
        }, 1000)
      })

      process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
        const error = reason instanceof Error ? reason : new Error(String(reason))
        logger.error('Unhandled Promise Rejection', error, {
          type: 'unhandled_rejection',
          promise: promise.toString()
        })
      })
    }

    // ブラウザ環境での未処理エラー
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        logger.error('Uncaught Error', event.error, {
          type: 'uncaught_browser_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        })
      })

      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
        logger.error('Unhandled Promise Rejection', error, {
          type: 'unhandled_browser_rejection'
        })
      })
    }
  }
}

// シングルトンインスタンス
export const globalErrorHandler = GlobalErrorHandler.getInstance()

// コンビニエンス関数
export const handleError = (error: Error | AppError, context?: LogContext) => {
  globalErrorHandler.logError(error, context)
}

export const formatApiError = (error: Error | AppError) => {
  return globalErrorHandler.formatErrorResponse(error)
}

// 統一されたAPIエラーレスポンス生成関数
export function createErrorResponse(error: unknown, context?: LogContext): NextResponse {
  let appError: AppError

  // エラーの種類に応じて適切なAppErrorに変換
  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof z.ZodError) {
    appError = ZodValidationError.fromZodError(error, context)
  } else if (error instanceof Error) {
    appError = new AppError(error.message, {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'システムエラーが発生しました',
      context
    })
  } else {
    appError = new AppError('Unknown error occurred', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: '予期しないエラーが発生しました',
      context
    })
  }

  // エラーをログに記録
  globalErrorHandler.logError(appError, context)

  // 統一されたレスポンス形式で返す
  const errorResponse = globalErrorHandler.formatErrorResponse(appError)
  
  return NextResponse.json(errorResponse, { 
    status: appError.statusCode,
    headers: {
      'Content-Type': 'application/json',
    }
  })
}

// エラー回復用のユーティリティ
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000,
  context?: LogContext
): Promise<T> => {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (error instanceof AppError && !error.retryable) {
        throw error
      }

      if (attempt === maxRetries) {
        logger.error('Max retries exceeded', lastError, {
          ...context,
          attempt,
          maxRetries
        })
        throw lastError
      }

      const delay = backoffMs * Math.pow(2, attempt - 1)
      logger.warn(`Operation failed, retrying in ${delay}ms`, {
        ...context,
        attempt,
        maxRetries,
        error: lastError.message
      })

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Circuit Breaker パターンの実装
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private name: string = 'unknown'
  ) {}

  async execute<T>(operation: () => Promise<T>, context?: LogContext): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new AppError('Circuit breaker is open', {
          type: ErrorType.SYSTEM_ERROR,
          code: 'CIRCUIT_BREAKER_OPEN',
          statusCode: 503,
          retryable: true,
          userMessage: 'サービスが一時的に利用できません',
          context: { ...context, circuitBreaker: this.name }
        })
      } else {
        this.state = 'half-open'
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.threshold) {
      this.state = 'open'
      logger.warn('Circuit breaker opened', {
        circuitBreaker: this.name,
        failures: this.failures,
        threshold: this.threshold
      })
    }
  }

  public getState(): { state: string, failures: number } {
    return {
      state: this.state,
      failures: this.failures
    }
  }
}

// 初期化関数
export const initializeErrorHandling = () => {
  globalErrorHandler.setupGlobalHandlers()
  logger.info('Error handling initialized')
}