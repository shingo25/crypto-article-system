'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createComponentLogger } from '@/lib/simple-logger'
import toast from 'react-hot-toast'
import {
  Send,
  Globe,
  Mail,
  Webhook,
  Rss,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Edit,
  Copy,
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  FileText,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Download
} from 'lucide-react'

const componentLogger = createComponentLogger('ContentDistributionDashboard')

interface DistributionChannel {
  id: string
  tenantId: string
  name: string
  type: 'rss' | 'webhook' | 'email' | 'api'
  config: any
  isActive: boolean
  lastSync?: string
  syncStats: {
    totalSent: number
    successCount: number
    errorCount: number
    lastError?: string
  }
  createdAt: string
  updatedAt: string
}

interface ContentItem {
  id: string
  type: 'article' | 'topic' | 'analysis'
  title: string
  summary: string
  metadata: {
    publishedAt: string
    status: 'draft' | 'published' | 'archived'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    tags: string[]
    categories: string[]
  }
  distribution: {
    channels: string[]
    publishedChannels: string[]
    failedChannels: string[]
  }
  analytics: {
    views: number
    downloads: number
    apiAccess: number
  }
}

export default function ContentDistributionDashboard() {
  const [channels, setChannels] = useState<DistributionChannel[]>([])
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showChannelForm, setShowChannelForm] = useState(false)

  // チャンネル作成フォーム
  const [channelForm, setChannelForm] = useState({
    name: '',
    type: 'webhook' as 'webhook' | 'rss' | 'email' | 'api',
    webhookUrl: '',
    webhookMethod: 'POST',
    webhookAuthType: 'none',
    webhookAuthToken: '',
    rssTitle: '',
    rssDescription: '',
    rssLink: '',
    emailRecipients: '',
    emailTemplate: 'default',
    emailSubject: '',
    apiEndpoint: '',
    apiFormat: 'json'
  })

  const tenantId = 'tenant_demo' // 実際は認証から取得

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [channelsResponse, contentResponse] = await Promise.all([
        fetch(`/api/channels?tenantId=${tenantId}`),
        fetch(`/api/content?tenantId=${tenantId}&limit=20`)
      ])

      if (channelsResponse.ok) {
        const channelsData = await channelsResponse.json()
        setChannels(channelsData.data)
      }

      if (contentResponse.ok) {
        const contentData = await contentResponse.json()
        setContent(contentData.data)
      }

    } catch (error) {
      componentLogger.error('データ読み込みに失敗', error as Error)
      toast.error('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const createChannel = async () => {
    try {
      let config: any = {}

      switch (channelForm.type) {
        case 'webhook':
          config = {
            url: channelForm.webhookUrl,
            method: channelForm.webhookMethod,
            authType: channelForm.webhookAuthType,
            ...(channelForm.webhookAuthType === 'bearer' && {
              authConfig: { token: channelForm.webhookAuthToken }
            })
          }
          break
        case 'rss':
          config = {
            title: channelForm.rssTitle,
            description: channelForm.rssDescription,
            link: channelForm.rssLink
          }
          break
        case 'email':
          config = {
            recipients: channelForm.emailRecipients.split(',').map(email => email.trim()),
            template: channelForm.emailTemplate,
            subject: channelForm.emailSubject
          }
          break
        case 'api':
          config = {
            endpoint: channelForm.apiEndpoint,
            format: channelForm.apiFormat
          }
          break
      }

      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: channelForm.name,
          type: channelForm.type,
          config
        })
      })

      if (response.ok) {
        const data = await response.json()
        setChannels(prev => [...prev, data.data])
        setShowChannelForm(false)
        setChannelForm({
          name: '',
          type: 'webhook',
          webhookUrl: '',
          webhookMethod: 'POST',
          webhookAuthType: 'none',
          webhookAuthToken: '',
          rssTitle: '',
          rssDescription: '',
          rssLink: '',
          emailRecipients: '',
          emailTemplate: 'default',
          emailSubject: '',
          apiEndpoint: '',
          apiFormat: 'json'
        })
        toast.success('配信チャンネルを作成しました')
      } else {
        throw new Error('Channel creation failed')
      }
    } catch (error) {
      componentLogger.error('チャンネル作成に失敗', error as Error)
      toast.error('チャンネルの作成に失敗しました')
    }
  }

  const distributeContent = async (contentId: string, channelIds?: string[]) => {
    try {
      const response = await fetch('/api/content/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          channelIds,
          force: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        const { summary } = data.data
        toast.success(`配信完了: ${summary.success}件成功, ${summary.errors}件失敗`)
        loadData() // データ再読み込み
      } else {
        throw new Error('Distribution failed')
      }
    } catch (error) {
      componentLogger.error('コンテンツ配信に失敗', error as Error)
      toast.error('コンテンツの配信に失敗しました')
    }
  }

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'webhook': return <Webhook className="h-4 w-4" />
      case 'rss': return <Rss className="h-4 w-4" />
      case 'email': return <Mail className="h-4 w-4" />
      case 'api': return <Globe className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const getChannelTypeColor = (type: string) => {
    switch (type) {
      case 'webhook': return 'bg-blue-600'
      case 'rss': return 'bg-orange-600'
      case 'email': return 'bg-green-600'
      case 'api': return 'bg-purple-600'
      default: return 'bg-gray-600'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-600'
      case 'draft': return 'bg-yellow-600'
      case 'archived': return 'bg-gray-600'
      default: return 'bg-gray-600'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600'
      case 'high': return 'bg-orange-600'
      case 'medium': return 'bg-blue-600'
      case 'low': return 'bg-gray-600'
      default: return 'bg-gray-600'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  const copyRssUrl = (channelId: string) => {
    const url = `${window.location.origin}/api/rss?tenantId=${tenantId}&channelId=${channelId}`
    navigator.clipboard.writeText(url)
    toast.success('RSS URLをコピーしました')
  }

  // 統計計算
  const channelStats = {
    total: channels.length,
    active: channels.filter(c => c.isActive).length,
    inactive: channels.filter(c => !c.isActive).length,
    totalSent: channels.reduce((sum, c) => sum + c.syncStats.totalSent, 0),
    successRate: channels.length > 0 
      ? (channels.reduce((sum, c) => sum + c.syncStats.successCount, 0) / 
         Math.max(channels.reduce((sum, c) => sum + c.syncStats.totalSent, 0), 1)) * 100 
      : 0
  }

  const contentStats = {
    total: content.length,
    published: content.filter(c => c.metadata.status === 'published').length,
    distributed: content.filter(c => c.distribution.publishedChannels.length > 0).length,
    totalViews: content.reduce((sum, c) => sum + c.analytics.views, 0),
    totalDownloads: content.reduce((sum, c) => sum + c.analytics.downloads, 0)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <Send className="h-8 w-8" />
            コンテンツ配信管理
          </h2>
          <p className="text-gray-400 mt-1">エンタープライズグレードのコンテンツ配信とチャンネル管理</p>
        </div>
        
        <Button
          onClick={() => setShowChannelForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          チャンネル作成
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Settings className="h-8 w-8 text-blue-400" />
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{channelStats.total}</p>
                <p className="text-sm text-gray-400">配信チャンネル</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-400">
                アクティブ: {channelStats.active} / 無効: {channelStats.inactive}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <FileText className="h-8 w-8 text-green-400" />
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{contentStats.published}</p>
                <p className="text-sm text-gray-400">公開コンテンツ</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-400">
                配信済み: {contentStats.distributed} / 総数: {contentStats.total}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-8 w-8 text-purple-400" />
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{channelStats.successRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-400">配信成功率</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-400">
                総配信数: {channelStats.totalSent.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <BarChart3 className="h-8 w-8 text-orange-400" />
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{contentStats.totalViews.toLocaleString()}</p>
                <p className="text-sm text-gray-400">総閲覧数</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-400">
                ダウンロード: {contentStats.totalDownloads.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-600">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="channels">チャンネル</TabsTrigger>
          <TabsTrigger value="content">コンテンツ</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
        </TabsList>

        {/* 概要タブ */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 最近の配信 */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  最近の配信活動
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {content.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900 rounded">
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${getStatusColor(item.metadata.status)} text-white text-xs`}>
                            {item.metadata.status}
                          </Badge>
                          <Badge className={`${getPriorityColor(item.metadata.priority)} text-white text-xs`}>
                            {item.metadata.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm">
                          {item.distribution.publishedChannels.length} / {channels.length}
                        </p>
                        <p className="text-gray-400 text-xs">配信チャンネル</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* チャンネルステータス */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  チャンネルステータス
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {channels.slice(0, 5).map(channel => (
                    <div key={channel.id} className="flex items-center justify-between p-3 bg-slate-900 rounded">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${getChannelTypeColor(channel.type)} flex items-center justify-center`}>
                          {getChannelIcon(channel.type)}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{channel.name}</p>
                          <p className="text-gray-400 text-xs">{channel.type.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {channel.isActive ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}
                        <p className="text-gray-400 text-xs mt-1">
                          {channel.syncStats.successCount}/{channel.syncStats.totalSent}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* チャンネル管理タブ */}
        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {channels.map(channel => (
              <Card key={channel.id} className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${getChannelTypeColor(channel.type)} flex items-center justify-center`}>
                        {getChannelIcon(channel.type)}
                      </div>
                      <div>
                        <CardTitle className="text-white text-sm">{channel.name}</CardTitle>
                        <p className="text-gray-400 text-xs">{channel.type.toUpperCase()}</p>
                      </div>
                    </div>
                    {channel.isActive ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400">配信成功</p>
                      <p className="text-white font-semibold">{channel.syncStats.successCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">配信失敗</p>
                      <p className="text-white font-semibold">{channel.syncStats.errorCount}</p>
                    </div>
                  </div>
                  
                  {channel.lastSync && (
                    <div>
                      <p className="text-gray-400 text-xs">最終同期</p>
                      <p className="text-white text-xs">{formatDate(channel.lastSync)}</p>
                    </div>
                  )}

                  {channel.syncStats.lastError && (
                    <Alert className="border-red-500 bg-red-900/20">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {channel.syncStats.lastError}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    {channel.type === 'rss' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyRssUrl(channel.id)}
                        className="border-slate-600 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        URL
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-xs"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      編集
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* コンテンツ管理タブ */}
        <TabsContent value="content" className="space-y-4">
          <div className="space-y-4">
            {content.map(item => (
              <Card key={item.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-white font-semibold">{item.title}</h3>
                        <Badge className={`${getStatusColor(item.metadata.status)} text-white`}>
                          {item.metadata.status}
                        </Badge>
                        <Badge className={`${getPriorityColor(item.metadata.priority)} text-white`}>
                          {item.metadata.priority}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-3">{item.summary}</p>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-blue-400" />
                          <span className="text-gray-400">{item.analytics.views} views</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4 text-green-400" />
                          <span className="text-gray-400">{item.analytics.downloads} downloads</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4 text-purple-400" />
                          <span className="text-gray-400">{item.analytics.apiAccess} API access</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        {item.metadata.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="border-slate-600 text-gray-300 text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div>
                        <p className="text-white font-semibold text-sm">
                          {item.distribution.publishedChannels.length} / {channels.length}
                        </p>
                        <p className="text-gray-400 text-xs">配信済み</p>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => distributeContent(item.id)}
                        disabled={item.metadata.status !== 'published'}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        配信
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 分析タブ */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">チャンネル別配信実績</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {channels.map(channel => {
                    const successRate = channel.syncStats.totalSent > 0 
                      ? (channel.syncStats.successCount / channel.syncStats.totalSent) * 100 
                      : 0
                    
                    return (
                      <div key={channel.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${getChannelTypeColor(channel.type)}`}></div>
                            <span className="text-white text-sm">{channel.name}</span>
                          </div>
                          <span className="text-gray-400 text-sm">{successRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${successRate}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">コンテンツパフォーマンス</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {content.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900 rounded">
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{item.title}</p>
                        <p className="text-gray-400 text-xs">{formatDate(item.metadata.publishedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm">{item.analytics.views}</p>
                        <p className="text-gray-400 text-xs">views</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* チャンネル作成モーダル */}
      {showChannelForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-white">新しい配信チャンネル</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">チャンネル名</Label>
                <Input
                  value={channelForm.name}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="チャンネル名を入力"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">チャンネルタイプ</Label>
                <select
                  value={channelForm.type}
                  onChange={(e) => setChannelForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                >
                  <option value="webhook">Webhook</option>
                  <option value="rss">RSS Feed</option>
                  <option value="email">Email</option>
                  <option value="api">API</option>
                </select>
              </div>

              {channelForm.type === 'webhook' && (
                <>
                  <div>
                    <Label className="text-gray-300">Webhook URL</Label>
                    <Input
                      value={channelForm.webhookUrl}
                      onChange={(e) => setChannelForm(prev => ({ ...prev, webhookUrl: e.target.value }))}
                      placeholder="https://example.com/webhook"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">認証タイプ</Label>
                    <select
                      value={channelForm.webhookAuthType}
                      onChange={(e) => setChannelForm(prev => ({ ...prev, webhookAuthType: e.target.value }))}
                      className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                    >
                      <option value="none">なし</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="api_key">API Key</option>
                    </select>
                  </div>
                  {channelForm.webhookAuthType === 'bearer' && (
                    <div>
                      <Label className="text-gray-300">トークン</Label>
                      <Input
                        type="password"
                        value={channelForm.webhookAuthToken}
                        onChange={(e) => setChannelForm(prev => ({ ...prev, webhookAuthToken: e.target.value }))}
                        placeholder="Bearer token"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  )}
                </>
              )}

              {channelForm.type === 'rss' && (
                <>
                  <div>
                    <Label className="text-gray-300">フィードタイトル</Label>
                    <Input
                      value={channelForm.rssTitle}
                      onChange={(e) => setChannelForm(prev => ({ ...prev, rssTitle: e.target.value }))}
                      placeholder="RSS フィードのタイトル"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">説明</Label>
                    <Input
                      value={channelForm.rssDescription}
                      onChange={(e) => setChannelForm(prev => ({ ...prev, rssDescription: e.target.value }))}
                      placeholder="フィードの説明"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </>
              )}

              {channelForm.type === 'email' && (
                <>
                  <div>
                    <Label className="text-gray-300">受信者 (カンマ区切り)</Label>
                    <Input
                      value={channelForm.emailRecipients}
                      onChange={(e) => setChannelForm(prev => ({ ...prev, emailRecipients: e.target.value }))}
                      placeholder="email1@example.com, email2@example.com"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">件名</Label>
                    <Input
                      value={channelForm.emailSubject}
                      onChange={(e) => setChannelForm(prev => ({ ...prev, emailSubject: e.target.value }))}
                      placeholder="メールの件名"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </>
              )}

              {channelForm.type === 'api' && (
                <div>
                  <Label className="text-gray-300">API エンドポイント</Label>
                  <Input
                    value={channelForm.apiEndpoint}
                    onChange={(e) => setChannelForm(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                    placeholder="https://api.example.com/content"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={createChannel}
                  disabled={!channelForm.name}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  作成
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowChannelForm(false)}
                  className="border-slate-600"
                >
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}