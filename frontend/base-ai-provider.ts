export interface ArticleGenerationRequest {
  topic: string
  coins?: string[]
  style?: 'detailed' | 'concise' | 'technical'
  length?: 'short' | 'medium' | 'long'
  temperature?: number
  maxTokens?: number
  additionalInstructions?: string
}

export interface GeneratedArticle {
  title: string
  content: string
  wordCount: number
  summary?: string
}

export interface AIProviderConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

export abstract class BaseAIProvider {
  protected config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  /**
   * 記事を生成する
   */
  abstract generateArticle(request: ArticleGenerationRequest): Promise<GeneratedArticle>

  /**
   * APIキーの有効性をテストする
   */
  abstract testConnection(): Promise<boolean>

  /**
   * プロバイダー名を取得
   */
  abstract getProviderName(): string

  /**
   * 利用可能なモデル一覧を取得
   */
  abstract getAvailableModels(): string[]

  /**
   * プロンプトを構築する（共通処理）
   */
  protected buildPrompt(request: ArticleGenerationRequest): string {
    const { topic, coins, style, length } = request
    
    const stylePrompts = {
      detailed: '詳細で専門的な分析を含む',
      concise: '簡潔で要点を絞った',
      technical: '技術的な詳細に重点を置いた'
    }
    
    const lengthPrompts = {
      short: '500-800文字程度の',
      medium: '1000-1500文字程度の',
      long: '2000-3000文字程度の'
    }

    const basePrompt = `暗号通貨に関する${stylePrompts[style || 'detailed']}、${lengthPrompts[length || 'medium']}記事を作成してください。

トピック: ${topic}
${coins && coins.length > 0 ? `関連通貨: ${coins.join(', ')}` : ''}

以下の構成で記事を作成してください：
1. 導入部分 - トピックの概要と重要性
2. 主要な内容 - 詳細な分析や説明
3. 市場への影響 - 価格や投資への影響
4. 今後の展望 - 予想される動向
5. まとめ - 要点の整理

記事は日本語で作成し、読みやすく情報価値の高い内容にしてください。
投資アドバイスは避け、情報提供に徹してください。

${request.additionalInstructions ? `追加の指示: ${request.additionalInstructions}` : ''}`

    return basePrompt
  }

  /**
   * 生成された記事の品質チェック
   */
  protected validateArticle(article: GeneratedArticle): void {
    if (!article.title || article.title.length < 10) {
      throw new Error('記事のタイトルが短すぎます')
    }
    
    if (!article.content || article.content.length < 200) {
      throw new Error('記事の内容が短すぎます')
    }
    
    if (article.wordCount < 100) {
      throw new Error('記事の文字数が不足しています')
    }
  }

  /**
   * 文字数をカウント
   */
  protected countWords(text: string): number {
    return text.replace(/\s+/g, '').length
  }
}