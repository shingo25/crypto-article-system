import { BaseAIProvider, AIProviderConfig } from './base-ai-provider'
import { OpenAIProvider } from './openai-provider'
import { AnthropicProvider } from './anthropic-provider'
import { GeminiProvider } from './gemini-provider'
import { getCurrentAIConfig } from '../ai-config'

export type SupportedProvider = 'openai' | 'claude' | 'gemini'

export class AIProviderFactory {
  static createProvider(provider: SupportedProvider, config: AIProviderConfig): BaseAIProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIProvider(config)
      case 'claude':
        return new AnthropicProvider(config)
      case 'gemini':
        return new GeminiProvider(config)
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  static async createFromCurrentConfig(): Promise<BaseAIProvider> {
    const currentConfig = getCurrentAIConfig()
    if (!currentConfig) {
      throw new Error('AI設定が見つかりません。設定ページでAIプロバイダーを設定してください。')
    }

    const providerConfig: AIProviderConfig = {
      apiKey: currentConfig.apiKey,
      model: currentConfig.model,
      temperature: currentConfig.temperature,
      maxTokens: currentConfig.maxTokens,
      topP: currentConfig.topP,
      frequencyPenalty: currentConfig.frequencyPenalty,
      presencePenalty: currentConfig.presencePenalty,
    }

    return this.createProvider(currentConfig.provider, providerConfig)
  }

  static getSupportedProviders(): SupportedProvider[] {
    return ['openai', 'claude', 'gemini']
  }

  static isProviderSupported(provider: string): provider is SupportedProvider {
    return this.getSupportedProviders().includes(provider as SupportedProvider)
  }
}

export class AIProviderManager {
  private static instance: AIProviderManager
  private currentProvider: BaseAIProvider | null = null

  static getInstance(): AIProviderManager {
    if (!this.instance) {
      this.instance = new AIProviderManager()
    }
    return this.instance
  }

  async getCurrentProvider(): Promise<BaseAIProvider> {
    if (!this.currentProvider) {
      this.currentProvider = await AIProviderFactory.createFromCurrentConfig()
    }
    return this.currentProvider
  }

  async refreshProvider(): Promise<void> {
    this.currentProvider = null
    this.currentProvider = await AIProviderFactory.createFromCurrentConfig()
  }

  async testCurrentProvider(): Promise<boolean> {
    try {
      const provider = await this.getCurrentProvider()
      return await provider.testConnection()
    } catch (error) {
      console.error('Provider test failed:', error)
      return false
    }
  }

  async generateArticle(request: { 
    topic: string
    coins?: string[]
    style?: 'detailed' | 'concise' | 'technical'
    length?: 'short' | 'medium' | 'long'
    additionalInstructions?: string
  }) {
    const provider = await this.getCurrentProvider()
    return await provider.generateArticle(request)
  }
}