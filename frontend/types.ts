/**
 * AI記事生成システムの型定義
 */

// AI生成リクエストの設定
export interface AiGenerationRequest {
  prompt: string
  template?: string
  options: AiGenerationOptions
}

// AI生成オプション
export interface AiGenerationOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  model?: string
  provider?: 'openai' | 'claude' | 'gemini'
}

// AI生成レスポンス
export interface AiGenerationResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  provider: string
  generatedAt: string
}

// 記事生成コンテキスト
export interface ArticleGenerationContext {
  newsItem?: {
    id: string
    title: string
    summary?: string
    content?: string
    url: string
    source: string
  }
  template?: {
    id: string
    name: string
    content: string
    variables: Record<string, any>
  }
  marketData?: {
    symbol?: string
    price?: number
    change24h?: number
    volume?: number
  }
  userPreferences?: {
    style: 'detailed' | 'concise' | 'technical'
    length: 'short' | 'medium' | 'long'
    language: string
  }
}

// 生成された記事データ
export interface GeneratedArticle {
  title: string
  content: string
  summary: string
  tags: string[]
  metadata: {
    wordCount: number
    estimatedReadTime: number
    generatedBy: string
    sourceType: string
    processingTime: number
  }
}

// AIプロバイダーエラー
export class AiProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AiProviderError'
  }
}