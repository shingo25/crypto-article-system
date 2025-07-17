import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  console.log('=== Debug Auth API Called ===')
  
  try {
    // リクエストヘッダーの詳細
    const headers = Object.fromEntries(request.headers.entries())
    console.log('Request headers:', headers)
    
    // Cookieの詳細
    const cookies = Object.fromEntries(
      request.cookies.getAll().map(cookie => [cookie.name, cookie.value])
    )
    console.log('All cookies:', cookies)
    
    // 認証トークンの確認
    const authToken = request.cookies.get('auth-token')?.value
    const hostAuthToken = request.cookies.get('__Host-auth-token')?.value
    
    // 認証の試行
    const user = await verifyAuth(request)
    
    return NextResponse.json({
      requestUrl: request.url,
      method: request.method,
      headers: headers,
      cookies: cookies,
      authToken: authToken ? {
        length: authToken.length,
        preview: authToken.substring(0, 20) + '...'
      } : null,
      hostAuthToken: hostAuthToken ? {
        length: hostAuthToken.length,
        preview: hostAuthToken.substring(0, 20) + '...'
      } : null,
      authResult: user ? {
        userId: user.userId,
        email: user.email,
        username: user.username,
        role: user.role
      } : null,
      authSuccess: !!user
    })
    
  } catch (error) {
    console.error('Debug auth failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}