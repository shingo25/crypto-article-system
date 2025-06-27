'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Wifi, WifiOff, Settings, Globe, Key, TestTube } from "lucide-react"
import { apiClient } from '@/lib/api'

interface WordPressConfig {
  url?: string
  username?: string
  connected: boolean
  lastSync?: string
}

interface ConnectionTestResult {
  success: boolean
  message: string
  details?: any
}

export default function WordPressSettings() {
  const [config, setConfig] = useState<WordPressConfig>({
    url: '',
    username: '',
    connected: false,
    lastSync: ''
  })
  const [formData, setFormData] = useState({
    url: '',
    username: '',
    password: ''
  })
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 初期データ取得
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true)
        const response = await apiClient.getWordPressConfig()
        setConfig(response)
        setFormData({
          url: response.url || '',
          username: response.username || '',
          password: ''
        })
      } catch (error) {
        console.error('Failed to fetch WordPress config:', error)
        setError(error instanceof Error ? error.message : 'WordPressの設定を取得できませんでした')
      } finally {
        setIsLoading(false)
      }
    }

    fetchConfig()
  }, [])

  // 接続テスト
  const handleTestConnection = async () => {
    if (!formData.url || !formData.username) {
      setError('URLとユーザー名を入力してください')
      return
    }

    setIsTesting(true)
    setTestResult(null)
    setError(null)

    try {
      const result = await apiClient.testWordPressConnection()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '接続テストに失敗しました'
      })
    } finally {
      setIsTesting(false)
    }
  }

  // 設定保存
  const handleSaveConfig = async () => {
    if (!formData.url || !formData.username || !formData.password) {
      setError('すべての項目を入力してください')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const result = await apiClient.updateWordPressConfig(formData)
      
      if (result.success) {
        // 設定を再取得
        const updatedConfig = await apiClient.getWordPressConfig()
        setConfig(updatedConfig)
        setFormData(prev => ({ ...prev, password: '' })) // パスワードをクリア
        alert('WordPress設定を保存しました')
      } else {
        setError(result.message || '設定の保存に失敗しました')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '設定の保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // フォーム入力ハンドラ
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    setTestResult(null)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="h-5 w-5" />
                WordPress連携設定
              </CardTitle>
              <CardDescription className="text-slate-400">
                WordPressサイトとの連携を設定・管理
              </CardDescription>
            </div>
            <Badge className={`${config.connected ? 'bg-green-500' : 'bg-red-500'} text-white`}>
              {config.connected ? (
                <>
                  <Wifi className="h-4 w-4 mr-1" />
                  接続済み
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 mr-1" />
                  未接続
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert className="bg-red-900 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 接続テスト結果 */}
      {testResult && (
        <Alert className={testResult.success ? 'bg-green-900 border-green-800' : 'bg-red-900 border-red-800'}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {testResult.success ? '接続テスト成功' : '接続テスト失敗'}
          </AlertTitle>
          <AlertDescription>{testResult.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 設定フォーム */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              接続設定
            </CardTitle>
            <CardDescription className="text-slate-400">
              WordPressサイトの接続情報を設定
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wp-url" className="text-white">WordPress URL</Label>
              <Input
                id="wp-url"
                type="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                disabled={isLoading}
              />
              <p className="text-xs text-slate-400">
                WordPressサイトのURL（例: https://mysite.com）
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wp-username" className="text-white">ユーザー名</Label>
              <Input
                id="wp-username"
                type="text"
                placeholder="admin"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                disabled={isLoading}
              />
              <p className="text-xs text-slate-400">
                WordPressの管理者アカウント名
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wp-password" className="text-white">パスワード</Label>
              <Input
                id="wp-password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                disabled={isLoading}
              />
              <p className="text-xs text-slate-400">
                アプリケーションパスワードまたはWordPressパスワード
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleTestConnection}
                disabled={isTesting || isLoading || !formData.url || !formData.username}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              >
                {isTesting ? (
                  <>
                    <TestTube className="h-4 w-4 mr-2 animate-spin" />
                    テスト中...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    接続テスト
                  </>
                )}
              </Button>
              <Button
                onClick={handleSaveConfig}
                disabled={isSaving || isLoading || !formData.url || !formData.username || !formData.password}
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
              >
                {isSaving ? (
                  <>
                    <Settings className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    設定保存
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 現在の設定・ステータス */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">現在の設定</CardTitle>
            <CardDescription className="text-slate-400">
              保存されているWordPress接続情報
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">
                設定を読み込み中...
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <Label className="text-slate-300">WordPress URL</Label>
                    <div className="text-white font-mono bg-slate-700 p-2 rounded mt-1">
                      {config.url || '未設定'}
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">ユーザー名</Label>
                    <div className="text-white font-mono bg-slate-700 p-2 rounded mt-1">
                      {config.username || '未設定'}
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">接続状態</Label>
                    <div className="mt-1">
                      <Badge className={`${config.connected ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                        {config.connected ? '接続済み' : '未接続'}
                      </Badge>
                    </div>
                  </div>

                  {config.lastSync && (
                    <div>
                      <Label className="text-slate-300">最終同期</Label>
                      <div className="text-white bg-slate-700 p-2 rounded mt-1">
                        {config.lastSync}
                      </div>
                    </div>
                  )}
                </div>

                {config.connected && (
                  <div className="border-t border-slate-600 pt-4">
                    <h4 className="text-white font-medium mb-2">利用可能な機能</h4>
                    <ul className="space-y-1 text-sm text-slate-300">
                      <li>• 記事の自動投稿（下書き保存）</li>
                      <li>• 記事メタデータの同期</li>
                      <li>• カテゴリ・タグの自動設定</li>
                      <li>• 投稿スケジューリング</li>
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 投稿設定 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">投稿設定</CardTitle>
          <CardDescription className="text-slate-400">
            記事投稿時の詳細設定
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-white">デフォルトカテゴリ</Label>
                <Input
                  placeholder="暗号通貨"
                  className="mt-2 bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <Label className="text-white">デフォルトタグ</Label>
                <Input
                  placeholder="Bitcoin, 仮想通貨, ブロックチェーン"
                  className="mt-2 bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-publish"
                  className="rounded"
                  defaultChecked={false}
                />
                <Label htmlFor="auto-publish" className="text-white">
                  自動公開（デフォルトは下書き保存）
                </Label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-white">投稿者</Label>
                <Input
                  placeholder="システム"
                  className="mt-2 bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <Label className="text-white">カスタムフィールド設定</Label>
                <Textarea
                  placeholder="source_score: auto&#10;generated_by: crypto-article-system&#10;fact_checked: true"
                  className="mt-2 bg-slate-700 border-slate-600 text-white"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              投稿設定を保存
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* セキュリティ情報 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Key className="h-5 w-5" />
            セキュリティ情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
              <div>
                <div className="text-white font-medium">アプリケーションパスワード推奨</div>
                <div className="text-slate-400">
                  WordPressの標準パスワードではなく、アプリケーションパスワードの使用を推奨します
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
              <div>
                <div className="text-white font-medium">暗号化保存</div>
                <div className="text-slate-400">
                  パスワードは暗号化されてサーバーに保存されます
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
              <div>
                <div className="text-white font-medium">HTTPS通信</div>
                <div className="text-slate-400">
                  WordPressとの通信はHTTPS暗号化通信で保護されます
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}