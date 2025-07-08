import { randomBytes, createHmac } from 'crypto'

const CSRF_TOKEN_LENGTH = 32
const CSRF_SECRET_LENGTH = 32

/**
 * CSRF トークンを生成
 * @returns { token: string, secret: string } トークンとシークレット
 */
export function generateCSRFToken(): { token: string; secret: string } {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
  const secret = randomBytes(CSRF_SECRET_LENGTH).toString('hex')
  
  return { token, secret }
}

/**
 * CSRF トークンを検証
 * @param token クライアントから送信されたトークン
 * @param secret サーバーに保存されたシークレット
 * @returns 検証結果
 */
export function verifyCSRFToken(token: string, secret: string): boolean {
  if (!token || !secret) {
    return false
  }
  
  try {
    // トークンとシークレットを組み合わせてハッシュを作成し、検証
    const expectedHash = createHmac('sha256', secret).update(token).digest('hex')
    const receivedHash = createHmac('sha256', secret).update(token).digest('hex')
    
    return expectedHash === receivedHash
  } catch (error) {
    console.error('CSRF token verification failed:', error)
    return false
  }
}

/**
 * Double Submit Cookie 用のCSRFトークンを生成
 * @param sessionId セッションID
 * @returns CSRFトークン
 */
export function generateDoubleSubmitToken(sessionId: string): string {
  const timestamp = Date.now().toString()
  const randomValue = randomBytes(16).toString('hex')
  
  // セッションIDとタイムスタンプ、ランダム値を組み合わせてトークンを生成
  const payload = `${sessionId}:${timestamp}:${randomValue}`
  const token = createHmac('sha256', process.env.CSRF_SECRET || 'default-secret')
    .update(payload)
    .digest('hex')
  
  return `${timestamp}.${randomValue}.${token}`
}

/**
 * Double Submit Cookie トークンを検証
 * @param token CSRFトークン
 * @param sessionId セッションID
 * @returns 検証結果
 */
export function verifyDoubleSubmitToken(token: string, sessionId: string): boolean {
  if (!token || !sessionId) {
    return false
  }
  
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return false
    }
    
    const [timestamp, randomValue, receivedToken] = parts
    
    // トークンが古すぎる場合は無効（1時間で期限切れ）
    const tokenTime = parseInt(timestamp)
    const currentTime = Date.now()
    const maxAge = 60 * 60 * 1000 // 1時間
    
    if (currentTime - tokenTime > maxAge) {
      return false
    }
    
    // 期待されるトークンを再生成して比較
    const payload = `${sessionId}:${timestamp}:${randomValue}`
    const expectedToken = createHmac('sha256', process.env.CSRF_SECRET || 'default-secret')
      .update(payload)
      .digest('hex')
    
    return receivedToken === expectedToken
  } catch (error) {
    console.error('Double submit token verification failed:', error)
    return false
  }
}

/**
 * リクエストからCSRFトークンを取得
 * @param request NextRequest オブジェクト
 * @returns CSRFトークン
 */
export function getCSRFTokenFromRequest(request: Request): string | null {
  // ヘッダーからトークンを取得
  const headerToken = request.headers.get('X-CSRF-Token') || 
                      request.headers.get('X-XSRF-Token') ||
                      request.headers.get('x-csrf-token') ||
                      request.headers.get('x-xsrf-token')
  
  if (headerToken) {
    return headerToken
  }
  
  // Cookieからトークンを取得 (フォールバック)
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      if (key && value) {
        acc[key] = decodeURIComponent(value)
      }
      return acc
    }, {} as Record<string, string>)
    
    return cookies['XSRF-TOKEN'] || null
  }
  
  return null
}

/**
 * セッションIDからCSRFシークレットを取得
 * @param sessionId セッションID
 * @returns CSRFシークレット
 */
export function getCSRFSecret(sessionId: string): string {
  // セッションIDを使ってユニークなシークレットを生成
  return createHmac('sha256', process.env.CSRF_SECRET || 'default-secret')
    .update(sessionId)
    .digest('hex')
}