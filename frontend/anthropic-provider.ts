import Anthropic from '@anthropic-ai/sdk'
import { BaseAIProvider, ArticleGenerationRequest, GeneratedArticle, AIProviderConfig } from './base-ai-provider'

export class AnthropicProvider extends BaseAIProvider {
  private client: Anthropic

  constructor(config: AIProviderConfig) {
    super(config)
    this.client = new Anthropic({
      apiKey: config.apiKey,
    })
  }

  getProviderName(): string {
    return 'Anthropic Claude'
  }

  getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022', 
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ]
  }

  async testConnection(): Promise<boolean> {
    try {
      // 簡単なテストメッセージを送信
      await this.client.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ]
      })
      return true
    } catch (error) {
      console.error('Anthropic connection test failed:', error)
      return false
    }
  }

  async generateArticle(request: ArticleGenerationRequest): Promise<GeneratedArticle> {
    const prompt = this.buildPrompt(request)
    
    try {
      const response = await this.client.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.7,
        system: 'あなたは暗号通貨の専門知識を持つプロのライターです。正確で有益な情報を提供し、読者にとって価値のある記事を作成してください。投資アドバイスは避け、客観的な情報提供に徹してください。記事は日本語で作成し、読みやすく構造化された内容にしてください。',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Anthropicからテキスト以外の応答を受信しました')
      }

      const generatedText = content.text
      if (!generatedText) {
        throw new Error('Anthropicからの応答が空です')
      }

      // タイトルと本文を分離
      const title = this.extractTitle(generatedText, request.topic)
      const articleContent = this.extractContent(generatedText)
      
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
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Anthropic API エラー: ${error.message}`)
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

    // **タイトル**形式を探す
    const boldTitleMatch = content.match(/^\*\*(.+?)\*\*$/m)
    if (boldTitleMatch) {
      return boldTitleMatch[1].trim()
    }

    // 最初の行をタイトルとして使用
    const firstLine = content.split('\n')[0]?.trim()
    if (firstLine && firstLine.length > 10 && firstLine.length < 100) {
      return firstLine.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '')
    }

    // フォールバック: トピックベースのタイトル
    return `${fallbackTopic} - 暗号通貨市場分析`
  }

  private extractContent(content: string): string {
    // タイトル行を除去
    const lines = content.split('\n')
    let contentStart = 0
    
    // 最初のH1タイトルまたは**タイトル**をスキップ
    if (lines[0]?.match(/^#\s+/) || lines[0]?.match(/^\*\*.+\*\*$/)) {
      contentStart = 1
    }
    
    return lines.slice(contentStart).join('\n').trim()
  }

  private generateSummary(content: string): string {
    // 最初の段落を要約として使用
    const paragraphs = content.split('\n\n').filter(p => p.trim())
    const firstParagraph = paragraphs[0]?.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '').trim()
    
    if (firstParagraph && firstParagraph.length > 50) {
      return firstParagraph.substring(0, 200) + (firstParagraph.length > 200 ? '...' : '')
    }
    
    return '暗号通貨市場に関する最新の分析記事です。'
  }
}