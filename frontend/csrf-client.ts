import { useState, useEffect } from 'react'

/**
 * CSRFトークンを管理するクライアント側ユーティリティ
 */

/**
 * CookieからCSRFトークンを取得
 */
export function getCSRFTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null // SSR環境では取得できない
  }
  
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'XSRF-TOKEN') {
      return decodeURIComponent(value)
    }
  }
  
  return null
}

/**
 * APIリクエストにCSRFトークンを付与するfetch wrapper
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const csrfToken = getCSRFTokenFromCookie()
  
  // CSRFトークンが必要なメソッドかチェック
  const method = options.method?.toUpperCase() || 'GET'
  const needsCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)
  
  if (needsCSRF && csrfToken) {
    // ヘッダーを設定
    const headers = new Headers(options.headers)
    headers.set('X-CSRF-Token', csrfToken)
    
    options.headers = headers
  }
  
  // 認証情報（Cookie）をリクエストに含める
  options.credentials = 'include'
  
  return fetch(url, options)
}

/**
 * CSRFトークンを含むAPIクライアント
 */
export class CSRFApiClient {
  private baseURL: string
  
  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL
  }
  
  /**
   * CSRFトークンを付与してGETリクエストを送信
   */
  async get(path: string, options: RequestInit = {}): Promise<Response> {
    return csrfFetch(`${this.baseURL}${path}`, {
      ...options,
      method: 'GET'
    })
  }
  
  /**
   * CSRFトークンを付与してPOSTリクエストを送信
   */
  async post(path: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return csrfFetch(`${this.baseURL}${path}`, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined
    })
  }
  
  /**
   * CSRFトークンを付与してPUTリクエストを送信
   */
  async put(path: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return csrfFetch(`${this.baseURL}${path}`, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined
    })
  }
  
  /**
   * CSRFトークンを付与してDELETEリクエストを送信
   */
  async delete(path: string, options: RequestInit = {}): Promise<Response> {
    return csrfFetch(`${this.baseURL}${path}`, {
      ...options,
      method: 'DELETE'
    })
  }
  
  /**
   * CSRFトークンを付与してPATCHリクエストを送信
   */
  async patch(path: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return csrfFetch(`${this.baseURL}${path}`, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined
    })
  }
}

// デフォルトのAPIクライアントインスタンス
export const apiClient = new CSRFApiClient()

/**
 * React Hook: CSRFトークンを取得
 */
export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchToken = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // まずCookieから取得を試す
        const cookieToken = getCSRFTokenFromCookie()
        if (cookieToken) {
          setToken(cookieToken)
          setIsLoading(false)
          return
        }
        
        // Cookieにない場合はAPIから取得
        const response = await fetch('/api/csrf')
        if (!response.ok) {
          throw new Error('CSRFトークンの取得に失敗しました')
        }
        
        const data = await response.json()
        setToken(data.token)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'CSRFトークンの取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchToken()
  }, [])
  
  return { token, isLoading, error }
}