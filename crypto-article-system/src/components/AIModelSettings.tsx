'use client'

import { useState, useEffect } from 'react'
import { useOptionalAuth } from '@/components/auth/AuthProvider'
import { requireAuthForSave } from '@/lib/auth-helpers'
import { 
  fetchAiSettings, 
  saveAiSetting, 
  deleteAiSetting, 
  convertProviderToApi, 
  convertProviderFromApi,
  AIProviderSetting,
  AIProviderSettingInput 
} from '@/lib/ai-api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Zap, Brain, Settings2, TestTube, CheckCircle, AlertCircle, AlertTriangle, Cpu, Eye, EyeOff, Save, Trash2, Key } from "lucide-react"

// AI プロバイダーとモデルの定義（2025年6月28日最新版）
export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    color: 'from-green-400 to-blue-500',
    models: {
      // 主力モデル
      'gpt-4o': { name: 'GPT-4o', description: 'マルチモーダル対応・人間的対話', cost: '$$$$', speed: '⚡⚡⚡' },
      'gpt-4o-mini': { name: 'GPT-4o Mini', description: 'GPT-4oの高速・低コスト版', cost: '$$', speed: '⚡⚡⚡⚡' },
      'gpt-4o-mini-high': { name: 'GPT-4o Mini High', description: 'GPT-4o miniの高性能版', cost: '$$$', speed: '⚡⚡⚡' },
      
      // 最高性能API専用
      'gpt-4.1-turbo': { name: 'GPT-4.1 Turbo', description: 'API最高性能・長文脈処理', cost: '$$$$$', speed: '⚡⚡' },
      
      // 推論特化 o3ファミリー（最新）
      'o3-pro': { name: 'o3 Pro', description: '🔥最新・最上位推論モデル', cost: '$$$$$$', speed: '⚡' },
      'o3': { name: 'o3', description: '第3世代推論・エージェント能力', cost: '$$$$$', speed: '⚡⚡' },
      'o3-mini': { name: 'o3 Mini', description: 'o3ファミリーの効率版', cost: '$$$', speed: '⚡⚡⚡' },
      
      // 推論特化 o1ファミリー
      'o1': { name: 'o1', description: '第1世代推論特化モデル', cost: '$$$$', speed: '⚡⚡' },
    }
  },
  claude: {
    name: 'Anthropic Claude',
    icon: '🎭',
    color: 'from-orange-400 to-pink-500',
    models: {
      // Claude 4ファミリー（2025年5月発表）
      'claude-opus-4': { name: 'Claude Opus 4', description: '🔥最上位・自律コーディング特化', cost: '$$$$$$', speed: '⚡⚡' },
      'claude-sonnet-4': { name: 'Claude Sonnet 4', description: '🔥バランス重視・企業向け', cost: '$$$$', speed: '⚡⚡⚡' },
      
      // Claude 3.5ファミリー（Artifacts機能付き）
      'claude-3-5-sonnet-20241022': { name: 'Claude-3.5 Sonnet', description: 'Artifacts・リアルタイム編集', cost: '$$$$', speed: '⚡⚡⚡' },
      'claude-3-5-haiku-20241022': { name: 'Claude-3.5 Haiku', description: '高速・軽量版', cost: '$', speed: '⚡⚡⚡⚡⚡' },
      
      // Claude 3ファミリー
      'claude-3-opus-20240229': { name: 'Claude-3 Opus', description: '旧最高品質モデル', cost: '$$$$$', speed: '⚡⚡' },
      'claude-3-sonnet-20240229': { name: 'Claude-3 Sonnet', description: '旧バランス型', cost: '$$$', speed: '⚡⚡⚡' },
      'claude-3-haiku-20240307': { name: 'Claude-3 Haiku', description: '旧高速応答', cost: '$', speed: '⚡⚡⚡⚡' },
    }
  },
  gemini: {
    name: 'Google Gemini',
    icon: '💎',
    color: 'from-blue-400 to-purple-500',
    models: {
      // Gemini 2.5ファミリー（2025年発表）
      'gemini-2.5-pro': { name: 'Gemini-2.5 Pro', description: '🔥100万トークン・最高性能', cost: '$$$$', speed: '⚡⚡' },
      'gemini-2.5-flash': { name: 'Gemini-2.5 Flash', description: '🔥速度重視・主力モデル', cost: '$$$', speed: '⚡⚡⚡⚡' },
      'gemini-2.5-flash-lite': { name: 'Gemini-2.5 Flash Lite', description: '🔥最速・分類特化', cost: '$$', speed: '⚡⚡⚡⚡⚡' },
      
      // Gemini 1.5ファミリー
      'gemini-1.5-pro': { name: 'Gemini-1.5 Pro', description: '高機能・長文対応', cost: '$$$', speed: '⚡⚡⚡' },
      'gemini-1.5-flash': { name: 'Gemini-1.5 Flash', description: '高速処理版', cost: '$$', speed: '⚡⚡⚡⚡' },
      'gemini-1.5-flash-8b': { name: 'Gemini-1.5 Flash 8B', description: '軽量版', cost: '$', speed: '⚡⚡⚡⚡⚡' },
    }
  }
} as const

export interface AIConfig {
  provider: keyof typeof AI_PROVIDERS
  model: string
  apiKey: string
  temperature: number
  max_tokens: number
  top_p: number
  frequency_penalty: number
  presence_penalty: number
}

interface AIModelSettingsProps {
  onSave?: (config: AIConfig) => void
  initialConfig?: Partial<AIConfig>
}

export default function AIModelSettings({ onSave, initialConfig }: AIModelSettingsProps) {
  const { isAuthenticated } = useOptionalAuth()
  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: '',
    temperature: 0.7,
    max_tokens: 2000,
    top_p: 0.9,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    ...initialConfig
  })

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedConfigs, setSavedConfigs] = useState<Record<string, AIProviderSetting>>({})
  const [currentStep, setCurrentStep] = useState(1)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [presets, setPresets] = useState({
    creative: { temperature: 0.9, top_p: 0.95, frequency_penalty: 0.3, presence_penalty: 0.3 },
    balanced: { temperature: 0.7, top_p: 0.9, frequency_penalty: 0.0, presence_penalty: 0.0 },
    precise: { temperature: 0.3, top_p: 0.8, frequency_penalty: -0.2, presence_penalty: -0.2 }
  })

  const currentProvider = AI_PROVIDERS[config.provider]
  const currentModel = currentProvider.models[config.model as keyof typeof currentProvider.models]

  const handleProviderChange = (provider: keyof typeof AI_PROVIDERS) => {
    const models = Object.keys(AI_PROVIDERS[provider].models)
    
    // プロバイダー変更時は保存済み設定があれば読み込み、なければAPIキーをリセット
    const savedSetting = savedConfigs[provider]
    
    if (savedSetting) {
      setConfig({
        provider,
        model: savedSetting.model,
        apiKey: savedSetting.apiKey, // マスクされた値
        temperature: savedSetting.temperature,
        max_tokens: savedSetting.maxTokens,
        top_p: savedSetting.topP,
        frequency_penalty: savedSetting.frequencyPenalty,
        presence_penalty: savedSetting.presencePenalty
      })
      setTestResult({
        success: true,
        message: `${AI_PROVIDERS[provider].name} の保存済み設定を読み込みました`
      })
    } else {
      // 保存済み設定がない場合は新規設定
      setConfig(prev => ({
        ...prev,
        provider,
        model: models[0],
        apiKey: '' // APIキーはリセット
      }))
      setTestResult(null)
    }
  }

  const handlePresetApply = (preset: keyof typeof presets) => {
    setConfig(prev => ({ ...prev, ...presets[preset] }))
  }

  const handleTestModel = async () => {
    setTesting(true)
    setTestResult(null)
    
    try {
      // テスト用のシンプルなプロンプト
      const testPrompt = "暗号通貨について30文字程度で簡潔に説明してください。"
      
      // ここで実際のAPI呼び出しを行う（実装は省略）
      await new Promise(resolve => setTimeout(resolve, 2000)) // 模擬的な待機
      
      setTestResult({
        success: true,
        message: `${currentProvider.name} ${currentModel?.name} との接続に成功しました！`
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: `接続テストに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    // 認証チェック
    if (!requireAuthForSave(isAuthenticated)) {
      return
    }

    if (!config.apiKey.trim()) {
      setTestResult({
        success: false,
        message: 'APIキーを入力してください'
      })
      return
    }

    setIsSaving(true)
    setError(null)
    
    try {
      // API設定をサーバーに保存
      const settingInput: AIProviderSettingInput = {
        provider: convertProviderToApi(config.provider),
        model: config.model,
        apiKey: config.apiKey,
        temperature: config.temperature,
        maxTokens: config.max_tokens,
        topP: config.top_p,
        frequencyPenalty: config.frequency_penalty,
        presencePenalty: config.presence_penalty,
        isDefault: false,
        isActive: true
      }
      
      const savedSetting = await saveAiSetting(settingInput)
      
      // 保存済み設定リストを更新
      await loadSavedConfigs()
      
      // 現在の設定にマスクされたAPIキーを反映
      setConfig(prev => ({
        ...prev,
        apiKey: savedSetting.apiKey // マスクされた値
      }))
      
      onSave?.(config)
      setTestResult({
        success: true,
        message: '設定が正常に保存されました'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '設定の保存に失敗しました'
      setError(errorMessage)
      setTestResult({
        success: false,
        message: errorMessage
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    // 認証チェック
    if (!requireAuthForSave(isAuthenticated)) {
      return
    }

    if (!window.confirm(`${currentProvider.name} の設定を削除しますか？この操作は取り消せません。`)) {
      return
    }

    setIsDeleting(true)
    setError(null)
    
    try {
      // サーバーから設定を削除
      const apiProvider = convertProviderToApi(config.provider)
      await deleteAiSetting(apiProvider)
      
      // 現在の設定をリセット
      setConfig(prev => ({
        ...prev,
        apiKey: ''
      }))

      // 保存済み設定リストを更新
      await loadSavedConfigs()

      setTestResult({
        success: true,
        message: `${currentProvider.name} の設定を削除しました`
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '設定の削除に失敗しました'
      setError(errorMessage)
      setTestResult({
        success: false,
        message: errorMessage
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // 保存済み設定を読み込む
  const loadSavedConfigs = async () => {
    if (!isAuthenticated) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const settings = await fetchAiSettings()
      const configs: Record<string, AIProviderSetting> = {}
      
      settings.forEach(setting => {
        const uiProvider = convertProviderFromApi(setting.provider)
        configs[uiProvider] = setting
      })
      
      setSavedConfigs(configs)
    } catch (error) {
      console.error('Failed to load AI settings:', error)
      setError(error instanceof Error ? error.message : 'AI設定の読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 保存済み設定を読み込んで現在の設定に適用
  const loadConfigFromProvider = (provider: keyof typeof AI_PROVIDERS) => {
    const savedSetting = savedConfigs[provider]
    if (savedSetting) {
      setConfig({
        provider,
        model: savedSetting.model,
        apiKey: savedSetting.apiKey, // マスクされた値
        temperature: savedSetting.temperature,
        max_tokens: savedSetting.maxTokens,
        top_p: savedSetting.topP,
        frequency_penalty: savedSetting.frequencyPenalty,
        presence_penalty: savedSetting.presencePenalty
      })
      setCurrentStep(3) // 設定完了ステップに移動
      setTestResult({
        success: true,
        message: `${AI_PROVIDERS[provider].name} の設定を読み込みました`
      })
    } else {
      setTestResult({
        success: false,
        message: '保存済み設定が見つかりません'
      })
    }
  }

  // 設定完了度の計算
  const getConfigCompleteness = () => {
    let score = 0
    if (config.provider) score += 25
    if (config.model) score += 25
    if (config.apiKey.trim()) score += 50
    return score
  }

  // 次のステップに進む
  const goToNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  // ステップをスキップして直接移動
  const goToStep = (step: number) => {
    setCurrentStep(step)
  }

  // 初期設定読み込み（ログイン状態に応じて）
  useEffect(() => {
    if (isAuthenticated) {
      // ログイン時は保存済み設定を読み込み
      loadSavedConfigs()
      
      // localStorage からの移行処理（一度だけ実行）
      const migrationKey = 'ai_settings_migrated'
      const alreadyMigrated = localStorage.getItem(migrationKey)
      
      if (!alreadyMigrated) {
        migrateFromLocalStorage()
        localStorage.setItem(migrationKey, 'true')
      }
    } else {
      // 未ログイン時はAPIキーをクリア
      setConfig(prev => ({ ...prev, apiKey: '' }))
      setSavedConfigs({})
    }
  }, [isAuthenticated])

  // localStorage からサーバーへの移行処理
  const migrateFromLocalStorage = async () => {
    try {
      const providers = ['openai', 'claude', 'gemini']
      const migrations: Promise<void>[] = []
      
      for (const provider of providers) {
        const configKey = `ai_config_${provider}`
        const savedConfig = localStorage.getItem(configKey)
        
        if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig)
            if (parsed.apiKey && parsed.apiKey.trim()) {
              // サーバーに保存
              const settingInput: AIProviderSettingInput = {
                provider: convertProviderToApi(provider),
                model: parsed.model || AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS].models[Object.keys(AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS].models)[0]],
                apiKey: parsed.apiKey,
                temperature: parsed.temperature || 0.7,
                maxTokens: parsed.max_tokens || 4000,
                topP: parsed.top_p || 1.0,
                frequencyPenalty: parsed.frequency_penalty || 0.0,
                presencePenalty: parsed.presence_penalty || 0.0,
                isDefault: false,
                isActive: true
              }
              
              migrations.push(
                saveAiSetting(settingInput).then(() => {
                  // 移行成功後、localStorageから削除
                  localStorage.removeItem(configKey)
                }).catch(error => {
                  console.error(`Failed to migrate ${provider} settings:`, error)
                })
              )
            }
          } catch (error) {
            console.error(`Failed to parse ${provider} config:`, error)
          }
        }
      }
      
      if (migrations.length > 0) {
        await Promise.all(migrations)
        console.log('Settings migrated to server successfully')
        // 移行後に最新のデータを再読み込み
        await loadSavedConfigs()
      }
    } catch (error) {
      console.error('Migration failed:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ローディング表示 */}
      {isLoading && (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <Cpu className="h-4 w-4 animate-spin" />
          <AlertTitle>読み込み中</AlertTitle>
          <AlertDescription>AI設定を読み込んでいます...</AlertDescription>
        </Alert>
      )}

      {/* ヘッダーと進捗表示 */}
      <Card className="bg-gradient-to-r from-purple-600 to-pink-600 border-0 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Brain className="h-8 w-8" />
            AI モデル設定
          </CardTitle>
          <CardDescription className="text-purple-100 mb-4">
            記事生成に使用するAIプロバイダーとモデルを選択・設定できます
          </CardDescription>
          
          {/* 設定進捗バー */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-purple-100">設定完了度</span>
              <span className="text-sm text-purple-100">{getConfigCompleteness()}%</span>
            </div>
            <div className="w-full bg-purple-800/30 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-400 to-cyan-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${getConfigCompleteness()}%` }}
              ></div>
            </div>
          </div>

          {/* ステップインジケーター */}
          <div className="flex items-center gap-4 mt-4">
            {[
              { step: 1, label: 'プロバイダー選択', icon: Sparkles },
              { step: 2, label: 'API設定', icon: Zap },
              { step: 3, label: '設定完了', icon: CheckCircle }
            ].map(({ step, label, icon: Icon }) => (
              <button
                key={step}
                onClick={() => goToStep(step)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  currentStep >= step
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-purple-200 hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{label}</span>
                {currentStep > step && <CheckCircle className="h-4 w-4 text-green-400" />}
              </button>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* ステップ1: プロバイダー選択 */}
      {currentStep >= 1 && (
        <Card className={`bg-slate-800 border-slate-700 transition-all duration-500 ${
          currentStep === 1 ? 'ring-2 ring-purple-500 shadow-lg' : ''
        }`}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-purple-400 text-sm font-medium mr-2">ステップ1</span>
              AIプロバイダー選択
            </CardTitle>
            <CardDescription className="text-slate-400">
              使用するAIサービスを選択してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(AI_PROVIDERS).map(([key, provider]) => {
                const isSelected = config.provider === key
                const hasConfig = savedConfigs[key]
                
                return (
                  <div
                    key={key}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20 shadow-lg scale-105'
                        : 'border-slate-600 bg-slate-700 hover:border-purple-400 hover:bg-slate-600 hover:scale-102'
                    }`}
                    onClick={() => {
                      handleProviderChange(key as keyof typeof AI_PROVIDERS)
                      if (isSelected && config.apiKey) {
                        goToNextStep()
                      }
                    }}
                  >
                    {/* 設定済みバッジ */}
                    {hasConfig && (
                      <div className="absolute -top-2 -right-2">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-2 py-1">
                          ✓ 設定済み
                        </Badge>
                      </div>
                    )}
                    
                    <div className="text-center space-y-3">
                      <span className="text-4xl block">{provider.icon}</span>
                      <h3 className="text-white font-semibold text-lg">{provider.name}</h3>
                      <div className={`text-xs bg-gradient-to-r ${provider.color} bg-clip-text text-transparent font-medium`}>
                        {Object.keys(provider.models).length} モデル利用可能
                      </div>
                      
                      {/* 選択状態表示 */}
                      <div className="flex items-center justify-center gap-2">
                        {isSelected && (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <span className="text-green-400 text-sm font-medium">選択中</span>
                          </>
                        )}
                      </div>
                      
                      {/* モデル情報プレビュー */}
                      {isSelected && currentModel && (
                        <div className="mt-3 p-2 bg-slate-800/50 rounded-lg">
                          <div className="text-xs text-slate-300">
                            {currentModel.name}
                          </div>
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <span className="text-yellow-400 text-xs">{currentModel.cost}</span>
                            <span className="text-green-400 text-xs">{currentModel.speed}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {config.provider && (
              <div className="mt-4 text-center">
                <Button
                  onClick={goToNextStep}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
                >
                  次のステップへ →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ステップ2: API設定とモデル選択 */}
      {currentStep >= 2 && (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-500 ${
          currentStep === 2 ? 'ring-2 ring-purple-500 rounded-lg p-4 bg-purple-500/5' : ''
        }`}>
          {/* APIキー設定 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                <span className="text-purple-400 text-sm font-medium mr-2">ステップ2a</span>
                API設定
              </CardTitle>
              <CardDescription className="text-slate-400">
                {currentProvider.name}のAPIキーを設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-white font-medium">
                  {currentProvider.name} API キー
                </Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={config.apiKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={isAuthenticated ? `${currentProvider.name} APIキーを入力...` : "ログインが必要です"}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10 h-11"
                    disabled={!isAuthenticated}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                    onClick={() => setShowApiKey(!showApiKey)}
                    disabled={!isAuthenticated}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* 未ログイン時の警告 */}
                {!isAuthenticated && (
                  <Alert className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>ログインが必要です</AlertTitle>
                    <AlertDescription>
                      APIキーを設定するにはログインしてください
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* APIキー取得リンク */}
                <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="text-xs text-slate-300">
                      APIキーをお持ちでない場合:
                      <br />
                      {config.provider === 'openai' && (
                        <>
                          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-medium">
                            OpenAI Platform
                          </a>
                          {' '}で取得できます
                        </>
                      )}
                      {config.provider === 'claude' && (
                        <>
                          <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-medium">
                            Anthropic Console
                          </a>
                          {' '}で取得できます
                        </>
                      )}
                      {config.provider === 'gemini' && (
                        <>
                          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-medium">
                            Google AI Studio
                          </a>
                          {' '}で取得できます
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* APIキー操作ボタン */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !config.apiKey.trim() || !isAuthenticated}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 h-10 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Save className="h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        保存
                      </>
                    )}
                  </Button>

                  {config.apiKey && (
                    <Button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      variant="destructive"
                      className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 h-10 px-4"
                    >
                      {isDeleting ? (
                        <>
                          <Trash2 className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          削除
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* モデル選択 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Cpu className="h-5 w-5 text-blue-400" />
                <span className="text-purple-400 text-sm font-medium mr-2">ステップ2b</span>
                モデル選択
              </CardTitle>
              <CardDescription className="text-slate-400">
                使用するAIモデルを選択
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-white font-medium">モデル</Label>
                <Select value={config.model} onValueChange={(value) => setConfig(prev => ({ ...prev, model: value }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {Object.entries(currentProvider.models).map(([key, model]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-slate-600">
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-slate-400">{model.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 選択中のモデル情報 */}
              {currentModel && (
                <div className="p-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg border border-slate-500">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold text-lg">{currentModel.name}</h4>
                      <p className="text-sm text-slate-300 mt-1">{currentModel.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">コスト</div>
                      <div className="text-yellow-400 font-mono text-lg">{currentModel.cost}</div>
                    </div>
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">速度</div>
                      <div className="text-green-400 font-mono text-lg">{currentModel.speed}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
        
      {/* ステップ2完了ボタン */}
      {currentStep >= 2 && config.apiKey.trim() && (
        <div className="text-center mt-4">
          <Button
            onClick={goToNextStep}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
          >
            設定完了へ →
          </Button>
        </div>
      )}

      {/* ステップ3: 設定完了と高度な設定 */}
      {currentStep >= 3 && (
        <>
          {/* 高度な設定を折りたたみ式で表示 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  <span className="text-purple-400 text-sm font-medium mr-2">ステップ3</span>
                  高度なパラメータ設定
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-slate-400 hover:text-white"
                >
                  {showAdvanced ? '非表示' : '表示'}
                  <Settings2 className={`h-4 w-4 ml-2 transition-transform ${
                    showAdvanced ? 'rotate-180' : ''
                  }`} />
                </Button>
              </CardTitle>
              <CardDescription className="text-slate-400">
                AIの出力をカスタマイズする詳細設定（オプション）
              </CardDescription>
            </CardHeader>
            
            {showAdvanced && (
              <CardContent>
                <Tabs defaultValue="basic" className="space-y-4">
                  <TabsList className="grid grid-cols-2 bg-slate-700">
                    <TabsTrigger value="basic" className="data-[state=active]:bg-slate-600 text-white">
                      基本設定
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="data-[state=active]:bg-slate-600 text-white">
                      詳細設定
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-6">
                    {/* プリセット */}
                    <div>
                      <Label className="text-white mb-3 block">クイック設定</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(presets).map(([key, preset]) => (
                          <Button
                            key={key}
                            variant="outline"
                            onClick={() => handlePresetApply(key as keyof typeof presets)}
                            className="border-slate-600 text-white hover:bg-slate-700"
                          >
                            {{
                              creative: '🎨 創造的',
                              balanced: '⚖️ バランス',
                              precise: '🎯 正確'
                            }[key]}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Temperature */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label className="text-white">創造性 (Temperature)</Label>
                        <span className="text-slate-300 text-sm">{config.temperature}</span>
                      </div>
                      <Slider
                        value={[config.temperature]}
                        onValueChange={([value]) => setConfig(prev => ({ ...prev, temperature: value }))}
                        max={1}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>保守的</span>
                        <span>創造的</span>
                      </div>
                    </div>

                    {/* Max Tokens */}
                    <div className="space-y-3">
                      <Label className="text-white">最大トークン数</Label>
                      <Input
                        type="number"
                        value={config.max_tokens}
                        onChange={(e) => setConfig(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="100"
                        max="4000"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-6">
                    {/* Top-p */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label className="text-white">多様性 (Top-p)</Label>
                        <span className="text-slate-300 text-sm">{config.top_p}</span>
                      </div>
                      <Slider
                        value={[config.top_p]}
                        onValueChange={([value]) => setConfig(prev => ({ ...prev, top_p: value }))}
                        max={1}
                        min={0}
                        step={0.05}
                        className="w-full"
                      />
                    </div>

                    {/* Frequency Penalty */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label className="text-white">繰り返し抑制</Label>
                        <span className="text-slate-300 text-sm">{config.frequency_penalty}</span>
                      </div>
                      <Slider
                        value={[config.frequency_penalty]}
                        onValueChange={([value]) => setConfig(prev => ({ ...prev, frequency_penalty: value }))}
                        max={2}
                        min={-2}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {/* Presence Penalty */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label className="text-white">話題拡散</Label>
                        <span className="text-slate-300 text-sm">{config.presence_penalty}</span>
                      </div>
                      <Slider
                        value={[config.presence_penalty]}
                        onValueChange={([value]) => setConfig(prev => ({ ...prev, presence_penalty: value }))}
                        max={2}
                        min={-2}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            )}
          </Card>

          {/* 他の保存済み設定 */}
          {Object.keys(savedConfigs).filter(p => p !== config.provider).length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="h-5 w-5 text-cyan-400" />
                  他の保存済み設定
                </CardTitle>
                <CardDescription className="text-slate-400">
                  クイック切り替え用
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(savedConfigs)
                    .filter(([provider]) => provider !== config.provider)
                    .map(([provider, configData]) => (
                    <div 
                      key={provider}
                      className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-600/50 transition-colors cursor-pointer"
                      onClick={() => loadConfigFromProvider(provider as keyof typeof AI_PROVIDERS)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS].icon}</span>
                        <div>
                          <h3 className="text-white font-semibold text-sm">
                            {AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS].name}
                          </h3>
                          <p className="text-slate-400 text-xs">
                            {configData.model}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">API: {configData.apiKey}</span>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          切り替え
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 設定完了サマリーと接続テスト */}
          <Card className="bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600 shadow-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-400" />
                設定完了
              </CardTitle>
              <CardDescription className="text-slate-300">
                {currentProvider.name} の設定が完了しました
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 設定サマリー */}
                <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-3xl">{currentProvider.icon}</span>
                    <div>
                      <h3 className="text-white font-bold text-lg">{currentProvider.name}</h3>
                      <p className="text-slate-300 text-sm">{currentModel?.name}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">コスト</div>
                      <div className="text-yellow-400 font-mono">{currentModel?.cost}</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">速度</div>
                      <div className="text-green-400 font-mono">{currentModel?.speed}</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">Temperature</div>
                      <div className="text-white font-medium">{config.temperature}</div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-400 mb-1">API状態</div>
                      <div className="text-green-400 font-medium">✓ 設定済み</div>
                    </div>
                  </div>
                </div>
                
                {/* アクションボタン */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleTestModel}
                    disabled={testing || !config.apiKey.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 h-12 disabled:opacity-50"
                  >
                    {testing ? (
                      <>
                        <TestTube className="h-5 w-5 animate-spin" />
                        テスト中...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-5 w-5" />
                        接続テスト
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !config.apiKey.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 h-12 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Save className="h-5 w-5 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        設定保存
                      </>
                    )}
                  </Button>
                </div>
                
                {/* 削除ボタン */}
                {config.apiKey && (
                  <Button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    variant="destructive"
                    className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 h-10"
                  >
                    {isDeleting ? (
                      <>
                        <Trash2 className="h-4 w-4 animate-spin" />
                        削除中...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        設定を削除
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* テスト結果 */}
      {testResult && (
        <Alert className={`transition-all duration-500 ${
          testResult.success 
            ? "bg-green-900/50 border-green-700 shadow-lg shadow-green-500/20" 
            : "bg-red-900/50 border-red-700 shadow-lg shadow-red-500/20"
        }`}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" />
          )}
          <AlertTitle className={testResult.success ? 'text-green-300' : 'text-red-300'}>
            {testResult.success ? '✓ 成功' : '✗ エラー'}
          </AlertTitle>
          <AlertDescription className={testResult.success ? 'text-green-200' : 'text-red-200'}>
            {testResult.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}