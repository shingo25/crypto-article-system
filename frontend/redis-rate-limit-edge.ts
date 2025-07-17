/**
 * Edge Runtime対応のレート制限実装
 * RedisクライアントがEdge Runtimeで動作しない場合のフォールバック
 */

export interface EdgeRateLimitConfig {
  windowMs: number    // 時間窓（ミリ秒）
  maxRequests: number // 最大リクエスト数
  keyPrefix?: string  // キーのプレフィックス
}

export interface EdgeRateLimitResult {
  allowed: boolean
  remainingRequests: number
  resetTime: number
  totalRequests: number
}

// Edge Runtime対応のメモリベース制限（開発環境用）
const edgeRateLimitStore = new Map<string, {
  requests: number[]
  lastCleanup: number
}>()

/**
 * Edge Runtime対応のレート制限チェック
 * Sliding Window Log アルゴリズム（メモリベース）
 */
export async function checkEdgeRateLimit(
  identifier: string,
  config: EdgeRateLimitConfig
): Promise<EdgeRateLimitResult> {
  const now = Date.now()
  const window = config.windowMs
  const maxRequests = config.maxRequests
  const keyPrefix = config.keyPrefix || 'edge_rate_limit'
  const key = `${keyPrefix}:${identifier}`
  
  // 既存のレコードを取得または作成
  let record = edgeRateLimitStore.get(key)
  if (!record) {
    record = {
      requests: [],
      lastCleanup: now
    }
    edgeRateLimitStore.set(key, record)
  }
  
  // 期限切れのリクエストを削除
  const cutoff = now - window
  record.requests = record.requests.filter(timestamp => timestamp > cutoff)
  
  // 現在のリクエスト数をチェック
  const currentRequests = record.requests.length
  
  if (currentRequests < maxRequests) {
    // リクエストを追加
    record.requests.push(now)
    record.lastCleanup = now
    
    return {
      allowed: true,
      remainingRequests: maxRequests - currentRequests - 1,
      resetTime: now + window,
      totalRequests: currentRequests + 1
    }
  } else {
    // リクエスト制限に達している
    const oldestRequest = record.requests[0]
    const resetTime = oldestRequest + window
    
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime,
      totalRequests: currentRequests
    }
  }
}

/**
 * Edge Runtime用のクリーンアップ（定期的に実行）
 */
export function cleanupEdgeRateLimit() {
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24時間
  
  for (const [key, record] of edgeRateLimitStore.entries()) {
    if (now - record.lastCleanup > maxAge) {
      edgeRateLimitStore.delete(key)
    }
  }
}

// 定期的なクリーンアップ（Edge Runtime環境では制限的に実行）
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupEdgeRateLimit, 5 * 60 * 1000) // 5分間隔
}

/**
 * Edge Runtime対応のIP-based レート制限
 */
export async function checkEdgeIPRateLimit(
  ip: string,
  windowMs: number = 15 * 60 * 1000, // 15分
  maxRequests: number = 100
): Promise<EdgeRateLimitResult> {
  return checkEdgeRateLimit(ip, {
    windowMs,
    maxRequests,
    keyPrefix: 'edge_ip_rate_limit'
  })
}

/**
 * Edge Runtime対応の認証系レート制限
 */
export async function checkEdgeAuthRateLimit(
  ip: string,
  windowMs: number = 15 * 60 * 1000, // 15分
  maxRequests: number = 5 // 認証系は厳格に
): Promise<EdgeRateLimitResult> {
  return checkEdgeRateLimit(ip, {
    windowMs,
    maxRequests,
    keyPrefix: 'edge_auth_rate_limit'
  })
}

/**
 * Edge Runtime対応のユーザー単位レート制限
 */
export async function checkEdgeUserRateLimit(
  userId: string,
  windowMs: number = 60 * 1000, // 1分
  maxRequests: number = 60 // 1分間に60リクエスト
): Promise<EdgeRateLimitResult> {
  return checkEdgeRateLimit(userId, {
    windowMs,
    maxRequests,
    keyPrefix: 'edge_user_rate_limit'
  })
}