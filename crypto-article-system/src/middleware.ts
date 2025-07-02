import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // リクエストIDを生成
  const requestId = Math.random().toString(36).substring(2, 15)
  
  // レスポンスを作成
  const response = NextResponse.next()
  
  // レスポンスヘッダーにリクエストIDを追加
  response.headers.set('x-request-id', requestId)
  response.headers.set('x-timestamp', new Date().toISOString())
  
  // 簡単なログ出力（Edge Runtime対応）
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`)
  
  return response
}

// ミドルウェアを適用するパスを指定
export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}