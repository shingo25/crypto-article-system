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
      signal: AbortSignal.timeout(30000), // 30秒タイムアウト
      ...options,
    }

    console.log(`API Request: ${config.method || 'GET'} ${url}`) // デバッグ用ログ

    try {
      const response = await fetch(url, config)
      
      console.log(`API Response: ${response.status} ${response.statusText}`) // デバッグ用ログ
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          if (errorData.detail) {
            errorMessage += ` - ${errorData.detail}`
          }
        } catch {
          // JSON解析失敗時は元のメッセージを使用
        }
        console.error('API Error:', errorMessage)
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      console.log('API Success:', data) // デバッグ用ログ
      return data
    } catch (error) {
      console.error('API request failed:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('サーバーに接続できません。APIサーバーが起動しているか確認してください。')
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('リクエストがタイムアウトしました。')
      }
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
    offset?: number
    priority?: string
    source?: string
    sortBy?: string
    force_refresh?: boolean
  }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())
    if (params?.priority) searchParams.set('priority', params.priority)
    if (params?.source) searchParams.set('source', params.source)
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy)
    if (params?.force_refresh) searchParams.set('force_refresh', 'true')
    
    const endpoint = `/api/topics${searchParams.toString() ? `?${searchParams}` : ''}`
    return this.request<{
      topics: Array<{
        id: string
        title: string
        priority: string
        score: number
        coins: string[]
        collectedAt: string
        source?: string
        sourceUrl?: string
      }>
      pagination: {
        total: number
        offset: number
        limit: number
        hasMore: boolean
      }
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

  // 記事生成（詳細設定版）
  async generateArticleWithConfig(config: any) {
    return this.request<{
      success: boolean
      articleId?: string
      message: string
    }>('/api/articles/generate', {
      method: 'POST',
      body: JSON.stringify({
        topicId: config.topicId,
        type: config.articleType,
        depth: config.depth,
        keywords: config.keywords,
        wordCount: config.wordCount,
        tone: config.tone,
        includeImages: config.includeImages,
        includeCharts: config.includeCharts,
        includeSources: config.includeSources,
        customInstructions: config.customInstructions
      })
    })
  }

  // トピック更新
  async updateTopic(topicId: string, updates: any) {
    return this.request(`/api/topics/${topicId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  // トピック削除
  async deleteTopic(topicId: string) {
    return this.request(`/api/topics/${topicId}`, {
      method: 'DELETE'
    })
  }

  // 記事更新
  async updateArticle(articleId: string, updates: any) {
    return this.request(`/api/articles/${articleId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  // 記事削除
  async deleteArticle(articleId: string) {
    return this.request(`/api/articles/${articleId}`, {
      method: 'DELETE'
    })
  }

  // 記事公開
  async publishArticle(articleId: string) {
    return this.request(`/api/articles/${articleId}/publish`, {
      method: 'POST'
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

  // セキュア設定管理
  async getSecureConfig() {
    return this.request<{
      success: boolean
      config: Record<string, any>
      total_keys: number
    }>('/api/secure-config')
  }

  async updateSecureConfig(config: Record<string, any>) {
    return this.request<{
      success: boolean
      message: string
      updated_keys?: string[]
      errors?: Record<string, string>
    }>('/api/secure-config', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  async validateSecureConfig(config: Record<string, any>) {
    return this.request<{
      valid: boolean
      errors: Record<string, string>
      message: string
    }>('/api/secure-config/validate', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  async backupSecureConfig() {
    return this.request<{
      success: boolean
      message: string
      backup_file?: string
    }>('/api/secure-config/backup', {
      method: 'POST'
    })
  }

  async getConfigKeys() {
    return this.request<{
      sensitive_keys: string[]
      normal_keys: string[]
      key_descriptions: Record<string, string>
    }>('/api/secure-config/keys')
  }

  // ソース管理
  async getSources() {
    return this.request<{
      success: boolean
      sources: Array<{
        id: string
        name: string
        type: string
        url: string
        active: boolean
        description?: string
        itemsCollected?: number
        lastUpdate?: string
      }>
    }>('/api/sources')
  }

  async addSource(source: {
    name: string
    type: string
    url: string
    description?: string
    active?: boolean
  }) {
    return this.request<{
      success: boolean
      source: any
      message: string
    }>('/api/sources', {
      method: 'POST',
      body: JSON.stringify(source)
    })
  }

  async updateSource(sourceId: string, updates: any) {
    return this.request<{
      success: boolean
      message: string
    }>(`/api/sources/${sourceId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  async deleteSource(sourceId: string) {
    return this.request<{
      success: boolean
      message: string
    }>(`/api/sources/${sourceId}`, {
      method: 'DELETE'
    })
  }

  async collectFromSource(sourceId: string) {
    return this.request<{
      success: boolean
      message: string
      collected_count: number
    }>(`/api/sources/${sourceId}/collect`, {
      method: 'POST'
    })
  }

  async testSourceUrl(url: string, type: string) {
    return this.request<{
      success: boolean
      message: string
      items_found?: number
    }>('/api/sources/test', {
      method: 'POST',
      body: JSON.stringify({ url, type })
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