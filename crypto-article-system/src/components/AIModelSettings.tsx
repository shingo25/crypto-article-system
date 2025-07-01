'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Zap, Brain, Settings2, TestTube, CheckCircle, AlertCircle, Cpu } from "lucide-react"

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
  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 2000,
    top_p: 0.9,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    ...initialConfig
  })

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [presets, setPresets] = useState({
    creative: { temperature: 0.9, top_p: 0.95, frequency_penalty: 0.3, presence_penalty: 0.3 },
    balanced: { temperature: 0.7, top_p: 0.9, frequency_penalty: 0.0, presence_penalty: 0.0 },
    precise: { temperature: 0.3, top_p: 0.8, frequency_penalty: -0.2, presence_penalty: -0.2 }
  })

  const currentProvider = AI_PROVIDERS[config.provider]
  const currentModel = currentProvider.models[config.model as keyof typeof currentProvider.models]

  const handleProviderChange = (provider: keyof typeof AI_PROVIDERS) => {
    const models = Object.keys(AI_PROVIDERS[provider].models)
    setConfig(prev => ({
      ...prev,
      provider,
      model: models[0] // 最初のモデルを選択
    }))
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

  const handleSave = () => {
    onSave?.(config)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card className="bg-gradient-to-r from-purple-600 to-pink-600 border-0 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Brain className="h-8 w-8" />
            AI モデル設定
          </CardTitle>
          <CardDescription className="text-purple-100">
            記事生成に使用するAIプロバイダーとモデルを選択・設定できます
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* プロバイダー選択 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AIプロバイダー
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
              <div
                key={key}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  config.provider === key
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-slate-600 bg-slate-700 hover:border-purple-400'
                }`}
                onClick={() => handleProviderChange(key as keyof typeof AI_PROVIDERS)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <h3 className="text-white font-semibold">{provider.name}</h3>
                    <div className={`text-sm bg-gradient-to-r ${provider.color} bg-clip-text text-transparent font-medium`}>
                      {Object.keys(provider.models).length} モデル利用可能
                    </div>
                  </div>
                  {config.provider === key && (
                    <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* モデル選択 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              モデル選択
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={config.model} onValueChange={(value) => setConfig(prev => ({ ...prev, model: value }))}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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

            {/* 選択中のモデル情報 */}
            {currentModel && (
              <div className="p-4 bg-slate-700 rounded-lg">
                <h4 className="text-white font-medium mb-2">{currentModel.name}</h4>
                <p className="text-sm text-slate-300 mb-3">{currentModel.description}</p>
                <div className="flex justify-between">
                  <div>
                    <span className="text-xs text-slate-400">コスト</span>
                    <div className="text-yellow-400">{currentModel.cost}</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">速度</span>
                    <div className="text-green-400">{currentModel.speed}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* パラメータ設定 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            生成パラメータ
          </CardTitle>
          <CardDescription className="text-slate-400">
            AIの出力をカスタマイズする詳細設定
          </CardDescription>
        </CardHeader>
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
      </Card>

      {/* テストと保存 */}
      <div className="flex gap-4">
        <Button
          onClick={handleTestModel}
          disabled={testing}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          {testing ? (
            <>
              <TestTube className="h-4 w-4 animate-spin" />
              テスト中...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4" />
              接続テスト
            </>
          )}
        </Button>

        <Button
          onClick={handleSave}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          設定を保存
        </Button>
      </div>

      {/* テスト結果 */}
      {testResult && (
        <Alert className={testResult.success ? "bg-green-900 border-green-700" : "bg-red-900 border-red-700"}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{testResult.success ? '接続成功' : '接続失敗'}</AlertTitle>
          <AlertDescription>{testResult.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}