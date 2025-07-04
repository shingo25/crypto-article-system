import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import React from 'react'

// 認証状態の型定義
export interface User {
  id: number
  email: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  last_login?: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user?: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  full_name?: string
}

export interface APIKey {
  id: number
  name: string
  key_prefix: string
  permissions: string
  is_active: boolean
  created_at: string
  last_used_at?: string
  usage_count: number
  expires_at?: string
}

export interface AuthState {
  // 状態
  user: User | null
  tokens: AuthTokens | null
  apiKeys: APIKey[]
  isLoading: boolean
  isAuthenticated: boolean
  
  // アクション
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  loadUserProfile: () => Promise<void>
  
  // APIキー管理
  createAPIKey: (name: string, permissions?: string[], expires_days?: number) => Promise<{ api_key: string; key_id: number }>
  loadAPIKeys: () => Promise<void>
  revokeAPIKey: (keyId: number) => Promise<void>
  
  // ユーティリティ
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

// APIクライアントの設定
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class AuthAPI {
  private static instance: AuthAPI
  private baseURL: string
  
  constructor() {
    this.baseURL = API_BASE_URL
  }
  
  static getInstance(): AuthAPI {
    if (!AuthAPI.instance) {
      AuthAPI.instance = new AuthAPI()
    }
    return AuthAPI.instance
  }
  
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
    
    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(errorData.detail || 'API request failed')
      ;(error as any).response = { 
        status: response.status, 
        data: errorData 
      }
      throw error
    }
    
    return response.json()
  }
  
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    return this.request<AuthTokens>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }
  
  async register(data: RegisterData): Promise<User> {
    return this.request<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  
  async logout(token: string): Promise<void> {
    await this.request('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
  }
  
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return this.request<AuthTokens>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  }
  
  async getUserProfile(token: string): Promise<User> {
    return this.request<User>('/api/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
  }
  
  async createAPIKey(
    token: string, 
    name: string, 
    permissions?: string[], 
    expires_days?: number
  ): Promise<{ api_key: string; key_id: number; key_name: string; warning: string }> {
    return this.request('/api/auth/api-keys', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        permissions: permissions || ['read'],
        expires_days,
      }),
    })
  }
  
  async getAPIKeys(token: string): Promise<APIKey[]> {
    return this.request<APIKey[]>('/api/auth/api-keys', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
  }
  
  async revokeAPIKey(token: string, keyId: number): Promise<void> {
    await this.request(`/api/auth/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
  }
}

// Zustand ストア
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        user: null,
        tokens: null,
        apiKeys: [],
        isLoading: false,
        isAuthenticated: false,
        
        // ログイン
        login: async (email: string, password: string) => {
          set({ isLoading: true })
          
          try {
            const api = AuthAPI.getInstance()
            const response = await api.login({ email, password })
            
            // レスポンスに含まれるユーザー情報を使用
            const user = response.user
            const tokens = {
              access_token: response.access_token,
              refresh_token: response.refresh_token,
              token_type: response.token_type,
              expires_in: response.expires_in
            }
            
            set({
              user,
              tokens,
              isAuthenticated: true,
              isLoading: false,
            })
            
          } catch (error) {
            set({ isLoading: false })
            throw error
          }
        },
        
        // 新規登録
        register: async (data: RegisterData) => {
          set({ isLoading: true })
          
          try {
            const api = AuthAPI.getInstance()
            await api.register(data)
            set({ isLoading: false })
          } catch (error) {
            set({ isLoading: false })
            throw error
          }
        },
        
        // ログアウト
        logout: async () => {
          const { tokens } = get()
          
          try {
            if (tokens) {
              const api = AuthAPI.getInstance()
              await api.logout(tokens.access_token)
            }
          } catch (error) {
            console.warn('Logout API call failed:', error)
          } finally {
            get().clearAuth()
          }
        },
        
        // トークン更新
        refreshToken: async () => {
          const { tokens } = get()
          
          if (!tokens?.refresh_token) {
            get().clearAuth()
            throw new Error('No refresh token available')
          }
          
          try {
            const api = AuthAPI.getInstance()
            const newTokens = await api.refreshToken(tokens.refresh_token)
            
            set({ tokens: newTokens })
          } catch (error) {
            get().clearAuth()
            throw error
          }
        },
        
        // ユーザープロフィール読み込み
        loadUserProfile: async () => {
          const { tokens } = get()
          
          if (!tokens?.access_token) {
            throw new Error('No access token available')
          }
          
          try {
            const api = AuthAPI.getInstance()
            const user = await api.getUserProfile(tokens.access_token)
            set({ user })
          } catch (error) {
            // トークンが無効な場合はリフレッシュを試行
            if ((error as any).response?.status === 401) {
              await get().refreshToken()
              const { tokens: newTokens } = get()
              if (newTokens) {
                const user = await api.getUserProfile(newTokens.access_token)
                set({ user })
                return
              }
            }
            throw error
          }
        },
        
        // APIキー作成
        createAPIKey: async (name: string, permissions?: string[], expires_days?: number) => {
          const { tokens } = get()
          
          if (!tokens?.access_token) {
            throw new Error('認証が必要です')
          }
          
          try {
            const api = AuthAPI.getInstance()
            const result = await api.createAPIKey(tokens.access_token, name, permissions, expires_days)
            
            // APIキー一覧を更新
            await get().loadAPIKeys()
            
            return {
              api_key: result.api_key,
              key_id: result.key_id
            }
          } catch (error) {
            if ((error as any).response?.status === 401) {
              await get().refreshToken()
              return get().createAPIKey(name, permissions, expires_days)
            }
            throw error
          }
        },
        
        // APIキー一覧読み込み
        loadAPIKeys: async () => {
          const { tokens } = get()
          
          if (!tokens?.access_token) {
            return
          }
          
          try {
            const api = AuthAPI.getInstance()
            const apiKeys = await api.getAPIKeys(tokens.access_token)
            set({ apiKeys })
          } catch (error) {
            if ((error as any).response?.status === 401) {
              await get().refreshToken()
              return get().loadAPIKeys()
            }
            console.error('Failed to load API keys:', error)
          }
        },
        
        // APIキー無効化
        revokeAPIKey: async (keyId: number) => {
          const { tokens } = get()
          
          if (!tokens?.access_token) {
            throw new Error('認証が必要です')
          }
          
          try {
            const api = AuthAPI.getInstance()
            await api.revokeAPIKey(tokens.access_token, keyId)
            
            // APIキー一覧を更新
            await get().loadAPIKeys()
          } catch (error) {
            if ((error as any).response?.status === 401) {
              await get().refreshToken()
              return get().revokeAPIKey(keyId)
            }
            throw error
          }
        },
        
        // 認証状態をクリア
        clearAuth: () => {
          set({
            user: null,
            tokens: null,
            apiKeys: [],
            isAuthenticated: false,
            isLoading: false,
          })
        },
        
        // ローディング状態設定
        setLoading: (loading: boolean) => {
          set({ isLoading: loading })
        },
      }),
      {
        name: 'auth-storage',
        // セキュリティのためリフレッシュトークンは永続化しない
        partialize: (state) => ({
          user: state.user,
          tokens: state.tokens ? {
            ...state.tokens,
            refresh_token: undefined // リフレッシュトークンは永続化しない
          } : null,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
)

// 自動トークンリフレッシュのフック
export const useTokenRefresh = () => {
  const { tokens, refreshToken, clearAuth } = useAuthStore()
  
  React.useEffect(() => {
    if (!tokens?.access_token) return
    
    // トークンの有効期限をチェック（有効期限の5分前にリフレッシュ）
    const refreshThreshold = (tokens.expires_in - 300) * 1000 // 5分前
    
    const timer = setTimeout(async () => {
      try {
        await refreshToken()
      } catch (error) {
        console.error('Token refresh failed:', error)
        clearAuth()
      }
    }, refreshThreshold)
    
    return () => clearTimeout(timer)
  }, [tokens, refreshToken, clearAuth])
}

// APIリクエスト用のトークン取得フック
export const useAuthToken = () => {
  const { tokens, refreshToken } = useAuthStore()
  
  const getValidToken = async (): Promise<string | null> => {
    if (!tokens?.access_token) {
      return null
    }
    
    // トークンの有効期限チェック（簡易版）
    try {
      // トークンが期限切れの場合はリフレッシュを試行
      await refreshToken()
      return useAuthStore.getState().tokens?.access_token || null
    } catch (error) {
      return null
    }
  }
  
  return { getValidToken }
}