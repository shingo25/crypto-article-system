import { NextRequest, NextResponse } from 'next/server'
import { checkIPRateLimit } from '@/lib/redis-rate-limit'

// フォールバック用のメモリベースレート制限（Redis接続失敗時）
const FALLBACK_RATE_LIMIT_MAP = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15分
const RATE_LIMIT_MAX_REQUESTS = 100 // 15分間に100リクエスト

function checkFallbackRateLimit(ip: string): boolean {
  const now = Date.now()
  const userLimit = FALLBACK_RATE_LIMIT_MAP.get(ip)
  
  if (!userLimit) {
    FALLBACK_RATE_LIMIT_MAP.set(ip, { count: 1, lastReset: now })
    return true
  }
  
  // リセット時間を過ぎている場合
  if (now - userLimit.lastReset > RATE_LIMIT_WINDOW) {
    FALLBACK_RATE_LIMIT_MAP.set(ip, { count: 1, lastReset: now })
    return true
  }
  
  // リクエスト数をチェック
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }
  
  // カウントを増加
  userLimit.count++
  return true
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining?: number; resetTime?: number }> {
  try {
    // Redis-based レート制限を試行
    const result = await checkIPRateLimit(ip, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_REQUESTS)
    return {
      allowed: result.allowed,
      remaining: result.remainingRequests,
      resetTime: result.resetTime
    }
  } catch (error) {
    console.warn('Redis rate limit failed, using fallback:', error)
    // フォールバック
    return {
      allowed: checkFallbackRateLimit(ip)
    }
  }
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

export async function middleware(request: NextRequest) {
  // 開発環境でのみデバッグログを出力
  const isDev = process.env.NODE_ENV === 'development'
  
  // リクエストIDを生成
  const requestId = Math.random().toString(36).substring(2, 15)
  
  // リクエスト毎にユニークなnonceを生成
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  
  // レート制限チェック
  const ip = getClientIP(request)
  const rateLimitResult = await checkRateLimit(ip)
  
  if (!rateLimitResult.allowed) {
    console.warn(`[${new Date().toISOString()}] レート制限超過: ${ip} ${request.url}`)
    
    const response = NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.resetTime ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000) : 900
      },
      { status: 429 }
    )
    
    // レート制限ヘッダーを追加
    if (rateLimitResult.remaining !== undefined) {
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    }
    if (rateLimitResult.resetTime) {
      response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString())
    }
    response.headers.set('Retry-After', rateLimitResult.resetTime ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString() : '900')
    
    return response
  }
  
  // セキュリティチェック：保護対象のパス（より具体的に指定）
  const protectedPaths = ['/content', '/market', '/analytics', '/settings']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )
  
  // 認証チェック（デモ用の簡易実装）
  if (isProtectedPath) {
    const authToken = request.cookies.get('__Host-auth-token')
    
    // デモ用：開発環境では認証をスキップ
    if (!authToken && process.env.NODE_ENV === 'production') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }
  
  // nonceをリクエストヘッダー経由でReactコンポーネントに渡す
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  
  // レスポンスを作成
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  // セキュリティヘッダーを設定
  response.headers.set('x-request-id', requestId)
  response.headers.set('x-timestamp', new Date().toISOString())
  
  // 開発環境判定（最初に定義）
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // XSS保護
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // リファラーポリシー
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // HSTS（本番環境のみ）
  if (!isDevelopment) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  
  // Permissions Policy（機能制限）
  response.headers.set('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'payment=()',
    'usb=()',
    'bluetooth=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', '))
  
  // CSPヘッダーを設定（セキュリティ強化）
  
  const cspHeader = [
    "default-src 'self'",
    // スクリプト: Next.js とアプリケーションに必要なもの（nonce-based）
    isDevelopment 
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' localhost:* ws:` 
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // スタイル: Tailwind CSS とインラインスタイル
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // 画像: 外部画像とdata URLs
    "img-src 'self' data: https: blob:",
    // フォント: Google Fonts
    "font-src 'self' https://fonts.gstatic.com",
    // 接続: API とWebSocket
    isDevelopment
      ? "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com"
      : "connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com",
    // メディア
    "media-src 'self'",
    // オブジェクト: 完全に無効化
    "object-src 'none'",
    // 子フレーム: 同一オリジンのみ
    "child-src 'self'",
    // フレーミング: 完全に無効化
    "frame-ancestors 'none'",
    // フォーム: 同一オリジンのみ
    "form-action 'self'",
    // ベースURI: 同一オリジンのみ
    "base-uri 'self'",
    // アップグレード: 本番環境ではHTTPSを強制
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
    // CSP違反レポート
    "report-uri /api/security/csp-report"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', cspHeader)
  
  // 開発環境でのみデバッグ情報を追加
  if (isDev) {
    response.headers.set('x-debug-path', request.nextUrl.pathname)
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - Protected: ${isProtectedPath}`)
  }
  
  return response
}

// より安全なmatcher設定
export const config = {
  matcher: [
    // APIルートのみ
    '/api/:path*',
    // 静的ファイル、Next.js内部ファイル、ファビコンを除外
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|sitemap.xml|robots.txt).*)',
  ]
}