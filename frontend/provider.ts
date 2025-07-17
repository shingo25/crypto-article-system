import { 
  AiGenerationRequest, 
  AiGenerationResponse, 
  AiGenerationOptions, 
  ArticleGenerationContext, 
  GeneratedArticle,
  AiProviderError 
} from './types'

/**
 * AIプロバイダーの共通インターフェース
 * Strategyパターンを使用してAIプロバイダーを抽象化
 */
export interface IAiProvider {
  /**
   * プロバイダー名
   */
  readonly name: string

  /**
   * プロバイダーがサポートするモデル一覧
   */
  readonly supportedModels: string[]

  /**
   * シンプルなテキスト生成
   */
  generateText(request: AiGenerationRequest): Promise<AiGenerationResponse>

  /**
   * 記事生成（高レベルAPI）
   */
  generateArticle(context: ArticleGenerationContext, options: AiGenerationOptions): Promise<GeneratedArticle>

  /**
   * プロバイダーの設定検証
   */
  validateConfig(config: AiProviderConfig): Promise<boolean>

  /**
   * プロバイダーの健全性チェック
   */
  healthCheck(): Promise<boolean>
}

/**
 * AIプロバイダー設定
 */
export interface AiProviderConfig {
  apiKey: string
  model: string
  baseUrl?: string
  organization?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

/**
 * 抽象AIプロバイダーベースクラス
 * 共通機能の実装
 */
export abstract class BaseAiProvider implements IAiProvider {
  abstract readonly name: string
  abstract readonly supportedModels: string[]

  constructor(protected config: AiProviderConfig) {}

  /**
   * 共通の記事生成ロジック
   */
  async generateArticle(
    context: ArticleGenerationContext, 
    options: AiGenerationOptions
  ): Promise<GeneratedArticle> {
    const startTime = Date.now()

    try {
      // プロンプトを構築
      const prompt = this.buildArticlePrompt(context, options)
      
      // AI生成リクエストを実行
      const response = await this.generateText({
        prompt,
        template: context.template?.content,
        options
      })

      // レスポンスを解析して記事データに変換
      const article = this.parseArticleResponse(response.content, context)
      
      // メタデータを追加
      article.metadata = {
        ...article.metadata,
        generatedBy: `${this.name}:${options.model || this.config.model}`,
        processingTime: Date.now() - startTime
      }

      return article

    } catch (error) {
      throw new AiProviderError(
        `Failed to generate article: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        'GENERATION_FAILED'
      )
    }
  }

  /**
   * 記事生成用プロンプトを構築
   */
  protected buildArticlePrompt(
    context: ArticleGenerationContext, 
    options: AiGenerationOptions
  ): string {
    const { newsItem, template, marketData, userPreferences } = context
    
    let prompt = '以下の情報を基に、暗号通貨に関する記事を生成してください：\n\n'

    // ニュース情報
    if (newsItem) {
      prompt += `【元ニュース】\n`
      prompt += `タイトル: ${newsItem.title}\n`
      if (newsItem.summary) prompt += `要約: ${newsItem.summary}\n`
      if (newsItem.content) prompt += `内容: ${newsItem.content}\n`
      prompt += `出典: ${newsItem.source}\n\n`
    }

    // マーケット情報
    if (marketData) {
      prompt += `【マーケット情報】\n`
      if (marketData.symbol) prompt += `銘柄: ${marketData.symbol}\n`
      if (marketData.price) prompt += `価格: $${marketData.price}\n`
      if (marketData.change24h) prompt += `24h変動: ${marketData.change24h}%\n`
      if (marketData.volume) prompt += `取引量: $${marketData.volume}\n\n`
    }

    // 生成指示
    prompt += `【記事生成指示】\n`
    prompt += `スタイル: ${userPreferences?.style || 'detailed'}\n`
    prompt += `長さ: ${userPreferences?.length || 'medium'}\n`
    prompt += `言語: ${userPreferences?.language || '日本語'}\n\n`

    // テンプレート適用
    if (template?.content) {
      prompt += `【テンプレート】\n${template.content}\n\n`
    }

    prompt += `【出力形式】\n`
    prompt += `以下のJSON形式で出力してください：\n`
    prompt += `{\n`
    prompt += `  "title": "記事タイトル",\n`
    prompt += `  "content": "記事本文（Markdown形式）",\n`
    prompt += `  "summary": "記事の要約（100-200文字）",\n`
    prompt += `  "tags": ["タグ1", "タグ2", "タグ3"]\n`
    prompt += `}`

    return prompt
  }

  /**
   * AIレスポンスを記事データに解析
   */
  protected parseArticleResponse(content: string, context: ArticleGenerationContext): GeneratedArticle {
    try {
      // JSONレスポンスを解析
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Invalid response format')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      // 基本的な検証
      if (!parsed.title || !parsed.content) {
        throw new Error('Missing required fields in response')
      }

      return {
        title: parsed.title,
        content: parsed.content,
        summary: parsed.summary || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        metadata: {
          wordCount: parsed.content.length,
          estimatedReadTime: Math.ceil(parsed.content.length / 400), // 400文字/分
          generatedBy: this.name,
          sourceType: context.newsItem ? 'news' : 'manual',
          processingTime: 0 // 後で設定される
        }
      }

    } catch (error) {
      // JSON解析に失敗した場合のフォールバック
      const lines = content.split('\n').filter(line => line.trim())
      const title = lines[0] || 'AI Generated Article'
      
      return {
        title,
        content: content,
        summary: content.substring(0, 200) + '...',
        tags: ['AI生成'],
        metadata: {
          wordCount: content.length,
          estimatedReadTime: Math.ceil(content.length / 400),
          generatedBy: this.name,
          sourceType: context.newsItem ? 'news' : 'manual',
          processingTime: 0
        }
      }
    }
  }

  /**
   * 基本的な健全性チェック
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateText({
        prompt: 'Hello, AI!',
        options: { maxTokens: 10, temperature: 0 }
      })
      return response.content.length > 0
    } catch {
      return false
    }
  }

  // 抽象メソッド - 各プロバイダーで実装
  abstract generateText(request: AiGenerationRequest): Promise<AiGenerationResponse>
  abstract validateConfig(config: AiProviderConfig): Promise<boolean>
}

/**
 * AIプロバイダーファクトリー
 */
export class AiProviderFactory {
  private static providers = new Map<string, new (config: AiProviderConfig) => IAiProvider>()

  /**
   * プロバイダーを登録
   */
  static register(name: string, providerClass: new (config: AiProviderConfig) => IAiProvider) {
    this.providers.set(name, providerClass)
  }

  /**
   * プロバイダーインスタンスを作成
   */
  static create(name: string, config: AiProviderConfig): IAiProvider {
    const ProviderClass = this.providers.get(name)
    if (!ProviderClass) {
      throw new AiProviderError(`Unknown AI provider: ${name}`, name, 'UNKNOWN_PROVIDER')
    }
    return new ProviderClass(config)
  }

  /**
   * 利用可能なプロバイダー一覧
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }
}