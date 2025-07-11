import { NextRequest, NextResponse } from 'next/server'
import { withCSRFProtection } from '@/lib/csrf-middleware'

// デバッグ用ログ
console.log('[MIDDLEWARE] Loading middleware.ts')

// Edge Runtime対応のレート制限（Redis依存を完全に除去）
async function checkRateLimitSafely(ip: string, windowMs: number, maxRequests: number): Promise<{ allowed: boolean; remaining?: number; resetTime?: number }> {
  try {
    // Edge Runtime対応版のみを使用（Redis不使用）
    const { checkEdgeIPRateLimit } = await import('@/lib/redis-rate-limit-edge')
    const result = await checkEdgeIPRateLimit(ip, windowMs, maxRequests)
    return {
      allowed: result.allowed,
      remaining: result.remainingRequests,
      resetTime: result.resetTime
    }
  } catch (error) {
    console.warn('Rate limit check failed, allowing request:', error)
    return { allowed: true }
  }
}

// フォールバック用のメモリベースレート制限（Redis接続失敗時）
const FALLBACK_RATE_LIMIT_MAP = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15分
const RATE_LIMIT_MAX_REQUESTS = 100 // 15分間に100リクエスト

// checkFallbackRateLimit は checkRateLimitSafely に統合されたため削除

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining?: number; resetTime?: number }> {
  return checkRateLimitSafely(ip, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_REQUESTS)
}

function getClientIP(request: NextRequest): string {
  // Vercel, Cloudflare, その他のプロキシからのIPを取得
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return 'unknown'
}

async function handleMiddleware(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const { pathname } = request.nextUrl
    const method = request.method
    
    // デバッグ用ログ
    console.log(`[ROOT MIDDLEWARE] Received ${method} request for ${pathname}`)
    console.log(`[ROOT MIDDLEWARE] Client IP: ${clientIP}`)
    
    // CSP用のnonceを生成
    const nonce = crypto.randomUUID().replace(/-/g, '')
    
    // APIルートに対してレート制限を適用
    if (pathname.startsWith('/api/')) {
      const rateLimit = await checkRateLimit(clientIP)
      
      if (!rateLimit.allowed) {
        return new NextResponse(
          JSON.stringify({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.'
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '900', // 15分
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': String(rateLimit.remaining || 0),
              'X-RateLimit-Reset': String(rateLimit.resetTime || Date.now() + 900000)
            }
          }
        )
      }
    }
    
    // CSRF保護はwithCSRFProtectionミドルウェアで処理される
    
    const response = NextResponse.next()
    
    // nonceをNext.jsに渡すためのヘッダーを設定
    response.headers.set('x-nonce', nonce)
    
    // 基本的なセキュリティヘッダーを追加
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // 詳細なセキュリティヘッダーを追加
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()'
    )
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
    
    // CSP (Content Security Policy) - Report-Onlyモードで開始
    const cspPolicy = [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' fonts.googleapis.com`,
      `font-src 'self' fonts.gstatic.com`,
      `img-src 'self' data: blob: https:`,
      `connect-src 'self' https://api.coingecko.com https://api.coinpaprika.com ws: wss:`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `upgrade-insecure-requests`
    ].join('; ')
    
    response.headers.set('Content-Security-Policy-Report-Only', cspPolicy)
    
    // HTTPS環境でのみHTSヘッダーを設定
    if (request.nextUrl.protocol === 'https:') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    
    // レート制限情報をヘッダーに追加（成功時）
    if (pathname.startsWith('/api/')) {
      const rateLimit = await checkRateLimit(clientIP)
      if (rateLimit.allowed) {
        response.headers.set('X-RateLimit-Limit', '100')
        response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining || 0))
        response.headers.set('X-RateLimit-Reset', String(rateLimit.resetTime || Date.now() + 900000))
      }
    }
    
    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

// CSRF保護ミドルウェアでラップ
export const middleware = withCSRFProtection(handleMiddleware)

export const config = {
  matcher: [
    // APIルートにのみミドルウェアを適用
    '/api/:path*',
  ]
}