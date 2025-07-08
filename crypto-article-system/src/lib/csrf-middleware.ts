import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { getCSRFTokenFromRequest, verifyDoubleSubmitToken } from './csrf'

interface JWTPayload {
  userId: string
  email: string
  username: string
  role: string
  csrfSecret?: string
}

/**
 * CSRF保護が必要なHTTPメソッド
 */
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']

/**
 * CSRF保護をスキップするパス
 */
const SKIP_CSRF_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/health',
  '/api/init'
]

/**
 * CSRFトークンを検証するミドルウェア
 */
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const method = request.method
    const pathname = request.nextUrl.pathname

    // GETリクエストやスキップパスはCSRF保護をスキップ
    if (!PROTECTED_METHODS.includes(method) || SKIP_CSRF_PATHS.includes(pathname)) {
      return handler(request)
    }

    try {
      // 認証トークンを取得
      const authToken = request.cookies.get('__Host-auth-token')?.value
      if (!authToken) {
        return NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        )
      }

      // JWTを検証してCSRFシークレットを取得
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error('JWT_SECRET is not configured')
        return NextResponse.json(
          { error: 'サーバー設定エラー' },
          { status: 500 }
        )
      }

      const payload = verify(authToken, jwtSecret, {
        algorithms: ['HS256']
      }) as JWTPayload

      // CSRFトークンを取得
      const csrfToken = getCSRFTokenFromRequest(request)
      if (!csrfToken) {
        return NextResponse.json(
          { error: 'CSRFトークンが見つかりません' },
          { status: 403 }
        )
      }

      // Double Submit Tokenを検証
      const isValidToken = verifyDoubleSubmitToken(csrfToken, payload.userId)
      if (!isValidToken) {
        return NextResponse.json(
          { error: 'CSRFトークンが無効です' },
          { status: 403 }
        )
      }

      // 検証に成功したらハンドラーを実行
      return handler(request)

    } catch (error) {
      console.error('CSRF verification failed:', error)
      return NextResponse.json(
        { error: 'CSRFトークンの検証に失敗しました' },
        { status: 403 }
      )
    }
  }
}

/**
 * API Route用のCSRF保護ラッパー
 */
export function protectCSRF<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T) => {
    const request = args[0] as NextRequest
    const method = request.method
    const pathname = request.nextUrl.pathname

    // GETリクエストやスキップパスはCSRF保護をスキップ
    if (!PROTECTED_METHODS.includes(method) || SKIP_CSRF_PATHS.includes(pathname)) {
      return handler(...args)
    }

    try {
      // 認証トークンを取得
      const authToken = request.cookies.get('__Host-auth-token')?.value
      if (!authToken) {
        return NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        )
      }

      // JWTを検証してCSRFシークレットを取得
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error('JWT_SECRET is not configured')
        return NextResponse.json(
          { error: 'サーバー設定エラー' },
          { status: 500 }
        )
      }

      const payload = verify(authToken, jwtSecret, {
        algorithms: ['HS256']
      }) as JWTPayload

      // CSRFトークンを取得
      const csrfToken = getCSRFTokenFromRequest(request)
      if (!csrfToken) {
        return NextResponse.json(
          { error: 'CSRFトークンが見つかりません' },
          { status: 403 }
        )
      }

      // Double Submit Tokenを検証
      const isValidToken = verifyDoubleSubmitToken(csrfToken, payload.userId)
      if (!isValidToken) {
        return NextResponse.json(
          { error: 'CSRFトークンが無効です' },
          { status: 403 }
        )
      }

      // 検証に成功したらハンドラーを実行
      return handler(...args)

    } catch (error) {
      console.error('CSRF verification failed:', error)
      return NextResponse.json(
        { error: 'CSRFトークンの検証に失敗しました' },
        { status: 403 }
      )
    }
  }
}

/**
 * CSRFトークンを取得するAPI
 */
export function createCSRFTokenEndpoint() {
  return async (request: NextRequest) => {
    try {
      // 認証トークンを取得
      const authToken = request.cookies.get('__Host-auth-token')?.value
      if (!authToken) {
        return NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        )
      }

      // JWTを検証
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        return NextResponse.json(
          { error: 'サーバー設定エラー' },
          { status: 500 }
        )
      }

      const payload = verify(authToken, jwtSecret, {
        algorithms: ['HS256']
      }) as JWTPayload

      // 現在のCSRFトークンを取得
      const csrfToken = request.cookies.get('XSRF-TOKEN')?.value
      
      return NextResponse.json({
        token: csrfToken,
        userId: payload.userId
      })

    } catch (error) {
      console.error('CSRF token retrieval failed:', error)
      return NextResponse.json(
        { error: 'CSRFトークンの取得に失敗しました' },
        { status: 500 }
      )
    }
  }
}