'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore, useTokenRefresh } from '@/lib/stores/authStore'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: any
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

// 認証不要のパス（全ての機能ページを含む）
const PUBLIC_PATHS = ['/login', '/register', '/', '/market', '/content', '/analytics', '/settings']

// 認証が必要な操作のパス（保存系機能）
const PROTECTED_ACTIONS = [
  '/api/settings',
  '/api/rss-sources', 
  '/api/alerts/save',
  '/api/articles/save',
  '/api/templates/save'
]

export function AuthProvider({ children }: AuthProviderProps) {
  // SSR/プリレンダリング時の安全な処理
  const [isClient, setIsClient] = React.useState(false)
  
  // ルーターとパスネームを常に呼び出す（Reactの原則）
  const router = useRouter()
  const pathname = usePathname()
  
  React.useEffect(() => {
    setIsClient(true)
  }, [])
  const { 
    user, 
    tokens, 
    isLoading, 
    isAuthenticated, 
    login, 
    logout, 
    loadUserProfile,
    clearAuth,
    setLoading
  } = useAuthStore()

  // 自動トークンリフレッシュ
  useTokenRefresh()

  // 認証状態チェック（ページアクセス時はチェックしない）
  const checkAuth = React.useCallback(async () => {
    // クライアントサイドでない場合はスキップ
    if (!isClient) {
      return
    }
    
    // 全てのページは認証なしでアクセス可能
    // 認証が必要なのは保存系APIのみ
    
    // ユーザー情報がない場合で、トークンがある場合は取得を試行
    if (!user && tokens?.access_token) {
      setLoading(true)
      try {
        await loadUserProfile()
      } catch (error) {
        console.error('Failed to load user profile:', error)
        // エラーが発生してもリダイレクトしない
        clearAuth()
      } finally {
        setLoading(false)
      }
    }
  }, [isClient, tokens, user, clearAuth, loadUserProfile, setLoading])

  // ページロード時とパス変更時の認証チェック
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // ログイン後のリダイレクト処理（ログイン/登録ページからのみ）
  useEffect(() => {
    if (!isClient) return
    
    if (isAuthenticated && user && ['/login', '/register'].includes(pathname)) {
      router.push('/market')
    }
  }, [isAuthenticated, user, pathname, router, isClient])

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    checkAuth,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// オプショナルなauth hook（AuthProviderがない場合でも使用可能）
export function useOptionalAuth() {
  const context = useContext(AuthContext)
  return context || {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: async () => {},
    logout: async () => {},
    checkAuth: () => {}
  }
}

// 認証が必要なページを保護するコンポーネント
interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()

  // 公開パスの場合は保護しない
  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  // ローディング中
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen bg-neural-void flex items-center justify-center">
          <div className="neural-aurora" />
          <div className="relative z-10 text-center">
            <div className="w-12 h-12 border-4 border-neural-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-neural-text-secondary">認証中...</p>
          </div>
        </div>
      )
    )
  }

  // 認証されていない場合
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neural-void flex items-center justify-center">
        <div className="neural-aurora" />
        <div className="relative z-10 text-center">
          <h2 className="text-2xl font-bold neural-title mb-4">認証が必要です</h2>
          <p className="text-neural-text-secondary mb-6">
            このページにアクセスするにはログインしてください
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="neural-gradient-primary text-white px-6 py-2 rounded-lg"
          >
            ログインページへ
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// APIリクエスト用の認証ヘッダーを提供するフック
export function useAuthHeaders() {
  const { tokens } = useAuthStore()

  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (tokens?.access_token) {
      headers.Authorization = `Bearer ${tokens.access_token}`
    }

    return headers
  }

  return { getAuthHeaders }
}

// APIキー用のヘッダーを提供するフック
export function useAPIKeyHeaders(apiKey?: string) {
  const getAPIKeyHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (apiKey) {
      headers['X-API-Key'] = apiKey
    }

    return headers
  }

  return { getAPIKeyHeaders }
}