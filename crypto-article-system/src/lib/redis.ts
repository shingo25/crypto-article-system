import Redis from 'ioredis'
import { createComponentLogger } from './logger'

const componentLogger = createComponentLogger('Redis')

// Redis接続設定
const getRedisConfig = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  
  // URL形式の場合は分解
  if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
    return {
      connectionString: redisUrl,
      // 接続オプション
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4, // IPv4
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'crypto-article:',
      db: parseInt(process.env.REDIS_DB || '0')
    }
  }

  // 個別設定の場合
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4, // IPv4
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'crypto-article:'
  }
}

// Redis接続クラス
class RedisConnection {
  private static instance: RedisConnection
  private redis: Redis | null = null
  private subscriber: Redis | null = null
  private publisher: Redis | null = null
  private isConnected = false

  private constructor() {}

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection()
    }
    return RedisConnection.instance
  }

  // メインのRedis接続を取得
  public async getRedis(): Promise<Redis> {
    if (!this.redis) {
      await this.connect()
    }
    return this.redis!
  }

  // Pub/Sub用のサブスクライバー接続
  public async getSubscriber(): Promise<Redis> {
    if (!this.subscriber) {
      const config = getRedisConfig()
      this.subscriber = new Redis(config)
      
      this.subscriber.on('connect', () => {
        componentLogger.info('Redis subscriber connected')
      })
      
      this.subscriber.on('error', (error) => {
        componentLogger.error('Redis subscriber error', error)
      })
    }
    return this.subscriber
  }

  // Pub/Sub用のパブリッシャー接続
  public async getPublisher(): Promise<Redis> {
    if (!this.publisher) {
      const config = getRedisConfig()
      this.publisher = new Redis(config)
      
      this.publisher.on('connect', () => {
        componentLogger.info('Redis publisher connected')
      })
      
      this.publisher.on('error', (error) => {
        componentLogger.error('Redis publisher error', error)
      })
    }
    return this.publisher
  }

  // 接続を確立
  private async connect(): Promise<void> {
    if (this.isConnected) return

    try {
      const config = getRedisConfig()
      componentLogger.info('Connecting to Redis', { 
        config: { ...config, password: config.password ? '[REDACTED]' : undefined } 
      })

      this.redis = new Redis(config)

      // イベントリスナーを設定
      this.redis.on('connect', () => {
        componentLogger.info('Redis connected successfully')
        this.isConnected = true
      })

      this.redis.on('ready', () => {
        componentLogger.info('Redis ready for operations')
      })

      this.redis.on('error', (error) => {
        componentLogger.error('Redis connection error', error)
        this.isConnected = false
      })

      this.redis.on('close', () => {
        componentLogger.warn('Redis connection closed')
        this.isConnected = false
      })

      this.redis.on('reconnecting', () => {
        componentLogger.info('Redis reconnecting...')
      })

      // 接続テスト
      await this.redis.ping()
      componentLogger.info('Redis ping successful')

    } catch (error) {
      componentLogger.error('Failed to connect to Redis', error as Error)
      throw error
    }
  }

  // 接続状態を確認
  public async isHealthy(): Promise<boolean> {
    try {
      if (!this.redis) return false
      await this.redis.ping()
      return true
    } catch (error) {
      componentLogger.error('Redis health check failed', error as Error)
      return false
    }
  }

  // 接続を閉じる
  public async disconnect(): Promise<void> {
    componentLogger.info('Disconnecting from Redis')
    
    const connections = [this.redis, this.subscriber, this.publisher].filter(Boolean)
    
    await Promise.all(
      connections.map(async (connection) => {
        try {
          await connection!.quit()
        } catch (error) {
          componentLogger.warn('Error during Redis disconnect', error as Error)
        }
      })
    )

    this.redis = null
    this.subscriber = null
    this.publisher = null
    this.isConnected = false
    
    componentLogger.info('Redis disconnected')
  }

  // 統計情報を取得
  public async getStats(): Promise<{
    connected: boolean
    memory: string
    connectedClients: string
    totalConnectionsReceived: string
    totalCommandsProcessed: string
    keyspaceHits: string
    keyspaceMisses: string
  }> {
    try {
      const redis = await this.getRedis()
      const info = await redis.info()
      
      // INFO コマンドの結果をパース
      const stats = {
        connected: this.isConnected,
        memory: this.extractInfoValue(info, 'used_memory_human'),
        connectedClients: this.extractInfoValue(info, 'connected_clients'),
        totalConnectionsReceived: this.extractInfoValue(info, 'total_connections_received'),
        totalCommandsProcessed: this.extractInfoValue(info, 'total_commands_processed'),
        keyspaceHits: this.extractInfoValue(info, 'keyspace_hits'),
        keyspaceMisses: this.extractInfoValue(info, 'keyspace_misses')
      }

      return stats
    } catch (error) {
      componentLogger.error('Failed to get Redis stats', error as Error)
      return {
        connected: false,
        memory: 'N/A',
        connectedClients: 'N/A',
        totalConnectionsReceived: 'N/A',
        totalCommandsProcessed: 'N/A',
        keyspaceHits: 'N/A',
        keyspaceMisses: 'N/A'
      }
    }
  }

  private extractInfoValue(info: string, key: string): string {
    const match = info.match(new RegExp(`${key}:(.+)`))
    return match ? match[1].trim() : 'N/A'
  }
}

// シングルトンインスタンス
export const redisConnection = RedisConnection.getInstance()

// コンビニエンス関数
export const getRedis = () => redisConnection.getRedis()
export const getRedisSubscriber = () => redisConnection.getSubscriber()
export const getRedisPublisher = () => redisConnection.getPublisher()

// キャッシュユーティリティ
export class RedisCache {
  private static instance: RedisCache

  public static getInstance(): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache()
    }
    return RedisCache.instance
  }

  // キーを設定
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const redis = await getRedis()
      const serializedValue = JSON.stringify(value)
      
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serializedValue)
      } else {
        await redis.set(key, serializedValue)
      }
      
      componentLogger.debug('Redis cache set', { key, ttl: ttlSeconds })
    } catch (error) {
      componentLogger.error('Redis cache set failed', error as Error, { key })
      throw error
    }
  }

  // キーを取得
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = await getRedis()
      const value = await redis.get(key)
      
      if (value === null) {
        componentLogger.debug('Redis cache miss', { key })
        return null
      }
      
      const parsedValue = JSON.parse(value)
      componentLogger.debug('Redis cache hit', { key })
      return parsedValue
    } catch (error) {
      componentLogger.error('Redis cache get failed', error as Error, { key })
      return null
    }
  }

  // キーを削除
  async delete(key: string): Promise<void> {
    try {
      const redis = await getRedis()
      await redis.del(key)
      componentLogger.debug('Redis cache delete', { key })
    } catch (error) {
      componentLogger.error('Redis cache delete failed', error as Error, { key })
      throw error
    }
  }

  // パターンマッチでキーを削除
  async deletePattern(pattern: string): Promise<number> {
    try {
      const redis = await getRedis()
      const keys = await redis.keys(pattern)
      
      if (keys.length === 0) {
        return 0
      }
      
      const deleted = await redis.del(...keys)
      componentLogger.debug('Redis cache pattern delete', { pattern, deleted })
      return deleted
    } catch (error) {
      componentLogger.error('Redis cache pattern delete failed', error as Error, { pattern })
      throw error
    }
  }

  // TTLを設定
  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      const redis = await getRedis()
      await redis.expire(key, ttlSeconds)
      componentLogger.debug('Redis cache expire set', { key, ttl: ttlSeconds })
    } catch (error) {
      componentLogger.error('Redis cache expire failed', error as Error, { key })
      throw error
    }
  }

  // キーの存在確認
  async exists(key: string): Promise<boolean> {
    try {
      const redis = await getRedis()
      const exists = await redis.exists(key)
      return exists === 1
    } catch (error) {
      componentLogger.error('Redis cache exists check failed', error as Error, { key })
      return false
    }
  }

  // インクリメント
  async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const redis = await getRedis()
      const value = await redis.incr(key)
      
      if (ttlSeconds && value === 1) {
        await redis.expire(key, ttlSeconds)
      }
      
      componentLogger.debug('Redis cache increment', { key, value, ttl: ttlSeconds })
      return value
    } catch (error) {
      componentLogger.error('Redis cache increment failed', error as Error, { key })
      throw error
    }
  }
}

// レート制限ユーティリティ
export class RedisRateLimit {
  async checkLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const redis = await getRedis()
      const key = `rate_limit:${identifier}`
      const now = Date.now()
      const windowStart = now - (windowSeconds * 1000)

      // Sliding window rate limiting using sorted sets
      const pipe = redis.pipeline()
      pipe.zremrangebyscore(key, 0, windowStart)
      pipe.zadd(key, now, `${now}-${Math.random()}`)
      pipe.zcard(key)
      pipe.expire(key, windowSeconds)
      
      const results = await pipe.exec()
      const currentCount = results?.[2]?.[1] as number || 0

      const allowed = currentCount <= limit
      const remaining = Math.max(0, limit - currentCount)
      const resetTime = now + (windowSeconds * 1000)

      componentLogger.debug('Rate limit check', {
        identifier,
        limit,
        windowSeconds,
        currentCount,
        allowed,
        remaining
      })

      return { allowed, remaining, resetTime }
    } catch (error) {
      componentLogger.error('Rate limit check failed', error as Error, { identifier })
      // フェイルオープン（エラー時は制限しない）
      return { allowed: true, remaining: limit, resetTime: Date.now() + (windowSeconds * 1000) }
    }
  }
}

// シングルトンインスタンス
export const redisCache = RedisCache.getInstance()
export const redisRateLimit = new RedisRateLimit()