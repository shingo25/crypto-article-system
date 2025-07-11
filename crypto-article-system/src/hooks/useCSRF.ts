'use client'

import { useState, useEffect, useCallback } from 'react'

interface CSRFToken {
  token: string
  userId: string
}

interface UseCSRFReturn {
  token: string | null
  isLoading: boolean
  error: string | null
  refreshToken: () => Promise<void>
}

/**
 * CSRF トークン管理用カスタムフック
 */
export function useCSRF(): UseCSRFReturn {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchToken = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('認証が必要です')
        }
        throw new Error('CSRFトークンの取得に失敗しました')
      }

      const data: CSRFToken = await response.json()
      setToken(data.token)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('CSRF token fetch failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshToken = useCallback(async () => {
    await fetchToken()
  }, [fetchToken])

  // 初回ロード時にトークンを取得
  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  return {
    token,
    isLoading,
    error,
    refreshToken
  }
}

/**
 * APIリクエスト用のヘッダーを生成
 */
export function createCSRFHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['X-CSRF-Token'] = token
  }

  return headers
}