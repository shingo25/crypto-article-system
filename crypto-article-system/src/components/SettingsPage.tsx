'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api'
import AIModelSettings from './AIModelSettings'

interface APIConfig {
  openai_api_key: string
  claude_api_key: string
  gemini_api_key: string
  wordpress_url: string
  wordpress_username: string
  wordpress_password: string
  coinmarketcap_api_key: string
  max_articles_per_day: number
  default_article_depth: string
  default_word_count_min: number
  default_word_count_max: number
}

interface ConnectionStatus {
  [apiName: string]: {
    status: 'success' | 'error' | 'not_configured'
    message: string
    configured: boolean
  }
}

interface SettingsPageProps {
  onBack?: () => void
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const [config, setConfig] = useState<APIConfig>({
    openai_api_key: '',
    claude_api_key: '',
    gemini_api_key: '',
    wordpress_url: '',
    wordpress_username: '',
    wordpress_password: '',
    coinmarketcap_api_key: '',
    max_articles_per_day: 50,
    default_article_depth: 'medium',
    default_word_count_min: 600,
    default_word_count_max: 1000
  })

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [testingConnections, setTestingConnections] = useState(false)

  // 設定を読み込み
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await apiClient.getAPIConfig()
      setConfig(response.config)
    } catch (error) {
      console.error('Failed to load config:', error)
      setMessage({ type: 'error', text: '設定の読み込みに失敗しました' })
    }
  }

  // 設定を保存
  const saveConfig = async () => {
    setLoading(true)
    setMessage(null)

    try {
      // 空でない値のみを送信
      const updates: Partial<APIConfig> = {}
      Object.entries(config).forEach(([key, value]) => {
        if (value && value !== '') {
          // number型のフィールドは除外（API設定のみ送信）
          if (!['max_articles_per_day', 'default_word_count_min', 'default_word_count_max'].includes(key)) {
            updates[key as keyof APIConfig] = value
          }
        }
      })

      const response = await apiClient.updateAPIConfig(updates)
      
      if (response.success) {
        setMessage({ type: 'success', text: response.message })
        // 設定を再読み込み
        await loadConfig()
      } else {
        setMessage({ type: 'error', text: '設定の保存に失敗しました' })
      }
    } catch (error) {
      console.error('Failed to save config:', error)
      setMessage({ type: 'error', text: '設定の保存に失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  // 接続テスト
  const testConnections = async () => {
    setTestingConnections(true)
    try {
      const response = await apiClient.testAPIConnections()
      setConnectionStatus(response.results)
    } catch (error) {
      console.error('Failed to test connections:', error)
      setMessage({ type: 'error', text: '接続テストに失敗しました' })
    } finally {
      setTestingConnections(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500 text-white">接続OK</Badge>
      case 'error':
        return <Badge className="bg-red-500 text-white">エラー</Badge>
      case 'not_configured':
        return <Badge className="bg-gray-500 text-white">未設定</Badge>
      default:
        return <Badge className="bg-gray-500 text-white">不明</Badge>
    }
  }

  const handleInputChange = (field: keyof APIConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ⚙️ システム設定
            </h1>
            <p className="text-slate-300 mt-2 text-lg">
              API設定とシステムパラメータの統合管理
            </p>
          </div>
          <div className="flex gap-3">
            {onBack && (
              <Button 
                variant="outline" 
                size="default"
                onClick={onBack}
                className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
              >
                🏠 ダッシュボードに戻る
              </Button>
            )}
            <Button 
              variant="outline" 
              size="default"
              onClick={testConnections}
              disabled={testingConnections}
              className="bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
            >
              {testingConnections ? '🔄 テスト中...' : '🔍 接続テスト'}
            </Button>
            <Button 
              size="default"
              onClick={saveConfig}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? '💾 保存中...' : '💾 設定を保存'}
            </Button>
          </div>
        </div>

        {/* メッセージ */}
        {message && (
          <Alert className={message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
            <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="ai-models" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-600">
            <TabsTrigger 
              value="ai-models"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              🧠 AI設定
            </TabsTrigger>
            <TabsTrigger 
              value="apis"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              🔑 API設定
            </TabsTrigger>
            <TabsTrigger 
              value="wordpress"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              📝 WordPress連携
            </TabsTrigger>
            <TabsTrigger 
              value="system"
              className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              ⚙️ システム設定
            </TabsTrigger>
          </TabsList>

          {/* AI設定タブ */}
          <TabsContent value="ai-models" className="space-y-4">
            <AIModelSettings 
              onSave={(aiConfig) => {
                console.log('AI設定を保存:', aiConfig)
                setMessage({ type: 'success', text: 'AI設定を保存しました' })
              }}
            />
          </TabsContent>

          {/* API設定タブ */}
          <TabsContent value="apis" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="text-white">🤖 LLM API設定</CardTitle>
                <p className="text-sm text-slate-400">
                  記事生成に使用するAI APIの設定・接続状況確認
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="openai_key">OpenAI APIキー</Label>
                    <div className="flex gap-2">
                      <Input
                        id="openai_key"
                        type="password"
                        placeholder="sk-..."
                        value={config.openai_api_key}
                        onChange={(e) => handleInputChange('openai_api_key', e.target.value)}
                      />
                      {connectionStatus.openai && getStatusBadge(connectionStatus.openai.status)}
                    </div>
                    <p className="text-xs text-gray-500">
                      https://platform.openai.com/ で取得
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gemini_key">Gemini APIキー</Label>
                    <div className="flex gap-2">
                      <Input
                        id="gemini_key"
                        type="password"
                        placeholder="AI..."
                        value={config.gemini_api_key}
                        onChange={(e) => handleInputChange('gemini_api_key', e.target.value)}
                      />
                      {connectionStatus.gemini && getStatusBadge(connectionStatus.gemini.status)}
                    </div>
                    <p className="text-xs text-gray-500">
                      Google AI Studio で取得
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="claude_key">Claude APIキー</Label>
                    <div className="flex gap-2">
                      <Input
                        id="claude_key"
                        type="password"
                        placeholder="sk-ant-..."
                        value={config.claude_api_key}
                        onChange={(e) => handleInputChange('claude_api_key', e.target.value)}
                      />
                      {connectionStatus.claude && getStatusBadge(connectionStatus.claude.status)}
                    </div>
                    <p className="text-xs text-gray-500">
                      https://console.anthropic.com/ で取得
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>その他のAPI設定</CardTitle>
                <p className="text-sm text-gray-500">
                  価格データ取得など追加APIの設定
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coinmarketcap_key">CoinMarketCap APIキー（オプション）</Label>
                  <div className="flex gap-2">
                    <Input
                      id="coinmarketcap_key"
                      type="password"
                      placeholder="有料プランの場合のみ入力"
                      value={config.coinmarketcap_api_key}
                      onChange={(e) => handleInputChange('coinmarketcap_api_key', e.target.value)}
                    />
                    {connectionStatus.coingecko && getStatusBadge(connectionStatus.coingecko.status)}
                  </div>
                  <p className="text-xs text-gray-500">
                    設定しない場合は無料のCoinGecko APIを使用
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WordPress設定タブ */}
          <TabsContent value="wordpress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>WordPress自動投稿設定</CardTitle>
                <p className="text-sm text-gray-500">
                  生成した記事の自動投稿に必要な設定
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wp_url">WordPress サイトURL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="wp_url"
                      type="url"
                      placeholder="https://your-site.com"
                      value={config.wordpress_url}
                      onChange={(e) => handleInputChange('wordpress_url', e.target.value)}
                    />
                    {connectionStatus.wordpress && getStatusBadge(connectionStatus.wordpress.status)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wp_username">ユーザー名</Label>
                    <Input
                      id="wp_username"
                      placeholder="admin"
                      value={config.wordpress_username}
                      onChange={(e) => handleInputChange('wordpress_username', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wp_password">アプリケーションパスワード</Label>
                    <Input
                      id="wp_password"
                      type="password"
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={config.wordpress_password}
                      onChange={(e) => handleInputChange('wordpress_password', e.target.value)}
                    />
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>アプリケーションパスワードの作成方法：</strong><br />
                    1. WordPress管理画面 → ユーザー → プロフィール<br />
                    2. 「アプリケーションパスワード」セクションでパスワード名を入力<br />
                    3. 「新しいアプリケーションパスワードを追加」をクリック<br />
                    4. 生成されたパスワードをここに入力
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* システム設定タブ */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>記事生成設定</CardTitle>
                <p className="text-sm text-gray-500">
                  記事生成に関するデフォルト設定
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="daily_quota">1日あたりの記事生成上限</Label>
                    <Input
                      id="daily_quota"
                      type="number"
                      min="1"
                      max="200"
                      value={config.max_articles_per_day}
                      onChange={(e) => handleInputChange('max_articles_per_day', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min_words">最小文字数</Label>
                    <Input
                      id="min_words"
                      type="number"
                      min="100"
                      value={config.default_word_count_min}
                      onChange={(e) => handleInputChange('default_word_count_min', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_words">最大文字数</Label>
                    <Input
                      id="max_words"
                      type="number"
                      min="200"
                      value={config.default_word_count_max}
                      onChange={(e) => handleInputChange('default_word_count_max', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_depth">デフォルト記事深度</Label>
                  <select
                    id="default_depth"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={config.default_article_depth}
                    onChange={(e) => handleInputChange('default_article_depth', e.target.value)}
                  >
                    <option value="shallow">浅い（簡潔なニュース）</option>
                    <option value="medium">中程度（詳細な分析）</option>
                    <option value="deep">深い（徹底的な調査）</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* 接続状況 */}
            {Object.keys(connectionStatus).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>接続状況</CardTitle>
                  <p className="text-sm text-gray-500">
                    各APIサービスの接続状況
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(connectionStatus).map(([service, status]) => (
                      <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">
                            {service === 'openai' && 'OpenAI'}
                            {service === 'gemini' && 'Gemini'}
                            {service === 'wordpress' && 'WordPress'}
                            {service === 'coingecko' && 'CoinGecko'}
                          </h4>
                          <p className="text-sm text-gray-600">{status.message}</p>
                        </div>
                        {getStatusBadge(status.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}