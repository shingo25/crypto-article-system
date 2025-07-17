import OpenAI from 'openai'
import { BaseAIProvider, ArticleGenerationRequest, GeneratedArticle, AIProviderConfig } from './base-ai-provider'

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI

  constructor(config: AIProviderConfig) {
    super(config)
    this.client = new OpenAI({
      apiKey: config.apiKey,
    })
  }

  getProviderName(): string {
    return 'OpenAI'
  }

  getAvailableModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo'
    ]
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.models.list()
      return true
    } catch (error) {
      console.error('OpenAI connection test failed:', error)
      return false
    }
  }

  async generateArticle(request: ArticleGenerationRequest): Promise<GeneratedArticle> {
    const prompt = this.buildPrompt(request)
    
    try {
      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは暗号通貨の専門知識を持つプロのライターです。正確で有益な情報を提供し、読者にとって価値のある記事を作成してください。投資アドバイスは避け、客観的な情報提供に徹してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2000,
        top_p: this.config.topP || 1,
        frequency_penalty: this.config.frequencyPenalty || 0,
        presence_penalty: this.config.presencePenalty || 0,
      })

      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new Error('OpenAIからの応答が空です')
      }

      // タイトルと本文を分離
      const lines = content.split('\n').filter(line => line.trim())
      const title = this.extractTitle(content, request.topic)
      const articleContent = this.extractContent(content)
      
      const wordCount = this.countWords(articleContent)

      const article: GeneratedArticle = {
        title,
        content: articleContent,
        wordCount,
        summary: this.generateSummary(articleContent)
      }

      this.validateArticle(article)
      return article

    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API エラー: ${error.message}`)
      }
      throw error
    }
  }

  private extractTitle(content: string, fallbackTopic: string): string {
    // マークダウンのH1タイトルを探す
    const h1Match = content.match(/^#\s+(.+)$/m)
    if (h1Match) {
      return h1Match[1].trim()
    }

    // 最初の行をタイトルとして使用
    const firstLine = content.split('\n')[0]?.trim()
    if (firstLine && firstLine.length > 10 && firstLine.length < 100) {
      return firstLine.replace(/^#+\s*/, '')
    }

    // フォールバック: トピックベースのタイトル
    return `${fallbackTopic} - 暗号通貨市場分析`
  }

  private extractContent(content: string): string {
    // タイトル行を除去
    const lines = content.split('\n')
    let contentStart = 0
    
    // 最初のH1タイトルをスキップ
    if (lines[0]?.match(/^#\s+/)) {
      contentStart = 1
    }
    
    return lines.slice(contentStart).join('\n').trim()
  }

  private generateSummary(content: string): string {
    // 最初の段落を要約として使用
    const paragraphs = content.split('\n\n').filter(p => p.trim())
    const firstParagraph = paragraphs[0]?.replace(/^#+\s*/, '').trim()
    
    if (firstParagraph && firstParagraph.length > 50) {
      return firstParagraph.substring(0, 200) + (firstParagraph.length > 200 ? '...' : '')
    }
    
    return '暗号通貨市場に関する最新の分析記事です。'
  }
}