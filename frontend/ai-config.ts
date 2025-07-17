'use client'

import { AI_PROVIDERS } from '@/components/AIModelSettings'

export interface AIConfig {
  provider: keyof typeof AI_PROVIDERS
  model: string
  apiKey: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
}

export interface AIProviderInfo {
  name: string
  icon: string
  color: string
  isConfigured: boolean
  currentModel?: {
    name: string
    description: string
    cost: string
    speed: string
  }
  lastUsed?: string
}

/**
 * 現在設定されているAI設定を取得
 */
export function getCurrentAIConfig(): AIConfig | null {
  if (typeof window === 'undefined') return null
  
  try {
    const savedConfig = localStorage.getItem('ai_config')
    if (!savedConfig) return null
    
    return JSON.parse(savedConfig)
  } catch (error) {
    console.error('Failed to load AI config:', error)
    return null
  }
}

/**
 * すべてのプロバイダーの設定済み状況を取得
 */
export function getAllProviderConfigs(): Record<string, AIConfig | null> {
  if (typeof window === 'undefined') return {}
  
  const configs: Record<string, AIConfig | null> = {}
  
  Object.keys(AI_PROVIDERS).forEach(provider => {
    try {
      const configKey = `ai_config_${provider}`
      const savedConfig = localStorage.getItem(configKey)
      configs[provider] = savedConfig ? JSON.parse(savedConfig) : null
    } catch (error) {
      console.error(`Failed to load config for ${provider}:`, error)
      configs[provider] = null
    }
  })
  
  return configs
}

/**
 * プロバイダー情報を整理して返す
 */
export function getProvidersInfo(): AIProviderInfo[] {
  const configs = getAllProviderConfigs()
  const currentConfig = getCurrentAIConfig()
  
  return Object.entries(AI_PROVIDERS).map(([key, provider]) => {
    const config = configs[key]
    const isCurrentProvider = currentConfig?.provider === key
    
    let currentModel
    if (config?.model && provider.models[config.model]) {
      currentModel = {
        name: provider.models[config.model].name,
        description: provider.models[config.model].description,
        cost: provider.models[config.model].cost,
        speed: provider.models[config.model].speed
      }
    }
    
    return {
      name: provider.name,
      icon: provider.icon,
      color: provider.color,
      isConfigured: !!config,
      currentModel,
      lastUsed: isCurrentProvider ? 'アクティブ' : undefined
    }
  })
}

/**
 * 現在アクティブなAIプロバイダー情報を取得
 */
export function getActiveProviderInfo(): AIProviderInfo | null {
  const currentConfig = getCurrentAIConfig()
  if (!currentConfig) return null
  
  const provider = AI_PROVIDERS[currentConfig.provider]
  if (!provider) return null
  
  const model = provider.models[currentConfig.model]
  
  return {
    name: provider.name,
    icon: provider.icon,
    color: provider.color,
    isConfigured: true,
    currentModel: model ? {
      name: model.name,
      description: model.description,
      cost: model.cost,
      speed: model.speed
    } : undefined,
    lastUsed: 'アクティブ'
  }
}

/**
 * AI設定の完了率を計算
 */
export function getConfigCompleteness(): { score: number; total: number; configured: number } {
  const configs = getAllProviderConfigs()
  const total = Object.keys(AI_PROVIDERS).length
  const configured = Object.values(configs).filter(config => config !== null).length
  const score = Math.round((configured / total) * 100)
  
  return { score, total, configured }
}

/**
 * AI設定の統計情報を取得
 */
export function getAIStats() {
  const currentConfig = getCurrentAIConfig()
  const completeness = getConfigCompleteness()
  const activeProvider = getActiveProviderInfo()
  
  return {
    hasActiveConfig: !!currentConfig,
    activeProvider: activeProvider?.name || 'なし',
    activeModel: activeProvider?.currentModel?.name || 'なし',
    configuredProviders: completeness.configured,
    totalProviders: completeness.total,
    completenessPercentage: completeness.score
  }
}