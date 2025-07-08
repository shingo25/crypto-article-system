import Redis from 'ioredis'

let redis: Redis | null = null

/**
 * Redis接続を取得（シングルトンパターン）
 */
function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      // 接続失敗時の処理
      lazyConnect: true,
    })

    redis.on('error', (error) => {
      console.error('Redis connection error:', error)
    })

    redis.on('connect', () => {
      console.log('Redis connected successfully')
    })
  }
  
  return redis
}

export interface RateLimitConfig {
  windowMs: number    // 時間窓（ミリ秒）
  maxRequests: number // 最大リクエスト数
  keyPrefix?: string  // Redisキーのプレフィックス
}

export interface RateLimitResult {
  allowed: boolean
  remainingRequests: number
  resetTime: number
  totalRequests: number
}

/**
 * Redis-based レート制限の実装
 * Sliding Window Log アルゴリズムを使用
 */
export async function checkRedisRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const client = getRedisClient()
  const now = Date.now()
  const window = config.windowMs
  const maxRequests = config.maxRequests
  const keyPrefix = config.keyPrefix || 'rate_limit'
  const key = `${keyPrefix}:${identifier}`
  
  try {
    // Redisが利用できない場合はフォールバック（許可）
    if (client.status !== 'ready' && client.status !== 'connecting') {
      await client.connect()
    }
    
    // Lua スクリプトを使用してアトミックな操作を実行
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      
      -- 期限切れのエントリを削除
      redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
      
      -- 現在のリクエスト数を取得
      local current = redis.call('ZCARD', key)
      
      if current < limit then
        -- リクエストを追加
        redis.call('ZADD', key, now, now)
        -- TTLを設定（メモリリーク防止）
        redis.call('EXPIRE', key, math.ceil(window / 1000))
        return {1, limit - current - 1, now + window, current + 1}
      else
        -- 次のリセット時刻を計算
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local reset_time = oldest[2] and (tonumber(oldest[2]) + window) or (now + window)
        return {0, 0, reset_time, current}
      end
    `
    
    const result = await client.eval(
      luaScript,
      1,
      key,
      now.toString(),
      window.toString(),
      maxRequests.toString()
    ) as [number, number, number, number]
    
    return {
      allowed: result[0] === 1,
      remainingRequests: result[1],
      resetTime: result[2],
      totalRequests: result[3]
    }
    
  } catch (error) {
    console.error('Redis rate limit error:', error)
    // Redis エラー時はフォールバック（制限なし）
    return {
      allowed: true,
      remainingRequests: maxRequests - 1,
      resetTime: now + window,
      totalRequests: 1
    }
  }
}

/**
 * IP-based レート制限（汎用）
 */
export async function checkIPRateLimit(
  ip: string,
  windowMs: number = 15 * 60 * 1000, // 15分
  maxRequests: number = 100
): Promise<RateLimitResult> {
  return checkRedisRateLimit(ip, {
    windowMs,
    maxRequests,
    keyPrefix: 'ip_rate_limit'
  })
}

/**
 * 認証系API用の厳格なレート制限
 */
export async function checkAuthRateLimit(
  ip: string,
  windowMs: number = 15 * 60 * 1000, // 15分
  maxRequests: number = 5 // 認証系は厳格に
): Promise<RateLimitResult> {
  return checkRedisRateLimit(ip, {
    windowMs,
    maxRequests,
    keyPrefix: 'auth_rate_limit'
  })
}

/**
 * ユーザー単位のレート制限
 */
export async function checkUserRateLimit(
  userId: string,
  windowMs: number = 60 * 1000, // 1分
  maxRequests: number = 60 // 1分間に60リクエスト
): Promise<RateLimitResult> {
  return checkRedisRateLimit(userId, {
    windowMs,
    maxRequests,
    keyPrefix: 'user_rate_limit'
  })
}

/**
 * レート制限の情報をクリア（管理者用）
 */
export async function clearRateLimit(identifier: string, keyPrefix: string = 'rate_limit'): Promise<void> {
  const client = getRedisClient()
  const key = `${keyPrefix}:${identifier}`
  
  try {
    await client.del(key)
  } catch (error) {
    console.error('Failed to clear rate limit:', error)
  }
}

/**
 * Redis接続を閉じる（アプリケーション終了時用）
 */
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}