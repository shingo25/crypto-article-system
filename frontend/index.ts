/**
 * AI記事生成システムのメインエクスポート
 */

// 型定義
export * from './types'

// プロバイダー関連
export * from './provider'

// 具体的なプロバイダー
export { DummyAiProvider } from './providers/dummy'

// 新しいAIプロバイダーシステムのインポート
import { AIProviderManager } from '../ai-providers/provider-factory'

// プロバイダーファクトリーの初期化
import { AiProviderFactory } from './provider'
import { DummyAiProvider } from './providers/dummy'

// ダミープロバイダーを登録
AiProviderFactory.register('dummy', DummyAiProvider)

/**
 * AI記事生成サービス
 * 高レベルAPI
 */
export class AiArticleService {
  /**
   * ユーザーの設定に基づいてAIプロバイダーを取得
   */
  static async getProviderForUser(userId: string): Promise<{ provider: any; config: any } | null> {
    try {
      const { prisma } = await import('../prisma')
      
      // ユーザーのデフォルトAI設定を取得
      const settings = await prisma.aIProviderSettings.findFirst({
        where: {
          userId,
          isActive: true,
          isDefault: true
        }
      })

      if (!settings) {
        // デフォルト設定がない場合はダミープロバイダーを使用
        const config = {
          apiKey: 'dummy-key',
          model: 'dummy-model-1',
          temperature: 0.7,
          maxTokens: 4000
        }
        const provider = AiProviderFactory.create('dummy', config)
        return { provider, config }
      }

      // 実際のプロバイダーを作成
      const providerName = settings.provider.toLowerCase()
      const config = {
        apiKey: settings.apiKey, // 暗号化されているため復号化が必要
        model: settings.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        topP: settings.topP,
        frequencyPenalty: settings.frequencyPenalty,
        presencePenalty: settings.presencePenalty
      }

      // 現在はダミープロバイダーのみサポート
      const provider = AiProviderFactory.create('dummy', config)
      return { provider, config }

    } catch (error) {
      console.error('Failed to get AI provider for user:', error)
      return null
    }
  }

  /**
   * ニュース記事から記事を生成
   */
  static async generateFromNews(
    newsId: string, 
    userId: string,
    options?: {
      style?: 'detailed' | 'concise' | 'technical'
      length?: 'short' | 'medium' | 'long'
      templateId?: string
    }
  ): Promise<import('./types').GeneratedArticle | null> {
    try {
      const { prisma } = await import('../prisma')

      // ニュース記事を取得
      const newsItem = await prisma.newsItem.findUnique({
        where: { id: newsId }
      })

      if (!newsItem) {
        throw new Error('News item not found')
      }

      // 新しいAIプロバイダーシステムを試行
      try {
        const aiManager = AIProviderManager.getInstance()
        const isConfigured = await aiManager.testCurrentProvider()
        
        if (isConfigured) {
          const generatedArticle = await aiManager.generateArticle({
            topic: newsItem.title,
            coins: newsItem.coins || [],
            style: options?.style || 'detailed',
            length: options?.length || 'medium',
            additionalInstructions: newsItem.summary ? `ニュース要約: ${newsItem.summary}` : undefined
          })

          // 既存の形式に変換
          return {
            title: generatedArticle.title,
            content: generatedArticle.content,
            summary: generatedArticle.summary || newsItem.summary || 'AI生成記事',
            metadata: {
              generatedBy: 'ai',
              wordCount: generatedArticle.wordCount,
              generatedAt: new Date().toISOString(),
              sourceNewsId: newsId
            },
            tags: newsItem.coins || []
          }
        }
      } catch (providerError) {
        console.warn('新しいAIプロバイダーシステムでの生成に失敗、フォールバックを使用:', providerError)
      }

      // フォールバック: 既存のシステムを使用
      // テンプレートを取得（指定されている場合）
      let template = null
      if (options?.templateId) {
        template = await prisma.template.findUnique({
          where: { id: options.templateId }
        })
      }

      // AIプロバイダーを取得
      const providerData = await this.getProviderForUser(userId)
      if (!providerData) {
        throw new Error('No AI provider available for user')
      }

      // 記事生成コンテキストを構築
      const context: import('./types').ArticleGenerationContext = {
        newsItem: {
          id: newsItem.id,
          title: newsItem.title,
          summary: newsItem.summary || undefined,
          content: newsItem.content || undefined,
          url: newsItem.url,
          source: newsItem.source
        },
        template: template ? {
          id: template.id,
          name: template.name,
          content: template.content,
          variables: template.variables as Record<string, any>
        } : undefined,
        userPreferences: {
          style: options?.style || 'detailed',
          length: options?.length || 'medium',
          language: '日本語'
        }
      }

      // 記事生成を実行
      const generationOptions: import('./types').AiGenerationOptions = {
        ...providerData.config,
        model: providerData.config.model
      }

      const article = await providerData.provider.generateArticle(context, generationOptions)
      return article

    } catch (error) {
      console.error('Failed to generate article from news:', error)
      return null
    }
  }
}