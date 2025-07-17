import { NextRequest } from 'next/server';
import { checkRedisRateLimit, type RateLimitConfig as RedisRateLimitConfig } from '@/lib/redis-rate-limit';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// フォールバック用のメモリベースレート制限ストア
class MemoryRateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (entry && entry.resetTime < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, value: RateLimitEntry): void {
    this.store.set(key, value);
  }

  // 定期的にクリーンアップ
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }
}

const fallbackStore = new MemoryRateLimitStore();

// 5分ごとにクリーンアップ
setInterval(() => fallbackStore.cleanup(), 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: NextRequest) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
}

export function createRateLimit(config: RateLimitConfig) {
  const {
    maxRequests,
    windowMs,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (request: NextRequest) => getDefaultKey(request)
  } = config;

  return {
    check: async (request: NextRequest): Promise<RateLimitResult> => {
      const key = keyGenerator(request);
      
      try {
        // Redis-based レート制限を試行
        const result = await checkRedisRateLimit(key, {
          windowMs,
          maxRequests,
          keyPrefix: 'api_rate_limit'
        });
        
        return {
          allowed: result.allowed,
          remaining: result.remainingRequests,
          resetTime: result.resetTime,
          totalRequests: result.totalRequests
        };
      } catch (error) {
        console.warn('Redis rate limit failed, using fallback:', error);
        
        // フォールバック: メモリベース
        const now = Date.now();
        const resetTime = now + windowMs;

        let entry = fallbackStore.get(key);

        if (!entry) {
          // 新しいエントリを作成
          entry = {
            count: 1,
            resetTime
          };
          fallbackStore.set(key, entry);

          return {
            allowed: true,
            remaining: maxRequests - 1,
            resetTime,
            totalRequests: 1
          };
        }

        // リクエスト数を増加
        entry.count++;
        fallbackStore.set(key, entry);

        const allowed = entry.count <= maxRequests;
        const remaining = Math.max(0, maxRequests - entry.count);

        return {
          allowed,
          remaining,
          resetTime: entry.resetTime,
          totalRequests: entry.count
        };
      }
    },

    reset: async (request: NextRequest): Promise<void> => {
      const key = keyGenerator(request);
      try {
        // Redisリセットは今回は実装しない（必要に応じて追加）
        fallbackStore.set(key, { count: 0, resetTime: Date.now() });
      } catch (error) {
        console.warn('Rate limit reset failed:', error);
      }
    }
  };
}

function getDefaultKey(request: NextRequest): string {
  // X-Forwarded-For ヘッダーから実際のIPアドレスを取得
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  let ip = forwarded?.split(',')[0] || realIp;
  
  if (!ip) {
    // Vercelやその他のプラットフォーム用のヘッダー
    ip = request.headers.get('x-vercel-forwarded-for') ||
        request.headers.get('cf-connecting-ip') ||
        '127.0.0.1';
  }

  return ip.trim();
}

// 事前定義されたレート制限設定
export const rateLimitConfigs = {
  // 一般的なAPIエンドポイント用
  general: createRateLimit({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15分
  }),

  // 認証関連エンドポイント用（より厳しい制限）
  auth: createRateLimit({
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15分
  }),

  // コンテンツ作成用（中程度の制限）
  content: createRateLimit({
    maxRequests: 50,
    windowMs: 15 * 60 * 1000, // 15分
  }),

  // パブリック読み取り専用用（緩い制限）
  public: createRateLimit({
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15分
  }),
};

// レート制限ミドルウェアヘルパー
export function withRateLimit(
  handler: (request: NextRequest) => Promise<Response>,
  config: RateLimitConfig | keyof typeof rateLimitConfigs
) {
  const rateLimit = typeof config === 'string' ? rateLimitConfigs[config] : createRateLimit(config);

  return async (request: NextRequest): Promise<Response> => {
    const result = await rateLimit.check(request);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'レート制限に達しました',
          message: `15分間に${typeof config === 'string' ? rateLimitConfigs[config] : config.maxRequests}リクエストまでです`,
          resetTime: new Date(result.resetTime).toISOString(),
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(typeof config === 'string' ? 
              (rateLimitConfigs[config] as any).maxRequests : config.maxRequests),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
            'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000))
          }
        }
      );
    }

    // レート制限をパスした場合、レスポンスヘッダーを追加してハンドラーを実行
    const response = await handler(request);
    
    // レート制限情報をレスポンスヘッダーに追加
    response.headers.set('X-RateLimit-Limit', String(typeof config === 'string' ? 
      (rateLimitConfigs[config] as any).maxRequests : config.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

    return response;
  };
}