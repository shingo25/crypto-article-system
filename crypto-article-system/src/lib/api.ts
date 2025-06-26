// API client for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export class APIClient {
  private baseURL: string

  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // システム統計の取得
  async getSystemStats() {
    return this.request<{
      articlesGenerated: number
      topicsCollected: number
      systemStatus: 'running' | 'stopped' | 'error'
      lastRun: string
      dailyQuota: { used: number; total: number }
    }>('/api/system/stats')
  }

  // トピック一覧の取得
  async getTopics(params?: {
    limit?: number
    priority?: string
    status?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.priority) searchParams.set('priority', params.priority)
    if (params?.status) searchParams.set('status', params.status)
    
    const endpoint = `/api/topics${searchParams.toString() ? `?${searchParams}` : ''}`
    return this.request<{
      topics: Array<{
        id: string
        title: string
        priority: string
        score: number
        coins: string[]
        collectedAt: string
      }>
    }>(endpoint)
  }

  // 記事一覧の取得
  async getArticles(params?: {
    limit?: number
    status?: string
    type?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.type) searchParams.set('type', params.type)
    
    const endpoint = `/api/articles${searchParams.toString() ? `?${searchParams}` : ''}`
    return this.request<{
      articles: Array<{
        id: string
        title: string
        type: string
        wordCount: number
        status: string
        generatedAt: string
        coins: string[]
        content?: string
      }>
    }>(endpoint)
  }

  // 記事生成の開始
  async generateArticle(topicId: string, options?: {
    type?: string
    depth?: string
    keywords?: string[]
  }) {
    return this.request<{
      success: boolean
      articleId?: string
      message: string
    }>('/api/articles/generate', {
      method: 'POST',
      body: JSON.stringify({
        topicId,
        ...options
      })
    })
  }

  // システムの開始/停止
  async controlSystem(action: 'start' | 'stop') {
    return this.request<{
      success: boolean
      status: string
      message: string
    }>('/api/system/control', {
      method: 'POST',
      body: JSON.stringify({ action })
    })
  }

  // ログの取得
  async getLogs(params?: {
    level?: string
    limit?: number
    since?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.level) searchParams.set('level', params.level)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.since) searchParams.set('since', params.since)
    
    const endpoint = `/api/logs${searchParams.toString() ? `?${searchParams}` : ''}`
    return this.request<{
      logs: Array<{
        timestamp: string
        level: string
        message: string
        component?: string
      }>
    }>(endpoint)
  }

  // WordPress設定の取得
  async getWordPressConfig() {
    return this.request<{
      url?: string
      username?: string
      connected: boolean
      lastSync?: string
    }>('/api/wordpress/config')
  }

  // WordPress設定の更新
  async updateWordPressConfig(config: {
    url: string
    username: string
    password: string
  }) {
    return this.request<{
      success: boolean
      message: string
    }>('/api/wordpress/config', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  // WordPress接続テスト
  async testWordPressConnection() {
    return this.request<{
      success: boolean
      message: string
      details?: any
    }>('/api/wordpress/test')
  }

  // 記事のWordPress投稿
  async publishToWordPress(articleId: string) {
    return this.request<{
      success: boolean
      wordpressPostId?: number
      message: string
    }>(`/api/articles/${articleId}/publish`, {
      method: 'POST'
    })
  }

  // 記事内容の取得
  async getArticleContent(articleId: string) {
    return this.request<{
      id: string
      title: string
      content: string
      htmlContent: string
      type: string
      status: string
      wordCount: number
      generatedAt: string
      coins: string[]
      factCheckResults?: any
    }>(`/api/articles/${articleId}`)
  }

  // 記事の更新
  async updateArticle(articleId: string, updates: {
    title?: string
    content?: string
    status?: string
  }) {
    return this.request<{
      success: boolean
      message: string
    }>(`/api/articles/${articleId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  }

  // ファクトチェックの実行
  async runFactCheck(articleId: string) {
    return this.request<{
      success: boolean
      results: {
        totalFacts: number
        verified: number
        failed: number
        reliabilityScore: number
        items: Array<{
          text: string
          type: string
          verified: boolean | null
          message?: string
        }>
      }
    }>(`/api/articles/${articleId}/fact-check`, {
      method: 'POST'
    })
  }

  // API設定の取得
  async getAPIConfig() {
    return this.request<{
      config: {
        openai_api_key: string
        gemini_api_key: string
        wordpress_url: string
        wordpress_username: string
        wordpress_password: string
        coinmarketcap_api_key: string
        max_articles_per_day: number
        default_article_depth: string
        default_word_count_min: number
        default_word_count_max: number
      }
    }>('/api/settings/config')
  }

  // API設定の更新
  async updateAPIConfig(config: {
    openai_api_key?: string
    gemini_api_key?: string
    wordpress_url?: string
    wordpress_username?: string
    wordpress_password?: string
    coinmarketcap_api_key?: string
  }) {
    return this.request<{
      success: boolean
      message: string
      updated_keys: string[]
    }>('/api/settings/config', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  // API接続テスト
  async testAPIConnections() {
    return this.request<{
      results: {
        [apiName: string]: {
          status: 'success' | 'error' | 'not_configured'
          message: string
          configured: boolean
        }
      }
    }>('/api/settings/test-connection', {
      method: 'POST'
    })
  }
}

// シングルトンのAPIクライアントインスタンス
export const apiClient = new APIClient()

// React hooks for common API operations
export const useAPI = () => {
  return {
    getSystemStats: () => apiClient.getSystemStats(),
    getTopics: (params?: Parameters<typeof apiClient.getTopics>[0]) =>
      apiClient.getTopics(params),
    getArticles: (params?: Parameters<typeof apiClient.getArticles>[0]) =>
      apiClient.getArticles(params),
    generateArticle: (topicId: string, options?: Parameters<typeof apiClient.generateArticle>[1]) =>
      apiClient.generateArticle(topicId, options),
    controlSystem: (action: 'start' | 'stop') =>
      apiClient.controlSystem(action),
    getLogs: (params?: Parameters<typeof apiClient.getLogs>[0]) =>
      apiClient.getLogs(params),
  }
}