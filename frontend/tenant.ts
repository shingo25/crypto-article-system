import { createComponentLogger } from './simple-logger'
import { AppError, ErrorType } from './error-handler'
// import { redisCache } from './redis' // サーバーサイドのみで使用

const componentLogger = createComponentLogger('TenantManager')

// テナント設定
export interface Tenant {
  id: string
  slug: string // URLスラッグ（subdomain）
  name: string
  displayName: string
  description?: string
  logo?: string
  favicon?: string
  primaryColor: string
  secondaryColor: string
  customDomain?: string
  settings: TenantSettings
  features: TenantFeatures
  subscription: TenantSubscription
  metadata: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// テナント設定
export interface TenantSettings {
  // AI設定
  aiModels: {
    preferred: 'openai' | 'claude' | 'gemini'
    maxTokens: number
    temperature: number
    customPrompts?: Record<string, string>
  }
  
  // 記事設定
  articleConfig: {
    defaultWordCount: number
    autoPublish: boolean
    requireApproval: boolean
    categories: string[]
    tags: string[]
  }
  
  // 通知設定
  notifications: {
    email: boolean
    slack?: {
      webhookUrl: string
      channel: string
    }
    webhook?: {
      url: string
      secret: string
    }
  }
  
  // ローカライゼーション
  localization: {
    defaultLanguage: string
    supportedLanguages: string[]
    timezone: string
    dateFormat: string
  }
  
  // SEO設定
  seo: {
    defaultTitle?: string
    defaultDescription?: string
    keywords?: string[]
    ogImage?: string
  }
}

// テナント機能フラグ
export interface TenantFeatures {
  articles: boolean
  topics: boolean
  rss: boolean
  analytics: boolean
  workflow: boolean
  api: boolean
  customBranding: boolean
  multiUser: boolean
  advancedAnalytics: boolean
  realtimeData: boolean
  aiRecommendations: boolean
  compliance: boolean
}

// テナントサブスクリプション
export interface TenantSubscription {
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodEnd?: string
  cancelAtPeriodEnd: boolean
  limits: {
    monthlyArticles: number
    monthlyApiCalls: number
    users: number
    storage: number // GB
  }
  usage: {
    articlesCreated: number
    apiCallsMade: number
    storageUsed: number // GB
  }
}

// テナントユーザー
export interface TenantUser {
  id: string
  tenantId: string
  userId: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  permissions: string[]
  isActive: boolean
  joinedAt: string
}

// テナントコンテキスト
export interface TenantContext {
  tenant: Tenant
  user?: TenantUser
  permissions: string[]
}

// プラン設定
const PLAN_LIMITS = {
  free: {
    monthlyArticles: 10,
    monthlyApiCalls: 1000,
    users: 1,
    storage: 1
  },
  starter: {
    monthlyArticles: 100,
    monthlyApiCalls: 10000,
    users: 5,
    storage: 10
  },
  professional: {
    monthlyArticles: 1000,
    monthlyApiCalls: 100000,
    users: 20,
    storage: 50
  },
  enterprise: {
    monthlyArticles: -1, // 無制限
    monthlyApiCalls: -1,
    users: -1,
    storage: 500
  }
}

// プラン別機能
const PLAN_FEATURES = {
  free: {
    articles: true,
    topics: true,
    rss: false,
    analytics: false,
    workflow: false,
    api: false,
    customBranding: false,
    multiUser: false,
    advancedAnalytics: false,
    realtimeData: false,
    aiRecommendations: false,
    compliance: false
  },
  starter: {
    articles: true,
    topics: true,
    rss: true,
    analytics: true,
    workflow: true,
    api: false,
    customBranding: false,
    multiUser: true,
    advancedAnalytics: false,
    realtimeData: false,
    aiRecommendations: false,
    compliance: false
  },
  professional: {
    articles: true,
    topics: true,
    rss: true,
    analytics: true,
    workflow: true,
    api: true,
    customBranding: true,
    multiUser: true,
    advancedAnalytics: true,
    realtimeData: false,
    aiRecommendations: true,
    compliance: true
  },
  enterprise: {
    articles: true,
    topics: true,
    rss: true,
    analytics: true,
    workflow: true,
    api: true,
    customBranding: true,
    multiUser: true,
    advancedAnalytics: true,
    realtimeData: true,
    aiRecommendations: true,
    compliance: true
  }
}

// テナント管理クラス
export class TenantManager {
  private static instance: TenantManager

  public static getInstance(): TenantManager {
    if (!TenantManager.instance) {
      TenantManager.instance = new TenantManager()
    }
    return TenantManager.instance
  }

  // テナントを作成
  public async createTenant(config: {
    slug: string
    name: string
    displayName: string
    email: string
    plan?: 'free' | 'starter' | 'professional' | 'enterprise'
  }): Promise<Tenant> {
    try {
      componentLogger.info('テナント作成を開始', { slug: config.slug, plan: config.plan })

      // スラッグの重複チェック
      const existing = await this.getTenantBySlug(config.slug)
      if (existing) {
        throw new AppError('Tenant slug already exists', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'SLUG_EXISTS',
          statusCode: 400,
          userMessage: 'このURLは既に使用されています'
        })
      }

      const plan = config.plan || 'free'
      const tenant: Tenant = {
        id: `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        slug: config.slug,
        name: config.name,
        displayName: config.displayName,
        primaryColor: '#1a1a1a',
        secondaryColor: '#3b82f6',
        settings: this.getDefaultSettings(),
        features: PLAN_FEATURES[plan],
        subscription: {
          plan,
          status: plan === 'free' ? 'active' : 'trialing',
          cancelAtPeriodEnd: false,
          limits: PLAN_LIMITS[plan],
          usage: {
            articlesCreated: 0,
            apiCallsMade: 0,
            storageUsed: 0
          }
        },
        metadata: {},
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // データベースに保存
      await this.saveTenant(tenant)

      componentLogger.business('テナント作成完了', {
        tenantId: tenant.id,
        slug: tenant.slug,
        plan
      })

      return tenant
    } catch (error) {
      componentLogger.error('テナント作成に失敗', error as Error)
      throw error
    }
  }

  // ドメインからテナントを取得
  public async getTenantFromDomain(domain: string): Promise<Tenant | null> {
    try {
      // キャッシュチェック
      const cacheKey = `tenant:domain:${domain}`
      // const cached = await redisCache.get<Tenant>(cacheKey)
      // if (cached) {
      //   return cached
      // }

      let tenant: Tenant | null = null

      // カスタムドメインをチェック
      tenant = await this.getTenantByCustomDomain(domain)
      
      if (!tenant) {
        // サブドメインから取得
        const subdomain = this.extractSubdomain(domain)
        if (subdomain && subdomain !== 'www') {
          tenant = await this.getTenantBySlug(subdomain)
        }
      }

      if (tenant) {
        // await redisCache.set(cacheKey, tenant, 300) // 5分キャッシュ
      }

      return tenant
    } catch (error) {
      componentLogger.error('ドメインからテナント取得に失敗', error as Error, { domain })
      return null
    }
  }

  // テナントコンテキストを取得
  public async getTenantContext(
    tenantId: string,
    userId?: string
  ): Promise<TenantContext> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new AppError('Tenant not found', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'TENANT_NOT_FOUND',
        statusCode: 404
      })
    }

    if (!tenant.isActive) {
      throw new AppError('Tenant is not active', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'TENANT_INACTIVE',
        statusCode: 403
      })
    }

    let user: TenantUser | undefined
    let permissions: string[] = []

    if (userId) {
      user = await this.getTenantUser(tenantId, userId)
      if (user) {
        permissions = await this.getUserPermissions(user)
      }
    }

    return { tenant, user, permissions }
  }

  // 使用量をチェック
  public async checkUsageLimit(
    tenantId: string,
    resource: 'articles' | 'api' | 'storage',
    amount: number = 1
  ): Promise<{ allowed: boolean; remaining: number }> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      return { allowed: false, remaining: 0 }
    }

    const { limits, usage } = tenant.subscription

    switch (resource) {
      case 'articles':
        if (limits.monthlyArticles === -1) {
          return { allowed: true, remaining: -1 }
        }
        const articlesRemaining = limits.monthlyArticles - usage.articlesCreated
        return {
          allowed: articlesRemaining >= amount,
          remaining: Math.max(0, articlesRemaining)
        }

      case 'api':
        if (limits.monthlyApiCalls === -1) {
          return { allowed: true, remaining: -1 }
        }
        const apiRemaining = limits.monthlyApiCalls - usage.apiCallsMade
        return {
          allowed: apiRemaining >= amount,
          remaining: Math.max(0, apiRemaining)
        }

      case 'storage':
        if (limits.storage === -1) {
          return { allowed: true, remaining: -1 }
        }
        const storageRemaining = limits.storage - usage.storageUsed
        return {
          allowed: storageRemaining >= amount,
          remaining: Math.max(0, storageRemaining)
        }

      default:
        return { allowed: false, remaining: 0 }
    }
  }

  // 使用量を記録
  public async recordUsage(
    tenantId: string,
    resource: 'articles' | 'api' | 'storage',
    amount: number = 1
  ): Promise<void> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) return

    switch (resource) {
      case 'articles':
        tenant.subscription.usage.articlesCreated += amount
        break
      case 'api':
        tenant.subscription.usage.apiCallsMade += amount
        break
      case 'storage':
        tenant.subscription.usage.storageUsed += amount
        break
    }

    tenant.updatedAt = new Date().toISOString()
    await this.saveTenant(tenant)

    componentLogger.debug('使用量を記録', {
      tenantId,
      resource,
      amount,
      newUsage: tenant.subscription.usage
    })
  }

  // 機能が有効かチェック
  public hasFeature(tenant: Tenant, feature: keyof TenantFeatures): boolean {
    return tenant.features[feature] === true
  }

  // テナント設定を更新
  public async updateTenantSettings(
    tenantId: string,
    updates: Partial<TenantSettings>
  ): Promise<Tenant> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new AppError('Tenant not found', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'TENANT_NOT_FOUND',
        statusCode: 404
      })
    }

    tenant.settings = {
      ...tenant.settings,
      ...updates
    }
    tenant.updatedAt = new Date().toISOString()

    await this.saveTenant(tenant)

    componentLogger.business('テナント設定更新', {
      tenantId,
      updatedFields: Object.keys(updates)
    })

    return tenant
  }

  // カスタマイズ設定を更新
  public async updateTenantBranding(
    tenantId: string,
    branding: {
      displayName?: string
      logo?: string
      favicon?: string
      primaryColor?: string
      secondaryColor?: string
    }
  ): Promise<Tenant> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) {
      throw new AppError('Tenant not found', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'TENANT_NOT_FOUND',
        statusCode: 404
      })
    }

    if (!this.hasFeature(tenant, 'customBranding')) {
      throw new AppError('Custom branding not available in current plan', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'FEATURE_NOT_AVAILABLE',
        statusCode: 403,
        userMessage: 'カスタムブランディングは現在のプランでは利用できません'
      })
    }

    Object.assign(tenant, branding)
    tenant.updatedAt = new Date().toISOString()

    await this.saveTenant(tenant)

    componentLogger.business('テナントブランディング更新', {
      tenantId,
      updatedFields: Object.keys(branding)
    })

    return tenant
  }

  // プライベートメソッド

  private async getTenant(tenantId: string): Promise<Tenant | null> {
    const cacheKey = `tenant:${tenantId}`
    // const cached = await redisCache.get<Tenant>(cacheKey)
    // if (cached) {
    //   return cached
    // }

    // 実際の実装では、データベースから取得
    // ここでは仮のデータを返す
    const mockTenant: Tenant = {
      id: tenantId,
      slug: 'demo',
      name: 'Demo Tenant',
      displayName: 'Demo Crypto News',
      primaryColor: '#1a1a1a',
      secondaryColor: '#3b82f6',
      settings: this.getDefaultSettings(),
      features: PLAN_FEATURES.professional,
      subscription: {
        plan: 'professional',
        status: 'active',
        cancelAtPeriodEnd: false,
        limits: PLAN_LIMITS.professional,
        usage: {
          articlesCreated: 45,
          apiCallsMade: 12500,
          storageUsed: 5.2
        }
      },
      metadata: {},
      isActive: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }

    // await redisCache.set(cacheKey, mockTenant, 300)
    return mockTenant
  }

  private async getTenantBySlug(slug: string): Promise<Tenant | null> {
    // 実際の実装では、データベースクエリ
    if (slug === 'demo') {
      return this.getTenant('tenant_demo')
    }
    return null
  }

  private async getTenantByCustomDomain(domain: string): Promise<Tenant | null> {
    // 実際の実装では、カスタムドメインでデータベース検索
    return null
  }

  private async getTenantUser(tenantId: string, userId: string): Promise<TenantUser | null> {
    // 実際の実装では、データベースから取得
    return {
      id: `tu_${tenantId}_${userId}`,
      tenantId,
      userId,
      role: 'admin',
      permissions: ['articles:*', 'topics:*', 'settings:read'],
      isActive: true,
      joinedAt: new Date().toISOString()
    }
  }

  private async getUserPermissions(user: TenantUser): Promise<string[]> {
    // ロールに基づく権限を展開
    const rolePermissions: Record<string, string[]> = {
      owner: ['*'],
      admin: ['articles:*', 'topics:*', 'rss:*', 'users:*', 'settings:*'],
      editor: ['articles:*', 'topics:*', 'rss:read'],
      viewer: ['articles:read', 'topics:read', 'analytics:read']
    }

    return [...rolePermissions[user.role], ...user.permissions]
  }

  private extractSubdomain(domain: string): string | null {
    const parts = domain.split('.')
    if (parts.length >= 3) {
      return parts[0]
    }
    return null
  }

  private getDefaultSettings(): TenantSettings {
    return {
      aiModels: {
        preferred: 'openai',
        maxTokens: 1000,
        temperature: 0.7
      },
      articleConfig: {
        defaultWordCount: 800,
        autoPublish: false,
        requireApproval: true,
        categories: ['ニュース', '分析', 'トレンド', '技術'],
        tags: []
      },
      notifications: {
        email: true
      },
      localization: {
        defaultLanguage: 'ja',
        supportedLanguages: ['ja', 'en'],
        timezone: 'Asia/Tokyo',
        dateFormat: 'YYYY-MM-DD'
      },
      seo: {
        keywords: ['暗号通貨', 'ビットコイン', 'ブロックチェーン']
      }
    }
  }

  private async saveTenant(tenant: Tenant): Promise<void> {
    const cacheKey = `tenant:${tenant.id}`
    // await redisCache.set(cacheKey, tenant, 300)
    
    // 実際の実装では、データベースに保存
    componentLogger.debug('テナントを保存', { tenantId: tenant.id })
  }

  // 統計情報
  public async getTenantStats(tenantId: string): Promise<{
    totalArticles: number
    totalTopics: number
    totalUsers: number
    storageUsed: number
    apiUsage: {
      daily: number
      monthly: number
    }
  }> {
    // 実際の実装では、データベースから集計
    return {
      totalArticles: 156,
      totalTopics: 423,
      totalUsers: 8,
      storageUsed: 5.2,
      apiUsage: {
        daily: 450,
        monthly: 12500
      }
    }
  }
}

// シングルトンインスタンス
export const tenantManager = TenantManager.getInstance()

// ミドルウェア用ヘルパー
export const withTenant = (
  handler: (
    request: Request,
    context: { tenant: TenantContext }
  ) => Promise<Response>
) => {
  return async (request: Request) => {
    try {
      const url = new URL(request.url)
      const tenant = await tenantManager.getTenantFromDomain(url.hostname)
      
      if (!tenant) {
        throw new AppError('Tenant not found', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'TENANT_NOT_FOUND',
          statusCode: 404
        })
      }

      // ユーザーIDは認証ミドルウェアから取得する想定
      const userId = (request as any).userId
      const context = await tenantManager.getTenantContext(tenant.id, userId)

      return await handler(request, { tenant: context })
    } catch (error) {
      componentLogger.error('テナントミドルウェアエラー', error as Error)
      throw error
    }
  }
}