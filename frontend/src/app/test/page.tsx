'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import NewsBasedArticleGenerationForm from '@/components/NewsBasedArticleGenerationForm'
import { useUnprocessedNewsItems } from '@/hooks/useNewsItems'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Loader2, Zap, FileText, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AIProviderFactory } from '@/lib/ai-providers/provider-factory'
import { convertProviderToApi } from '@/lib/ai-api-client'

// QueryClientの初期化
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function TestContent() {
  const {
    data: newsResponse,
    isLoading,
    error,
    refetch
  } = useUnprocessedNewsItems({
    limit: 50,
    sortBy: 'importance',
    sortOrder: 'desc'
  })

  // AIプロバイダーテスト用の状態
  const [providerTests, setProviderTests] = useState<{
    [key: string]: {
      status: 'pending' | 'testing' | 'success' | 'error',
      message?: string,
      article?: any
    }
  }>({})

  // リアルタイム記事生成テスト
  const [realTimeTest, setRealTimeTest] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error',
    message?: string,
    article?: any,
    provider?: string
  }>({ status: 'idle' })

  // AIプロバイダーのテスト
  const testAIProvider = async (providerName: string) => {
    setProviderTests(prev => ({
      ...prev,
      [providerName]: { status: 'testing' }
    }))

    try {
      // プロバイダー名をAPI形式に変換
      const apiProvider = convertProviderToApi(providerName)
      console.log(`Testing ${providerName} (${apiProvider})...`)
      
      // テスト用APIから復号化されたAI設定を取得
      const response = await fetch(`/api/users/ai-settings/test?provider=${apiProvider}`, {
        credentials: 'include'
      })
      
      console.log(`API response status: ${response.status}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'AI設定の取得に失敗しました')
      }
      
      const data = await response.json()
      console.log('API response data:', data)
      
      // APIが成功を返している場合は直接成功とする
      if (data.success) {
        setProviderTests(prev => ({
          ...prev,
          [providerName]: { 
            status: 'success',
            message: data.message || `${providerName}の接続テストに成功しました`
          }
        }))
        return
      }
      
      const providerSetting = data.data
      
      if (!providerSetting) {
        throw new Error(`${providerName}の設定が見つかりません。設定ページで先に設定を完了してください。`)
      }
      
      console.log('Provider setting:', { ...providerSetting, apiKey: providerSetting.apiKey ? 'MASKED' : 'EMPTY' })
      
      // 実際の設定でプロバイダーを作成
      const provider = AIProviderFactory.createProvider(providerName as any, {
        apiKey: providerSetting.apiKey, // 復号化されたAPIキーを使用
        model: providerSetting.model || 'default',
        temperature: providerSetting.temperature || 0.7,
        maxTokens: providerSetting.maxTokens || 2000,
        topP: providerSetting.topP || 0.9,
        frequencyPenalty: providerSetting.frequencyPenalty || 0,
        presencePenalty: providerSetting.presencePenalty || 0
      })

      console.log('Provider created, testing connection...')
      const connectionTest = await provider.testConnection()
      console.log('Connection test result:', connectionTest)
      
      if (connectionTest) {
        setProviderTests(prev => ({
          ...prev,
          [providerName]: { 
            status: 'success',
            message: `接続テストに成功しました (モデル: ${providerSetting.model})`
          }
        }))
      } else {
        setProviderTests(prev => ({
          ...prev,
          [providerName]: { 
            status: 'error',
            message: '接続テストに失敗しました。APIキーまたは設定を確認してください。'
          }
        }))
      }
    } catch (error: any) {
      setProviderTests(prev => ({
        ...prev,
        [providerName]: { 
          status: 'error',
          message: error.message || '不明なエラーが発生しました'
        }
      }))
    }
  }

  // リアルタイム記事生成テスト
  const testRealTimeGeneration = async () => {
    setRealTimeTest({ status: 'testing' })

    try {
      // まずマスクされた設定一覧を取得してデフォルト設定を特定
      const listResponse = await fetch('/api/users/ai-settings', {
        credentials: 'include'
      })
      
      if (!listResponse.ok) {
        throw new Error('AI設定の取得に失敗しました')
      }
      
      const listData = await listResponse.json()
      const settings = listData.data || []
      
      // デフォルト設定を検索、なければ最初の設定を使用
      let defaultSetting = settings.find((setting: any) => setting.isDefault)
      if (!defaultSetting && settings.length > 0) {
        defaultSetting = settings[0]
      }
      
      if (!defaultSetting) {
        throw new Error('AI設定が見つかりません。設定ページで先にAIプロバイダーを設定してください。')
      }

      // テスト用APIから復号化された設定を取得
      const testResponse = await fetch(`/api/users/ai-settings/test?provider=${defaultSetting.provider}`, {
        credentials: 'include'
      })
      
      if (!testResponse.ok) {
        const errorData = await testResponse.json()
        throw new Error(errorData.error || 'AI設定の詳細取得に失敗しました')
      }
      
      const testData = await testResponse.json()
      const fullSetting = testData.data

      const provider = AIProviderFactory.createProvider(fullSetting.provider, {
        apiKey: fullSetting.apiKey, // 復号化されたAPIキーを使用
        model: fullSetting.model || 'default',
        temperature: fullSetting.temperature || 0.7,
        maxTokens: fullSetting.maxTokens || 2000,
        topP: fullSetting.topP || 0.9,
        frequencyPenalty: fullSetting.frequencyPenalty || 0,
        presencePenalty: fullSetting.presencePenalty || 0
      })
      
      const testRequest = {
        topic: 'ビットコインの最新価格動向',
        coins: ['BTC'],
        style: 'concise' as const,
        length: 'short' as const,
        additionalInstructions: 'これはテスト用の記事生成です。簡潔に200文字程度で作成してください。'
      }

      const article = await provider.generateArticle(testRequest)
      
      setRealTimeTest({
        status: 'success',
        article,
        provider: fullSetting.provider,
        message: `記事生成に成功しました (${fullSetting.provider} - ${fullSetting.model})`
      })
    } catch (error: any) {
      setRealTimeTest({
        status: 'error',
        message: error.message || '記事生成に失敗しました'
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>ニュースを読み込み中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert className="bg-red-900 border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>
              ニュースの読み込みに失敗しました: {error.message}
            </AlertDescription>
          </Alert>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  const newsItems = newsResponse?.data.newsItems || []

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-2xl">
              記事生成システム - テスト & 検証ページ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {newsItems.length}
                </div>
                <div className="text-gray-400">利用可能なニュース</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {newsItems.filter(n => n.importance >= 7).length}
                </div>
                <div className="text-gray-400">高重要度ニュース</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {newsItems.filter(n => n.sentiment && Math.abs(n.sentiment) > 0.5).length}
                </div>
                <div className="text-gray-400">強いセンチメント</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="ai-test" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai-test">AIプロバイダーテスト</TabsTrigger>
            <TabsTrigger value="realtime">リアルタイム生成</TabsTrigger>
            <TabsTrigger value="news-based">ニュースベース生成</TabsTrigger>
          </TabsList>

          {/* AIプロバイダーテストタブ */}
          <TabsContent value="ai-test">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  AIプロバイダー接続テスト
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['openai', 'claude', 'gemini'].map((provider) => (
                    <Card key={provider} className="bg-slate-700 border-slate-600">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-lg capitalize">
                          {provider === 'claude' ? 'Anthropic Claude' : 
                           provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <Button
                            onClick={() => testAIProvider(provider)}
                            disabled={providerTests[provider]?.status === 'testing'}
                            className="w-full"
                          >
                            {providerTests[provider]?.status === 'testing' ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                テスト中...
                              </>
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-2" />
                                接続テスト
                              </>
                            )}
                          </Button>
                          
                          {providerTests[provider] && (
                            <div className="flex items-center gap-2">
                              {providerTests[provider].status === 'success' && (
                                <Badge className="bg-green-600 text-white">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  成功
                                </Badge>
                              )}
                              {providerTests[provider].status === 'error' && (
                                <Badge className="bg-red-600 text-white">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  失敗
                                </Badge>
                              )}
                              {providerTests[provider].status === 'testing' && (
                                <Badge className="bg-yellow-600 text-white">
                                  <Clock className="h-3 w-3 mr-1" />
                                  テスト中
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {providerTests[provider]?.message && (
                            <p className="text-sm text-gray-400">
                              {providerTests[provider].message}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* リアルタイム生成テストタブ */}
          <TabsContent value="realtime">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  リアルタイム記事生成テスト
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={testRealTimeGeneration}
                      disabled={realTimeTest.status === 'testing'}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {realTimeTest.status === 'testing' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          テスト記事を生成
                        </>
                      )}
                    </Button>
                    
                    {realTimeTest.status !== 'idle' && (
                      <Badge 
                        className={
                          realTimeTest.status === 'success' ? 'bg-green-600' :
                          realTimeTest.status === 'error' ? 'bg-red-600' :
                          'bg-yellow-600'
                        }
                      >
                        {realTimeTest.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {realTimeTest.status === 'error' && <XCircle className="h-3 w-3 mr-1" />}
                        {realTimeTest.status === 'testing' && <Clock className="h-3 w-3 mr-1" />}
                        {realTimeTest.status === 'success' ? '成功' :
                         realTimeTest.status === 'error' ? '失敗' : '実行中'}
                      </Badge>
                    )}
                  </div>
                  
                  {realTimeTest.message && (
                    <Alert className={realTimeTest.status === 'error' ? 'border-red-600 bg-red-900/20' : 'border-green-600 bg-green-900/20'}>
                      <AlertDescription className="text-white">
                        {realTimeTest.message}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {realTimeTest.article && (
                    <Card className="bg-slate-700 border-slate-600">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">
                          生成された記事
                        </CardTitle>
                        <p className="text-sm text-gray-400">
                          プロバイダー: {realTimeTest.provider} | 
                          文字数: {realTimeTest.article.wordCount} | 
                          タイトル: {realTimeTest.article.title}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-white font-medium mb-2">タイトル</h4>
                            <p className="text-gray-300 bg-slate-800 p-3 rounded">
                              {realTimeTest.article.title}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-white font-medium mb-2">本文</h4>
                            <div className="text-gray-300 bg-slate-800 p-3 rounded whitespace-pre-wrap">
                              {realTimeTest.article.content}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-white font-medium mb-2">要約</h4>
                            <p className="text-gray-300 bg-slate-800 p-3 rounded">
                              {realTimeTest.article.summary}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ニュースベース生成タブ */}
          <TabsContent value="news-based">
            <NewsBasedArticleGenerationForm newsItems={newsItems} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function TestPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <TestContent />
    </QueryClientProvider>
  )
}