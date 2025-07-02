// Simple client-side compatible logger
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

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

class SimpleLogger {
  private logLevel: LogLevel = LogLevel.INFO

  constructor(level: LogLevel = LogLevel.INFO) {
    this.logLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG]
    return levels.indexOf(level) <= levels.indexOf(this.logLevel)
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = error ? { ...context, error: error.message, stack: error.stack } : context
      console.error(this.formatMessage(LogLevel.ERROR, message, errorContext))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, context))
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context))
    }
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation}`, { ...context, duration: `${duration}ms` })
  }

  business(event: string, context?: LogContext): void {
    this.info(`Business: ${event}`, context)
  }

  apiRequest(method: string, url: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${url}`, context)
  }

  apiResponse(method: string, url: string, status: number, duration: number, context?: LogContext): void {
    this.info(`API Response: ${method} ${url} ${status}`, { ...context, duration: `${duration}ms` })
  }
}

// Component logger factory
export function createComponentLogger(component: string): SimpleLogger {
  const logger = new SimpleLogger()
  return {
    error: (message: string, error?: Error, context?: LogContext) => 
      logger.error(message, error, { ...context, component }),
    warn: (message: string, context?: LogContext) => 
      logger.warn(message, { ...context, component }),
    info: (message: string, context?: LogContext) => 
      logger.info(message, { ...context, component }),
    debug: (message: string, context?: LogContext) => 
      logger.debug(message, { ...context, component }),
    performance: (operation: string, duration: number, context?: LogContext) => 
      logger.performance(operation, duration, { ...context, component }),
    business: (event: string, context?: LogContext) => 
      logger.business(event, { ...context, component }),
    apiRequest: (method: string, url: string, context?: LogContext) => 
      logger.apiRequest(method, url, { ...context, component }),
    apiResponse: (method: string, url: string, status: number, duration: number, context?: LogContext) => 
      logger.apiResponse(method, url, status, duration, { ...context, component })
  }
}

// Global logger instance
export const logger = new SimpleLogger()

// Request logger factory
export function createRequestLogger(request: any): LogContext {
  return {
    requestId: Math.random().toString(36).substring(2, 15),
    userAgent: request.headers?.['user-agent'],
    ip: request.ip || request.headers?.['x-forwarded-for'] || 'unknown'
  }
}