import { createComponentLogger } from './logger'
import { AppError, ErrorType } from './error-handler'
import { tenantManager } from './tenant'

const componentLogger = createComponentLogger('ContentDistribution')

// コンテンツ配信の型定義
export interface ContentItem {
  id: string
  tenantId: string
  type: 'article' | 'topic' | 'analysis'
  title: string
  content: string
  summary: string
  metadata: {
    author?: string
    tags: string[]
    categories: string[]
    publishedAt: string
    updatedAt: string
    status: 'draft' | 'published' | 'archived'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    language: string
    readingTime: number
    wordCount: number
    sentiment?: 'positive' | 'negative' | 'neutral'
    confidence?: number
  }
  distribution: {
    channels: ('rss' | 'webhook' | 'email' | 'api')[]
    schedule?: string // cron format
    publishedChannels: string[]
    failedChannels: string[]
  }
  analytics: {
    views: number
    downloads: number
    apiAccess: number
    lastAccessed?: string
    topReferrers: string[]
  }
}

export interface DistributionChannel {
  id: string
  tenantId: string
  name: string
  type: 'rss' | 'webhook' | 'email' | 'api'
  config: {
    // RSS設定
    title?: string
    description?: string
    link?: string
    image?: string
    
    // Webhook設定
    url?: string
    method?: 'POST' | 'PUT'
    headers?: Record<string, string>
    authType?: 'none' | 'basic' | 'bearer' | 'api_key'
    authConfig?: Record<string, string>
    
    // Email設定
    recipients?: string[]
    template?: string
    subject?: string
    
    // API設定
    endpoint?: string
    format?: 'json' | 'xml' | 'rss'
    compression?: boolean
    rateLimiting?: {
      requests: number
      per: 'minute' | 'hour' | 'day'
    }
  }
  isActive: boolean
  lastSync?: string
  syncStats: {
    totalSent: number
    successCount: number
    errorCount: number
    lastError?: string
  }
  createdAt: string
  updatedAt: string
}

export interface ContentFilter {
  categories?: string[]
  tags?: string[]
  status?: ('draft' | 'published' | 'archived')[]
  priority?: ('low' | 'medium' | 'high' | 'urgent')[]
  dateRange?: {
    from: string
    to: string
  }
  language?: string[]
  minConfidence?: number
  sentiment?: ('positive' | 'negative' | 'neutral')[]
}

export interface DistributionResult {
  channelId: string
  success: boolean
  contentId: string
  sentAt: string
  error?: string
  responseData?: any
}

// コンテンツ配信管理クラス
export class ContentDistributionManager {
  private static instance: ContentDistributionManager
  private channels: Map<string, DistributionChannel> = new Map()
  private content: Map<string, ContentItem> = new Map()
  private distributionQueue: Array<{ contentId: string; channelId: string; scheduledAt: Date }> = []

  public static getInstance(): ContentDistributionManager {
    if (!ContentDistributionManager.instance) {
      ContentDistributionManager.instance = new ContentDistributionManager()
    }
    return ContentDistributionManager.instance
  }

  // コンテンツ登録
  public async registerContent(content: Omit<ContentItem, 'id' | 'analytics'>): Promise<ContentItem> {
    try {
      const contentItem: ContentItem = {
        ...content,
        id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        analytics: {
          views: 0,
          downloads: 0,
          apiAccess: 0,
          topReferrers: []
        }
      }

      this.content.set(contentItem.id, contentItem)
      
      // 自動配信チャンネルをチェック
      await this.scheduleDistribution(contentItem.id)

      componentLogger.info('コンテンツを登録', {
        contentId: contentItem.id,
        type: contentItem.type,
        title: contentItem.title,
        tenantId: contentItem.tenantId
      })

      return contentItem
    } catch (error) {
      componentLogger.error('コンテンツ登録に失敗', error as Error)
      throw error
    }
  }

  // 配信チャンネル作成
  public async createDistributionChannel(
    tenantId: string,
    channelData: Omit<DistributionChannel, 'id' | 'tenantId' | 'syncStats' | 'createdAt' | 'updatedAt'>
  ): Promise<DistributionChannel> {
    try {
      // テナントの機能チェック
      const context = await tenantManager.getTenantContext(tenantId)
      if (!tenantManager.hasFeature(context.tenant, 'api')) {
        throw new AppError('API feature not available in current plan', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'FEATURE_NOT_AVAILABLE',
          statusCode: 403,
          userMessage: 'API機能は現在のプランでは利用できません'
        })
      }

      const channel: DistributionChannel = {
        ...channelData,
        id: `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        syncStats: {
          totalSent: 0,
          successCount: 0,
          errorCount: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // バリデーション
      this.validateChannelConfig(channel)

      this.channels.set(channel.id, channel)
      await this.saveChannel(channel)

      componentLogger.business('配信チャンネルを作成', {
        channelId: channel.id,
        type: channel.type,
        name: channel.name,
        tenantId
      })

      return channel
    } catch (error) {
      componentLogger.error('配信チャンネル作成に失敗', error as Error)
      throw error
    }
  }

  // コンテンツ配信
  public async distributeContent(
    contentId: string,
    channelIds?: string[],
    force = false
  ): Promise<DistributionResult[]> {
    try {
      const content = this.content.get(contentId)
      if (!content) {
        throw new AppError('Content not found', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'CONTENT_NOT_FOUND',
          statusCode: 404,
          userMessage: 'コンテンツが見つかりません'
        })
      }

      // 配信対象チャンネルを決定
      const targetChannels = channelIds 
        ? channelIds.map(id => this.channels.get(id)).filter(Boolean) as DistributionChannel[]
        : Array.from(this.channels.values()).filter(
            channel => channel.tenantId === content.tenantId && 
                      channel.isActive &&
                      content.distribution.channels.includes(channel.type)
          )

      const results: DistributionResult[] = []

      for (const channel of targetChannels) {
        try {
          // 重複配信チェック
          if (!force && content.distribution.publishedChannels.includes(channel.id)) {
            componentLogger.debug('コンテンツは既に配信済み', { contentId, channelId: channel.id })
            continue
          }

          const result = await this.sendToChannel(content, channel)
          results.push(result)

          // 配信結果を記録
          if (result.success) {
            content.distribution.publishedChannels.push(channel.id)
            content.distribution.failedChannels = content.distribution.failedChannels.filter(
              id => id !== channel.id
            )
            
            // チャンネル統計更新
            channel.syncStats.successCount++
            channel.syncStats.totalSent++
            channel.lastSync = new Date().toISOString()
          } else {
            if (!content.distribution.failedChannels.includes(channel.id)) {
              content.distribution.failedChannels.push(channel.id)
            }
            
            // チャンネル統計更新
            channel.syncStats.errorCount++
            channel.syncStats.totalSent++
            channel.syncStats.lastError = result.error
          }

          // 保存
          await this.saveContent(content)
          await this.saveChannel(channel)

        } catch (error) {
          componentLogger.error('チャンネル配信に失敗', error as Error, {
            contentId,
            channelId: channel.id
          })
          
          results.push({
            channelId: channel.id,
            success: false,
            contentId,
            sentAt: new Date().toISOString(),
            error: (error as Error).message
          })
        }
      }

      componentLogger.business('コンテンツ配信完了', {
        contentId,
        channelsAttempted: targetChannels.length,
        successCount: results.filter(r => r.success).length,
        errorCount: results.filter(r => !r.success).length
      })

      return results
    } catch (error) {
      componentLogger.error('コンテンツ配信に失敗', error as Error)
      throw error
    }
  }

  // チャンネル別配信実装
  private async sendToChannel(content: ContentItem, channel: DistributionChannel): Promise<DistributionResult> {
    const startTime = Date.now()

    try {
      let responseData: any = null

      switch (channel.type) {
        case 'webhook':
          responseData = await this.sendWebhook(content, channel)
          break
        case 'email':
          responseData = await this.sendEmail(content, channel)
          break
        case 'rss':
          responseData = await this.updateRssFeed(content, channel)
          break
        case 'api':
          responseData = await this.sendToApi(content, channel)
          break
        default:
          throw new Error(`Unsupported channel type: ${channel.type}`)
      }

      componentLogger.performance(`${channel.type}配信`, Date.now() - startTime, {
        contentId: content.id,
        channelId: channel.id
      })

      return {
        channelId: channel.id,
        success: true,
        contentId: content.id,
        sentAt: new Date().toISOString(),
        responseData
      }
    } catch (error) {
      componentLogger.error(`${channel.type}配信に失敗`, error as Error, {
        contentId: content.id,
        channelId: channel.id,
        duration: Date.now() - startTime
      })

      return {
        channelId: channel.id,
        success: false,
        contentId: content.id,
        sentAt: new Date().toISOString(),
        error: (error as Error).message
      }
    }
  }

  // Webhook配信
  private async sendWebhook(content: ContentItem, channel: DistributionChannel): Promise<any> {
    const { config } = channel
    if (!config.url) {
      throw new Error('Webhook URL not configured')
    }

    const payload = {
      event: 'content.published',
      content: {
        id: content.id,
        type: content.type,
        title: content.title,
        summary: content.summary,
        content: content.content,
        metadata: content.metadata,
        publishedAt: content.metadata.publishedAt
      },
      tenant: content.tenantId,
      timestamp: new Date().toISOString()
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CryptoAI-ContentDistribution/1.0',
      ...config.headers
    }

    // 認証設定
    if (config.authType === 'bearer' && config.authConfig?.token) {
      headers['Authorization'] = `Bearer ${config.authConfig.token}`
    } else if (config.authType === 'api_key' && config.authConfig?.key) {
      headers['X-API-Key'] = config.authConfig.key
    } else if (config.authType === 'basic' && config.authConfig?.username && config.authConfig?.password) {
      const auth = Buffer.from(`${config.authConfig.username}:${config.authConfig.password}`).toString('base64')
      headers['Authorization'] = `Basic ${auth}`
    }

    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
    }

    return await response.text()
  }

  // Email配信
  private async sendEmail(content: ContentItem, channel: DistributionChannel): Promise<any> {
    const { config } = channel
    if (!config.recipients || config.recipients.length === 0) {
      throw new Error('Email recipients not configured')
    }

    // 実際の実装では、SendGrid、AWS SES、などのメールサービスを使用
    const emailData = {
      to: config.recipients,
      subject: config.subject || content.title,
      html: this.generateEmailHtml(content, config.template),
      text: content.summary
    }

    componentLogger.info('Email配信をシミュレート', {
      recipients: config.recipients.length,
      subject: emailData.subject
    })

    return { sent: config.recipients.length }
  }

  // RSS フィード更新
  private async updateRssFeed(content: ContentItem, channel: DistributionChannel): Promise<any> {
    // RSS XML生成
    const rssXml = this.generateRssXml([content], channel.config)
    
    // 実際の実装では、ファイルシステムやCDNに保存
    componentLogger.info('RSS フィードを更新', {
      channelId: channel.id,
      contentCount: 1
    })

    return { updated: true, itemsCount: 1 }
  }

  // API配信
  private async sendToApi(content: ContentItem, channel: DistributionChannel): Promise<any> {
    const { config } = channel
    if (!config.endpoint) {
      throw new Error('API endpoint not configured')
    }

    let payload: any
    if (config.format === 'xml') {
      payload = this.generateXml(content)
    } else if (config.format === 'rss') {
      payload = this.generateRssXml([content], config)
    } else {
      payload = content
    }

    const headers: Record<string, string> = {
      'Content-Type': config.format === 'xml' ? 'application/xml' : 'application/json'
    }

    if (config.compression) {
      headers['Accept-Encoding'] = 'gzip, deflate'
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: typeof payload === 'string' ? payload : JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`API delivery failed: ${response.status}`)
    }

    return await response.json()
  }

  // コンテンツ取得API
  public async getContent(
    tenantId: string,
    filter?: ContentFilter,
    page = 1,
    limit = 50
  ): Promise<{ content: ContentItem[]; total: number; page: number; limit: number }> {
    try {
      let filteredContent = Array.from(this.content.values()).filter(
        item => item.tenantId === tenantId
      )

      // フィルタリング
      if (filter) {
        filteredContent = this.applyContentFilter(filteredContent, filter)
      }

      // ページネーション
      const total = filteredContent.length
      const offset = (page - 1) * limit
      const paginatedContent = filteredContent.slice(offset, offset + limit)

      // 分析情報を更新
      paginatedContent.forEach(item => {
        item.analytics.apiAccess++
        item.analytics.lastAccessed = new Date().toISOString()
      })

      return {
        content: paginatedContent,
        total,
        page,
        limit
      }
    } catch (error) {
      componentLogger.error('コンテンツ取得に失敗', error as Error)
      throw error
    }
  }

  // RSS フィード生成
  public generateRssFeed(tenantId: string, channelId: string): string {
    try {
      const channel = this.channels.get(channelId)
      if (!channel || channel.tenantId !== tenantId) {
        throw new AppError('Channel not found', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'CHANNEL_NOT_FOUND',
          statusCode: 404
        })
      }

      const content = Array.from(this.content.values()).filter(
        item => item.tenantId === tenantId && 
                item.metadata.status === 'published' &&
                item.distribution.publishedChannels.includes(channelId)
      ).slice(0, 50) // 最新50件

      return this.generateRssXml(content, channel.config)
    } catch (error) {
      componentLogger.error('RSS フィード生成に失敗', error as Error)
      throw error
    }
  }

  // ヘルパーメソッド
  private async scheduleDistribution(contentId: string): Promise<void> {
    const content = this.content.get(contentId)
    if (!content) return

    // 自動配信設定チェック
    const autoChannels = Array.from(this.channels.values()).filter(
      channel => channel.tenantId === content.tenantId && 
                channel.isActive &&
                content.distribution.channels.includes(channel.type)
    )

    for (const channel of autoChannels) {
      if (content.distribution.schedule) {
        // スケジュール配信（実装時はcronジョブを使用）
        this.distributionQueue.push({
          contentId,
          channelId: channel.id,
          scheduledAt: new Date()
        })
      } else {
        // 即座に配信
        this.distributeContent(contentId, [channel.id])
      }
    }
  }

  private validateChannelConfig(channel: DistributionChannel): void {
    switch (channel.type) {
      case 'webhook':
        if (!channel.config.url) {
          throw new AppError('Webhook URL is required', {
            type: ErrorType.VALIDATION_ERROR,
            code: 'MISSING_WEBHOOK_URL',
            statusCode: 400,
            userMessage: 'Webhook URLが必要です'
          })
        }
        break
      
      case 'email':
        if (!channel.config.recipients || channel.config.recipients.length === 0) {
          throw new AppError('Email recipients are required', {
            type: ErrorType.VALIDATION_ERROR,
            code: 'MISSING_EMAIL_RECIPIENTS',
            statusCode: 400,
            userMessage: 'メール受信者が必要です'
          })
        }
        break

      case 'api':
        if (!channel.config.endpoint) {
          throw new AppError('API endpoint is required', {
            type: ErrorType.VALIDATION_ERROR,
            code: 'MISSING_API_ENDPOINT',
            statusCode: 400,
            userMessage: 'APIエンドポイントが必要です'
          })
        }
        break
    }
  }

  private applyContentFilter(content: ContentItem[], filter: ContentFilter): ContentItem[] {
    return content.filter(item => {
      // カテゴリフィルタ
      if (filter.categories && !filter.categories.some(cat => 
        item.metadata.categories.includes(cat)
      )) {
        return false
      }

      // タグフィルタ
      if (filter.tags && !filter.tags.some(tag => 
        item.metadata.tags.includes(tag)
      )) {
        return false
      }

      // ステータスフィルタ
      if (filter.status && !filter.status.includes(item.metadata.status)) {
        return false
      }

      // 優先度フィルタ
      if (filter.priority && !filter.priority.includes(item.metadata.priority)) {
        return false
      }

      // 日付範囲フィルタ
      if (filter.dateRange) {
        const publishDate = new Date(item.metadata.publishedAt)
        const from = new Date(filter.dateRange.from)
        const to = new Date(filter.dateRange.to)
        if (publishDate < from || publishDate > to) {
          return false
        }
      }

      // 言語フィルタ
      if (filter.language && !filter.language.includes(item.metadata.language)) {
        return false
      }

      // 信頼度フィルタ
      if (filter.minConfidence && item.metadata.confidence && 
          item.metadata.confidence < filter.minConfidence) {
        return false
      }

      // センチメントフィルタ
      if (filter.sentiment && item.metadata.sentiment && 
          !filter.sentiment.includes(item.metadata.sentiment)) {
        return false
      }

      return true
    })
  }

  private generateEmailHtml(content: ContentItem, template?: string): string {
    // 簡易HTMLテンプレート
    return `
      <html>
        <head><title>${content.title}</title></head>
        <body>
          <h1>${content.title}</h1>
          <p><strong>要約:</strong> ${content.summary}</p>
          <div>${content.content}</div>
          <p><small>Published: ${new Date(content.metadata.publishedAt).toLocaleString()}</small></p>
        </body>
      </html>
    `
  }

  private generateRssXml(content: ContentItem[], config: any): string {
    const items = content.map(item => `
      <item>
        <title><![CDATA[${item.title}]]></title>
        <description><![CDATA[${item.summary}]]></description>
        <content:encoded><![CDATA[${item.content}]]></content:encoded>
        <guid>${item.id}</guid>
        <pubDate>${new Date(item.metadata.publishedAt).toUTCString()}</pubDate>
        <category>${item.metadata.categories.join(', ')}</category>
      </item>
    `).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
        <channel>
          <title>${config.title || 'Content Feed'}</title>
          <description>${config.description || 'Content distribution feed'}</description>
          <link>${config.link || ''}</link>
          <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
          ${config.image ? `<image><url>${config.image}</url></image>` : ''}
          ${items}
        </channel>
      </rss>`
  }

  private generateXml(content: ContentItem): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
      <content>
        <id>${content.id}</id>
        <type>${content.type}</type>
        <title><![CDATA[${content.title}]]></title>
        <summary><![CDATA[${content.summary}]]></summary>
        <content><![CDATA[${content.content}]]></content>
        <metadata>
          <publishedAt>${content.metadata.publishedAt}</publishedAt>
          <status>${content.metadata.status}</status>
          <language>${content.metadata.language}</language>
          <categories>${content.metadata.categories.join(',')}</categories>
          <tags>${content.metadata.tags.join(',')}</tags>
        </metadata>
      </content>`
  }

  private async saveContent(content: ContentItem): Promise<void> {
    // 実際の実装では、データベースに保存
    componentLogger.debug('コンテンツを保存', { contentId: content.id })
  }

  private async saveChannel(channel: DistributionChannel): Promise<void> {
    // 実際の実装では、データベースに保存
    componentLogger.debug('チャンネルを保存', { channelId: channel.id })
  }
}

// シングルトンインスタンス
export const contentDistributionManager = ContentDistributionManager.getInstance()