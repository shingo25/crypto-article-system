import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // 開発環境でのみデバッグログを出力
  const isDev = process.env.NODE_ENV === 'development'
  
  // リクエストIDを生成
  const requestId = Math.random().toString(36).substring(2, 15)
  
  // セキュリティチェック：保護対象のパス（より具体的に指定）
  const protectedPaths = ['/content', '/market', '/analytics', '/settings']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )
  
  // 認証チェック（デモ用の簡易実装）
  if (isProtectedPath) {
    const authToken = request.cookies.get('auth-token')
    
    // デモ用：開発環境では認証をスキップ
    if (!authToken && process.env.NODE_ENV === 'production') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }
  
  // レスポンスを作成
  const response = NextResponse.next()
  
  // 基本的なセキュリティヘッダーを設定（CSPは一旦コメントアウト）
  response.headers.set('x-request-id', requestId)
  response.headers.set('x-timestamp', new Date().toISOString())
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // CSPヘッダーは一旦無効化（動作確認後に段階的に有効化）
  // const cspHeader = [
  //   "default-src 'self'",
  //   "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  //   "style-src 'self' 'unsafe-inline'",
  //   "img-src 'self' data: https: blob:",
  //   "font-src 'self' https:",
  //   "connect-src 'self' https:",
  //   "media-src 'self'",
  //   "object-src 'none'",
  //   "child-src 'self'",
  //   "frame-ancestors 'none'",
  //   "form-action 'self'",
  //   "base-uri 'self'"
  // ].join('; ')
  // response.headers.set('Content-Security-Policy', cspHeader)
  
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