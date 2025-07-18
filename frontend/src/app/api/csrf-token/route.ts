import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { generateDoubleSubmitToken } from '@/lib/csrf'

// Node.js Runtime を明示的に指定
export const runtime = 'nodejs'

/**
 * CSRFトークンを取得するAPI
 * GET /api/csrf-token
 */
export async function GET(_request: NextRequest) {
  try {
    // 認証確認
    const user = await verifyAuth(_request)
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // CSRFトークンを生成
    const csrfToken = generateDoubleSubmitToken(user.userId)
    
    // レスポンスを作成
    const response = NextResponse.json({
      token: csrfToken,
      userId: user.userId
    })
    
    // Cookieにもトークンを設定（Double Submit Token方式）
    const cookieName = process.env.NODE_ENV === 'production' ? '__Host-XSRF-TOKEN' : 'XSRF-TOKEN'
    const cookieOptions = process.env.NODE_ENV === 'production' 
      ? 'SameSite=Strict; Secure; Path=/' 
      : 'SameSite=Strict; Path=/'
    
    response.headers.set('Set-Cookie', `${cookieName}=${csrfToken}; ${cookieOptions}`)
    
    return response
  } catch (error) {
    console.error('CSRF token generation failed:', error)
    return NextResponse.json(
      { error: 'CSRFトークンの生成に失敗しました' },
      { status: 500 }
    )
  }
}