import { 
  BaseAiProvider, 
  AiProviderConfig, 
  AiGenerationRequest, 
  AiGenerationResponse 
} from '../provider'

/**
 * ダミーAIプロバイダー
 * テスト・開発用の実装
 */
export class DummyAiProvider extends BaseAiProvider {
  readonly name = 'dummy'
  readonly supportedModels = ['dummy-model-1', 'dummy-model-2']

  /**
   * ダミーテキスト生成
   */
  async generateText(request: AiGenerationRequest): Promise<AiGenerationResponse> {
    const { prompt, options } = request
    const model = options.model || this.config.model || 'dummy-model-1'
    
    // 生成時間をシミュレート
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    // プロンプトに基づいてダミーコンテンツを生成
    const content = this.generateDummyContent(prompt, options)

    return {
      content,
      usage: {
        promptTokens: Math.floor(prompt.length / 4), // 概算
        completionTokens: Math.floor(content.length / 4),
        totalTokens: Math.floor((prompt.length + content.length) / 4)
      },
      model,
      provider: this.name,
      generatedAt: new Date().toISOString()
    }
  }

  /**
   * 設定検証（常に成功）
   */
  async validateConfig(config: AiProviderConfig): Promise<boolean> {
    // ダミーなので常に成功
    return true
  }

  /**
   * ダミーコンテンツ生成ロジック
   */
  private generateDummyContent(prompt: string, options: AiGenerationRequest['options']): string {
    // プロンプトから記事生成かどうかを判定
    if (prompt.includes('記事を生成') || prompt.includes('JSON形式')) {
      return this.generateDummyArticleJson(prompt, options)
    }

    // 通常のテキスト生成
    return this.generateDummyText(prompt, options)
  }

  /**
   * 記事用のダミーJSONレスポンス生成
   */
  private generateDummyArticleJson(prompt: string, options: AiGenerationRequest['options']): string {
    // プロンプトからキーワードを抽出
    const keywords = this.extractKeywords(prompt)
    const mainTopic = keywords[0] || '暗号通貨'
    
    // スタイルと長さを判定
    const style = this.extractStyle(prompt)
    const length = this.extractLength(prompt)

    // 記事内容を生成
    const title = `${mainTopic}の最新動向と市場分析 - ${style}レポート`
    const content = this.generateArticleContent(mainTopic, style, length)
    const summary = `${mainTopic}に関する${style}な分析レポート。市場動向、技術的要因、今後の展望をまとめました。`
    const tags = this.generateTags(keywords, style)

    const article = {
      title,
      content,
      summary,
      tags
    }

    return JSON.stringify(article, null, 2)
  }

  /**
   * 通常のダミーテキスト生成
   */
  private generateDummyText(prompt: string, options: AiGenerationRequest['options']): string {
    const maxTokens = options.maxTokens || 1000
    const temperature = options.temperature || 0.7
    
    // 温度設定に基づいてランダム性を調整
    const creativity = temperature * 10
    
    const responses = [
      `ご質問の内容について分析します。${prompt.substring(0, 50)}...に関して、以下の観点から考察できます。`,
      `AIアシスタントとして、${prompt.substring(0, 30)}について詳しく説明いたします。`,
      `お問い合わせいただいた件について、包括的に回答いたします。`,
    ]

    const baseResponse = responses[Math.floor(Math.random() * responses.length)]
    
    // トークン数に応じて内容を調整
    const targetLength = Math.min(maxTokens * 3, 2000) // 概算で1トークン=3文字
    const padding = '市場データの分析、技術的要因の検討、リスク評価、今後の見通しなど、多角的な視点から情報をお届けします。'.repeat(
      Math.max(1, Math.floor((targetLength - baseResponse.length) / 100))
    )

    return baseResponse + '\n\n' + padding.substring(0, targetLength - baseResponse.length - 2)
  }

  /**
   * プロンプトからキーワードを抽出
   */
  private extractKeywords(prompt: string): string[] {
    const cryptoTerms = ['ビットコイン', 'Bitcoin', 'BTC', 'イーサリアム', 'Ethereum', 'ETH', 'DeFi', 'NFT', 'ブロックチェーン']
    const keywords = cryptoTerms.filter(term => 
      prompt.includes(term) || prompt.toLowerCase().includes(term.toLowerCase())
    )
    return keywords.length > 0 ? keywords : ['暗号通貨']
  }

  /**
   * スタイルを抽出
   */
  private extractStyle(prompt: string): string {
    if (prompt.includes('technical') || prompt.includes('技術的')) return '技術的'
    if (prompt.includes('concise') || prompt.includes('簡潔')) return '簡潔'
    return '詳細'
  }

  /**
   * 長さを抽出
   */
  private extractLength(prompt: string): string {
    if (prompt.includes('short') || prompt.includes('短い')) return 'short'
    if (prompt.includes('long') || prompt.includes('長い')) return 'long'
    return 'medium'
  }

  /**
   * 記事コンテンツ生成
   */
  private generateArticleContent(topic: string, style: string, length: string): string {
    const sections = [
      `# ${topic}の最新動向\n\n${topic}市場において注目すべき動きが見られています。`,
      `## 市場分析\n\n現在の${topic}市場は、複数の要因により影響を受けています。`,
      `## 技術的考察\n\n${style === '技術的' ? 'ブロックチェーン技術の観点から' : '市場参加者の視点で'}、${topic}の今後について考察します。`,
      `## 今後の展望\n\n${topic}の将来性について、以下の要因を考慮する必要があります。`,
      `## まとめ\n\n${topic}に関する分析をまとめると、継続的な監視が重要です。`
    ]

    // 長さに応じてセクション数を調整
    const sectionCount = length === 'short' ? 3 : length === 'long' ? 5 : 4
    return sections.slice(0, sectionCount).join('\n\n')
  }

  /**
   * タグ生成
   */
  private generateTags(keywords: string[], style: string): string[] {
    const baseTags = ['AI生成', '市場分析', style]
    return [...baseTags, ...keywords.slice(0, 2)]
  }
}