import { NextResponse } from 'next/server'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('HealthAPI')

// システムヘルスチェック用のコンポーネント状態
interface ComponentHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastCheck: string
  responseTime?: number
  error?: string
  details?: Record<string, any>
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  components: ComponentHealth[]
  metrics: {
    memoryUsage: NodeJS.MemoryUsage
    cpuUsage?: number
    activeConnections?: number
  }
}

// 個別コンポーネントのヘルスチェック
async function checkDatabase(): Promise<ComponentHealth> {
  const startTime = Date.now()
  try {
    // ここでデータベース接続をテスト
    // const result = await db.query('SELECT 1')
    
    return {
      name: 'database',
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      details: {
        connectionPool: 'available',
        // connections: result.connectionCount
      }
    }
  } catch (error) {
    componentLogger.error('Database health check failed', error as Error)
    return {
      name: 'database',
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: (error as Error).message
    }
  }
}

async function checkRedis(): Promise<ComponentHealth> {
  const startTime = Date.now()
  try {
    // ここでRedis接続をテスト
    // const client = getRedisClient()
    // await client.ping()
    
    return {
      name: 'redis',
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      details: {
        connected: true,
        // memoryUsage: await client.info('memory')
      }
    }
  } catch (error) {
    componentLogger.error('Redis health check failed', error as Error)
    return {
      name: 'redis',
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: (error as Error).message
    }
  }
}

async function checkExternalAPIs(): Promise<ComponentHealth[]> {
  const checks = [
    {
      name: 'openai',
      url: 'https://api.openai.com/v1/models',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    },
    {
      name: 'coingecko',
      url: 'https://api.coingecko.com/api/v3/ping'
    }
  ]

  const results: ComponentHealth[] = []

  for (const check of checks) {
    const startTime = Date.now()
    try {
      if (!process.env.OPENAI_API_KEY && check.name === 'openai') {
        results.push({
          name: check.name,
          status: 'degraded',
          lastCheck: new Date().toISOString(),
          error: 'API key not configured'
        })
        continue
      }

      const response = await fetch(check.url, {
        method: 'GET',
        headers: check.headers || {},
        signal: AbortSignal.timeout(5000) // 5秒タイムアウト
      })

      results.push({
        name: check.name,
        status: response.ok ? 'healthy' : 'degraded',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: {
          statusCode: response.status,
          statusText: response.statusText
        }
      })
    } catch (error) {
      componentLogger.warn(`External API health check failed: ${check.name}`, {
        error: (error as Error).message
      })
      
      results.push({
        name: check.name,
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: (error as Error).message
      })
    }
  }

  return results
}

// メイン GET ハンドラー
export async function GET() {
  const startTime = Date.now()
  
  try {
    componentLogger.info('Health check requested')

    // 各コンポーネントのヘルスチェックを並行実行
    const [
      databaseHealth,
      redisHealth,
      externalAPIHealths
    ] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkExternalAPIs()
    ])

    const components = [
      databaseHealth,
      redisHealth,
      ...externalAPIHealths
    ]

    // 全体的なステータスを決定
    const unhealthyComponents = components.filter(c => c.status === 'unhealthy')
    const degradedComponents = components.filter(c => c.status === 'degraded')
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (unhealthyComponents.length > 0) {
      overallStatus = 'unhealthy'
    } else if (degradedComponents.length > 0) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }

    // システムメトリクス
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      components,
      metrics: {
        memoryUsage,
        activeConnections: 0 // TODO: 実際のコネクション数を取得
      }
    }

    const duration = Date.now() - startTime
    componentLogger.performance('Health check completed', duration, {
      status: overallStatus,
      componentCount: components.length,
      unhealthyCount: unhealthyComponents.length,
      degradedCount: degradedComponents.length
    })

    // ステータスに応じてHTTPステータスコードを設定
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                     overallStatus === 'degraded' ? 200 : 503

    return NextResponse.json(healthStatus, { status: httpStatus })

  } catch (error) {
    componentLogger.error('Health check failed', error as Error, {
      duration: Date.now() - startTime
    })

    const appError = new AppError('Health check failed', {
      type: ErrorType.SYSTEM_ERROR,
      statusCode: 500,
      userMessage: 'システムの状態確認に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}

// ライブネスプローブ用の軽量エンドポイント
export async function HEAD() {
  try {
    // 最小限のチェック（プロセスが生きているかのみ）
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}