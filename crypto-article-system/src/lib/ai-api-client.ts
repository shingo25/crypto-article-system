import { AIProvider } from '@/generated/prisma'
import { apiClient } from './csrf-client'

export interface AIProviderSetting {
  id: string
  provider: AIProvider
  model: string
  apiKey: string  // マスクされた値
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  advancedSettings?: any
  isDefault: boolean
  isActive: boolean
  lastUsed?: string
  createdAt: string
  updatedAt: string
}

export interface AIProviderSettingInput {
  provider: AIProvider
  model: string
  apiKey: string  // 平文
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  advancedSettings?: any
  isDefault: boolean
  isActive: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  details?: any
}

// プロバイダー名の変換（UI用 → API用）
export function convertProviderToApi(provider: string): AIProvider {
  switch (provider.toLowerCase()) {
    case 'openai':
      return 'OPENAI'
    case 'claude':
      return 'CLAUDE'
    case 'gemini':
      return 'GEMINI'
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

// プロバイダー名の変換（API用 → UI用）
export function convertProviderFromApi(provider: AIProvider): string {
  switch (provider) {
    case 'OPENAI':
      return 'openai'
    case 'CLAUDE':
      return 'claude'
    case 'GEMINI':
      return 'gemini'
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

/**
 * 全てのAI設定を取得
 */
export async function fetchAiSettings(): Promise<AIProviderSetting[]> {
  const response = await apiClient.get('/users/ai-settings')

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'AI設定の取得に失敗しました')
  }

  const data: ApiResponse<AIProviderSetting[]> = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'AI設定の取得に失敗しました')
  }

  return data.data || []
}

/**
 * AI設定を保存/更新
 */
export async function saveAiSetting(setting: AIProviderSettingInput): Promise<AIProviderSetting> {
  const response = await apiClient.post('/users/ai-settings', setting)

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'AI設定の保存に失敗しました')
  }

  const data: ApiResponse<AIProviderSetting> = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'AI設定の保存に失敗しました')
  }

  return data.data!
}

/**
 * AI設定を削除
 */
export async function deleteAiSetting(provider: AIProvider): Promise<void> {
  const response = await apiClient.delete(`/users/ai-settings/${provider}`)

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'AI設定の削除に失敗しました')
  }

  const data: ApiResponse<void> = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'AI設定の削除に失敗しました')
  }
}