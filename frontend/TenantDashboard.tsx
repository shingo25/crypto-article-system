'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createComponentLogger } from '@/lib/simple-logger'
import toast from 'react-hot-toast'
import {
  Building,
  Users,
  FileText,
  HardDrive,
  Zap,
  Settings,
  Palette,
  Globe,
  Bell,
  CreditCard,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Upload
} from 'lucide-react'

const componentLogger = createComponentLogger('TenantDashboard')

interface TenantData {
  tenant: {
    id: string
    name: string
    plan: string
    status: string
  }
  stats: {
    totalArticles: number
    totalTopics: number
    totalUsers: number
    storageUsed: number
    apiUsage: {
      daily: number
      monthly: number
    }
  }
  usage: {
    current: {
      articlesCreated: number
      apiCallsMade: number
      storageUsed: number
    }
    limits: {
      monthlyArticles: number
      monthlyApiCalls: number
      users: number
      storage: number
    }
    percentage: {
      articles: number
      api: number
      storage: number
    }
  }
  features: Record<string, boolean>
}

export default function TenantDashboard() {
  const [tenantData, setTenantData] = useState<TenantData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  
  // 仮のテナントID（実際は認証から取得）
  const tenantId = 'tenant_demo'

  // テナント情報を取得
  const loadTenantData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tenant/stats?tenantId=${tenantId}`)
      const data = await response.json()
      
      if (data.success) {
        setTenantData(data.data)
      } else {
        toast.error('テナント情報の取得に失敗しました')
      }
    } catch (error) {
      componentLogger.error('テナントデータ取得エラー', error as Error)
      toast.error('テナント情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTenantData()
  }, [])

  // プランバッジ
  const getPlanBadge = (plan: string) => {
    const colors = {
      free: 'bg-gray-500',
      starter: 'bg-blue-500',
      professional: 'bg-purple-500',
      enterprise: 'bg-gold-500'
    }
    return (
      <Badge className={`${colors[plan as keyof typeof colors]} text-white`}>
        {plan.toUpperCase()}
      </Badge>
    )
  }

  // 使用率に応じた色
  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-500'
    if (percentage < 80) return 'text-yellow-500'
    return 'text-red-500'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!tenantData) {
    return (
      <Alert className="border-red-500 bg-red-900/20">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          テナント情報の読み込みに失敗しました
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <Building className="h-8 w-8" />
            {tenantData.tenant.name}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            {getPlanBadge(tenantData.tenant.plan)}
            <Badge variant={tenantData.tenant.status === 'active' ? 'default' : 'secondary'}>
              {tenantData.tenant.status}
            </Badge>
          </div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <CreditCard className="h-4 w-4 mr-2" />
          プランをアップグレード
        </Button>
      </div>

      {/* 使用状況サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="h-8 w-8 text-blue-400" />
              <span className={`text-2xl font-bold ${getUsageColor(tenantData.usage.percentage.articles)}`}>
                {tenantData.usage.percentage.articles.toFixed(0)}%
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-white font-semibold">記事作成</p>
              <p className="text-sm text-gray-400">
                {tenantData.usage.current.articlesCreated} / {
                  tenantData.usage.limits.monthlyArticles === -1 
                    ? '無制限' 
                    : tenantData.usage.limits.monthlyArticles
                }
              </p>
            </div>
            <Progress 
              value={tenantData.usage.percentage.articles} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-8 w-8 text-yellow-400" />
              <span className={`text-2xl font-bold ${getUsageColor(tenantData.usage.percentage.api)}`}>
                {tenantData.usage.percentage.api.toFixed(0)}%
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-white font-semibold">API使用量</p>
              <p className="text-sm text-gray-400">
                {tenantData.usage.current.apiCallsMade.toLocaleString()} / {
                  tenantData.usage.limits.monthlyApiCalls === -1
                    ? '無制限'
                    : tenantData.usage.limits.monthlyApiCalls.toLocaleString()
                }
              </p>
            </div>
            <Progress 
              value={tenantData.usage.percentage.api} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <HardDrive className="h-8 w-8 text-green-400" />
              <span className={`text-2xl font-bold ${getUsageColor(tenantData.usage.percentage.storage)}`}>
                {tenantData.usage.percentage.storage.toFixed(0)}%
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-white font-semibold">ストレージ</p>
              <p className="text-sm text-gray-400">
                {tenantData.usage.current.storageUsed.toFixed(1)} GB / {
                  tenantData.usage.limits.storage === -1
                    ? '無制限'
                    : `${tenantData.usage.limits.storage} GB`
                }
              </p>
            </div>
            <Progress 
              value={tenantData.usage.percentage.storage} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">
                {tenantData.stats.totalUsers}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-white font-semibold">ユーザー数</p>
              <p className="text-sm text-gray-400">
                最大: {
                  tenantData.usage.limits.users === -1
                    ? '無制限'
                    : tenantData.usage.limits.users
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-600">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
          <TabsTrigger value="branding">ブランディング</TabsTrigger>
          <TabsTrigger value="features">機能</TabsTrigger>
        </TabsList>

        {/* 概要タブ */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  コンテンツ統計
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">総記事数</span>
                  <span className="text-white font-semibold">
                    {tenantData.stats.totalArticles.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">総トピック数</span>
                  <span className="text-white font-semibold">
                    {tenantData.stats.totalTopics.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">本日のAPI使用</span>
                  <span className="text-white font-semibold">
                    {tenantData.stats.apiUsage.daily.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  成長指標
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">月間記事作成</span>
                  <div className="flex items-center gap-1">
                    <span className="text-white font-semibold">
                      {tenantData.usage.current.articlesCreated}
                    </span>
                    <span className="text-green-400 text-sm">+23%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">月間API呼び出し</span>
                  <div className="flex items-center gap-1">
                    <span className="text-white font-semibold">
                      {tenantData.usage.current.apiCallsMade.toLocaleString()}
                    </span>
                    <span className="text-green-400 text-sm">+15%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">アクティブユーザー</span>
                  <div className="flex items-center gap-1">
                    <span className="text-white font-semibold">
                      {Math.floor(tenantData.stats.totalUsers * 0.8)}
                    </span>
                    <span className="text-yellow-400 text-sm">-2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 設定タブ */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                AI & 記事設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">優先AIモデル</Label>
                  <select className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded text-white">
                    <option value="openai">OpenAI GPT-4</option>
                    <option value="claude">Claude 3</option>
                    <option value="gemini">Gemini Pro</option>
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300">デフォルト文字数</Label>
                  <Input 
                    type="number" 
                    defaultValue={800}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">自動公開</p>
                  <p className="text-sm text-gray-400">AIが生成した記事を自動で公開</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">メール通知</p>
                  <p className="text-sm text-gray-400">重要なイベントをメールで通知</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Slack Webhook URL</Label>
                <Input 
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ブランディングタブ */}
        <TabsContent value="branding" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Palette className="h-5 w-5" />
                ビジュアルカスタマイズ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">ロゴ</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="w-20 h-20 bg-slate-700 rounded flex items-center justify-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                    <Button variant="outline" size="sm" className="border-slate-600">
                      アップロード
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-gray-300">ファビコン</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="w-20 h-20 bg-slate-700 rounded flex items-center justify-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                    <Button variant="outline" size="sm" className="border-slate-600">
                      アップロード
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">プライマリカラー</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <input 
                      type="color" 
                      defaultValue="#1a1a1a"
                      className="h-10 w-20 rounded cursor-pointer"
                    />
                    <Input 
                      type="text"
                      defaultValue="#1a1a1a"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-gray-300">セカンダリカラー</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <input 
                      type="color" 
                      defaultValue="#3b82f6"
                      className="h-10 w-20 rounded cursor-pointer"
                    />
                    <Input 
                      type="text"
                      defaultValue="#3b82f6"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-gray-300">カスタムドメイン</Label>
                <div className="mt-2 flex gap-2">
                  <Input 
                    type="text"
                    placeholder="news.yourdomain.com"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    検証
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  CNAMEレコードを crypto-news.app に向けてください
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 機能タブ */}
        <TabsContent value="features" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                利用可能な機能
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(tenantData.features).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-center justify-between p-3 bg-slate-900 rounded">
                    <span className="text-white capitalize">
                      {feature.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {enabled ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <div className="text-gray-500">
                        <span className="text-xs">要アップグレード</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}