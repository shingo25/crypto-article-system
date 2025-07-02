// Client-side compatible logger
import winston from 'winston'
// import * as Sentry from '@sentry/nextjs'

// ログレベルの定義
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// ログコンテキストの型定義
export interface LogContext {
  userId?: string
  sessionId?: string
  requestId?: string
  userAgent?: string
  ip?: string
  component?: string
  operation?: string
  duration?: number
  [key: string]: any
}

// カスタムログフォーマッター
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    }
    
    if (stack) {
      logEntry.stack = stack
    }
    
    return JSON.stringify(logEntry)
  })
)

// Winston ロガーの設定
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'crypto-article-system',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // コンソール出力
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // ファイル出力（エラーログ）
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // ファイル出力（すべてのログ）
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  // 未処理の例外をキャッチ
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  // 未処理のPromise rejectionをキャッチ
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
})

// 構造化ロガークラス
export class StructuredLogger {
  private static instance: StructuredLogger
  private winston: winston.Logger
  private defaultContext: LogContext = {}

  private constructor() {
    this.winston = winstonLogger
    
    // Sentry初期化 (無効化)
    // if (process.env.SENTRY_DSN) {
    //   Sentry.init({
    //     dsn: process.env.SENTRY_DSN,
    //     environment: process.env.NODE_ENV || 'development',
    //     tracesSampleRate: 1.0,
    //     integrations: [
    //       new Sentry.Integrations.Http({ tracing: true }),
    //     ]
    //   })
    // }
  }

  public static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger()
    }
    return StructuredLogger.instance
  }

  // デフォルトコンテキストを設定
  public setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context }
  }

  // 情報ログ
  public info(message: string, context: LogContext = {}): void {
    const enrichedContext = this.enrichContext(context)
    this.winston.info(message, enrichedContext)
    
    // Sentryにブレッドクラムを追加 (無効化)
    // Sentry.addBreadcrumb({
    //   message,
    //   level: 'info',
    //   data: enrichedContext
    // })
  }

  // 警告ログ
  public warn(message: string, context: LogContext = {}): void {
    const enrichedContext = this.enrichContext(context)
    this.winston.warn(message, enrichedContext)
    
    // Sentry.addBreadcrumb({
    //   message,
    //   level: 'warning',
    //   data: enrichedContext
    // })
  }

  // エラーログ
  public error(message: string, error?: Error, context: LogContext = {}): void {
    const enrichedContext = this.enrichContext(context)
    
    if (error) {
      enrichedContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
      
      // Sentryにエラーを送信 (無効化)
      // Sentry.withScope((scope) => {
      //   Object.entries(enrichedContext).forEach(([key, value]) => {
      //     scope.setTag(key, String(value))
      //   })
      //   scope.setLevel('error')
      //   Sentry.captureException(error)
      // })
    }
    
    this.winston.error(message, enrichedContext)
  }

  // デバッグログ
  public debug(message: string, context: LogContext = {}): void {
    const enrichedContext = this.enrichContext(context)
    this.winston.debug(message, enrichedContext)
  }

  // APIリクエストログ
  public apiRequest(method: string, url: string, context: LogContext = {}): void {
    this.info(`API Request: ${method} ${url}`, {
      ...context,
      type: 'api_request',
      method,
      url
    })
  }

  // APIレスポンスログ
  public apiResponse(
    method: string, 
    url: string, 
    statusCode: number, 
    duration: number, 
    context: LogContext = {}
  ): void {
    const level = statusCode >= 400 ? 'warn' : 'info'
    const message = `API Response: ${method} ${url} ${statusCode} (${duration}ms)`
    
    const logContext = {
      ...context,
      type: 'api_response',
      method,
      url,
      statusCode,
      duration
    }

    if (level === 'warn') {
      this.warn(message, logContext)
    } else {
      this.info(message, logContext)
    }
  }

  // ビジネスロジックログ
  public business(event: string, context: LogContext = {}): void {
    this.info(`Business Event: ${event}`, {
      ...context,
      type: 'business_event',
      event
    })
  }

  // セキュリティログ
  public security(event: string, context: LogContext = {}): void {
    this.warn(`Security Event: ${event}`, {
      ...context,
      type: 'security_event',
      event
    })
    
    // セキュリティイベントはSentryに即座に送信 (無効化)
    // Sentry.withScope((scope) => {
    //   scope.setLevel('warning')
    //   scope.setTag('type', 'security')
    //   scope.setTag('event', event)
    //   Object.entries(context).forEach(([key, value]) => {
    //     scope.setTag(key, String(value))
    //   })
    //   Sentry.captureMessage(`Security Event: ${event}`)
    // })
  }

  // パフォーマンスログ
  public performance(operation: string, duration: number, context: LogContext = {}): void {
    const level = duration > 5000 ? 'warn' : 'info'
    const message = `Performance: ${operation} took ${duration}ms`
    
    const logContext = {
      ...context,
      type: 'performance',
      operation,
      duration
    }

    if (level === 'warn') {
      this.warn(message, logContext)
    } else {
      this.info(message, logContext)
    }
  }

  // コンテキストを補強
  private enrichContext(context: LogContext): LogContext {
    return {
      ...this.defaultContext,
      ...context,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'localhost'
    }
  }

  // ログ検索・フィルタリング用のメソッド
  public async searchLogs(filters: {
    level?: LogLevel
    component?: string
    startTime?: Date
    endTime?: Date
    limit?: number
  }): Promise<any[]> {
    // 実際の実装では、ログストレージ（Elasticsearch、MongoDB等）から検索
    // ここではファイルベースの簡易実装
    const logs: any[] = []
    
    try {
      const fs = require('fs')
      const path = require('path')
      const logFile = path.join(process.cwd(), 'logs/combined.log')
      
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf8')
        const lines = content.split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const logEntry = JSON.parse(line)
            
            // フィルタリング
            if (filters.level && logEntry.level !== filters.level) continue
            if (filters.component && logEntry.component !== filters.component) continue
            if (filters.startTime && new Date(logEntry.timestamp) < filters.startTime) continue
            if (filters.endTime && new Date(logEntry.timestamp) > filters.endTime) continue
            
            logs.push(logEntry)
          } catch (parseError) {
            // JSON解析エラーは無視
          }
        }
      }
    } catch (error) {
      this.error('Failed to search logs', error as Error)
    }
    
    // 最新から順にソートし、制限数を適用
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, filters.limit || 100)
  }

  // ログ統計取得
  public async getLogStats(timeRange: '1h' | '24h' | '7d' | '30d'): Promise<{
    totalLogs: number
    errorCount: number
    warnCount: number
    infoCount: number
    debugCount: number
    topComponents: Array<{ component: string, count: number }>
    topErrors: Array<{ message: string, count: number }>
  }> {
    const endTime = new Date()
    const startTime = new Date()
    
    switch (timeRange) {
      case '1h':
        startTime.setHours(endTime.getHours() - 1)
        break
      case '24h':
        startTime.setDate(endTime.getDate() - 1)
        break
      case '7d':
        startTime.setDate(endTime.getDate() - 7)
        break
      case '30d':
        startTime.setDate(endTime.getDate() - 30)
        break
    }
    
    const logs = await this.searchLogs({ startTime, endTime, limit: 10000 })
    
    const stats = {
      totalLogs: logs.length,
      errorCount: logs.filter(log => log.level === 'error').length,
      warnCount: logs.filter(log => log.level === 'warn').length,
      infoCount: logs.filter(log => log.level === 'info').length,
      debugCount: logs.filter(log => log.level === 'debug').length,
      topComponents: [] as Array<{ component: string, count: number }>,
      topErrors: [] as Array<{ message: string, count: number }>
    }
    
    // コンポーネント別集計
    const componentCounts: Record<string, number> = {}
    const errorCounts: Record<string, number> = {}
    
    logs.forEach(log => {
      if (log.component) {
        componentCounts[log.component] = (componentCounts[log.component] || 0) + 1
      }
      
      if (log.level === 'error') {
        errorCounts[log.message] = (errorCounts[log.message] || 0) + 1
      }
    })
    
    stats.topComponents = Object.entries(componentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([component, count]) => ({ component, count }))
    
    stats.topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }))
    
    return stats
  }
}

// シングルトンインスタンスをエクスポート
export const logger = StructuredLogger.getInstance()

// ミドルウェア用のログヘルパー
export const createRequestLogger = (req: any) => {
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7)
  const context: LogContext = {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
  }
  
  logger.setDefaultContext(context)
  return context
}

// パフォーマンス測定デコレータ
export const withPerformanceLogging = (operation: string) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      
      try {
        const result = await method.apply(this, args)
        const duration = Date.now() - startTime
        
        logger.performance(operation, duration, {
          component: target.constructor.name,
          method: propertyName
        })
        
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        
        logger.error(`${operation} failed after ${duration}ms`, error as Error, {
          component: target.constructor.name,
          method: propertyName
        })
        
        throw error
      }
    }
  }
}

// エラーハンドリングユーティリティ
export const handleError = (error: Error, context: LogContext = {}) => {
  logger.error('Unhandled error occurred', error, context)
  
  // 開発環境ではコンソールにも出力
  if (process.env.NODE_ENV === 'development') {
    console.error('Unhandled error:', error)
  }
}

// 型安全なロガーファクトリー
export const createComponentLogger = (componentName: string) => {
  return {
    info: (message: string, context: LogContext = {}) => 
      logger.info(message, { ...context, component: componentName }),
    warn: (message: string, context: LogContext = {}) => 
      logger.warn(message, { ...context, component: componentName }),
    error: (message: string, error?: Error, context: LogContext = {}) => 
      logger.error(message, error, { ...context, component: componentName }),
    debug: (message: string, context: LogContext = {}) => 
      logger.debug(message, { ...context, component: componentName }),
    business: (event: string, context: LogContext = {}) => 
      logger.business(event, { ...context, component: componentName }),
    security: (event: string, context: LogContext = {}) => 
      logger.security(event, { ...context, component: componentName }),
    performance: (operation: string, duration: number, context: LogContext = {}) => 
      logger.performance(operation, duration, { ...context, component: componentName })
  }
}