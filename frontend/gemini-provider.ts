import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { BaseAIProvider, ArticleGenerationRequest, GeneratedArticle, AIProviderConfig } from './base-ai-provider'

export class GeminiProvider extends BaseAIProvider {
  private client: GoogleGenerativeAI

  constructor(config: AIProviderConfig) {
    super(config)
    this.client = new GoogleGenerativeAI(config.apiKey)
  }

  getProviderName(): string {
    return 'Google Gemini'
  }

  getAvailableModels(): string[] {
    return [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.0-pro'
    ]
  }

  async testConnection(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ 
        model: this.config.model || 'gemini-1.5-flash' 
      })
      
      const result = await model.generateContent('Hello')
      const response = await result.response
      const text = response.text()
      
      return !!text
    } catch (error) {
      console.error('Gemini connection test failed:', error)
      return false
    }
  }

  async generateArticle(request: ArticleGenerationRequest): Promise<GeneratedArticle> {
    const prompt = this.buildPrompt(request)
    
    try {
      const model = this.client.getGenerativeModel({ 
        model: this.config.model || 'gemini-1.5-flash',
        generationConfig: {
          temperature: this.config.temperature || 0.7,
          maxOutputTokens: this.config.maxTokens || 2000,
          topP: this.config.topP || 0.8,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      })

      const systemInstruction = 'あなたは暗号通貨の専門知識を持つプロのライターです。正確で有益な情報を提供し、読者にとって価値のある記事を作成してください。投資アドバイスは避け、客観的な情報提供に徹してください。記事は日本語で作成し、読みやすく構造化された内容にしてください。'
      
      const fullPrompt = `${systemInstruction}\n\n${prompt}`

      const result = await model.generateContent(fullPrompt)
      const response = await result.response

      // 安全性チェックによるブロックを確認
      if (response.promptFeedback?.blockReason) {
        throw new Error(`コンテンツが安全性フィルターによりブロックされました: ${response.promptFeedback.blockReason}`)
      }

      const generatedText = response.text()
      if (!generatedText) {
        throw new Error('Geminiからの応答が空です')
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
      if (error instanceof Error) {
        // Gemini特有のエラーメッセージを処理
        if (error.message.includes('SAFETY')) {
          throw new Error('Gemini安全性フィルター: コンテンツが安全性ガイドラインに違反している可能性があります')
        }
        if (error.message.includes('QUOTA_EXCEEDED')) {
          throw new Error('Gemini API: 使用量制限に達しました')
        }
        if (error.message.includes('API_KEY_INVALID')) {
          throw new Error('Gemini API: APIキーが無効です')
        }
        throw new Error(`Gemini API エラー: ${error.message}`)
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

    // 【タイトル】形式を探す（日本語特有）
    const japaneseTitleMatch = content.match(/^【(.+?)】$/m)
    if (japaneseTitleMatch) {
      return japaneseTitleMatch[1].trim()
    }

    // 最初の行をタイトルとして使用
    const firstLine = content.split('\n')[0]?.trim()
    if (firstLine && firstLine.length > 10 && firstLine.length < 100) {
      return firstLine
        .replace(/^#+\s*/, '')
        .replace(/^\*\*|\*\*$/g, '')
        .replace(/^【|】$/g, '')
    }

    // フォールバック: トピックベースのタイトル
    return `${fallbackTopic} - 暗号通貨市場分析`
  }

  private extractContent(content: string): string {
    // タイトル行を除去
    const lines = content.split('\n')
    let contentStart = 0
    
    // 最初のタイトル形式をスキップ
    if (lines[0]?.match(/^#\s+/) || 
        lines[0]?.match(/^\*\*.+\*\*$/) || 
        lines[0]?.match(/^【.+】$/)) {
      contentStart = 1
    }
    
    return lines.slice(contentStart).join('\n').trim()
  }

  private generateSummary(content: string): string {
    // 最初の段落を要約として使用
    const paragraphs = content.split('\n\n').filter(p => p.trim())
    const firstParagraph = paragraphs[0]?.replace(/^#+\s*/, '')
      .replace(/^\*\*|\*\*$/g, '')
      .replace(/^【|】$/g, '')
      .trim()
    
    if (firstParagraph && firstParagraph.length > 50) {
      return firstParagraph.substring(0, 200) + (firstParagraph.length > 200 ? '...' : '')
    }
    
    return '暗号通貨市場に関する最新の分析記事です。'
  }
}