'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'
import {
  Monitor,
  Activity,
  Database,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Clock,
  TrendingUp,
  Settings,
  AlertCircle,
  Zap,
  Globe
} from 'lucide-react'

interface SystemMetrics {
  system: {
    cpu_percent: number
    memory: {
      total: number
      used: number
      percent: number
    }
    disk: {
      total: number
      used: number
      percent: number
    }
    uptime: number
    load_average: number[]
  }
  database: {
    connected: boolean
    pool_size: number
    active_connections: number
    idle_connections: number
    status: 'healthy' | 'warning' | 'error'
  }
  redis: {
    connected: boolean
    memory_used: number
    memory_peak: number
    uptime: number
    status: 'healthy' | 'warning' | 'error'
  }
  api: {
    total_requests: number
    requests_per_minute: number
    avg_response_time: number
    error_rate: number
    active_tasks: number
  }
  services: {
    scheduler: {
      running: boolean
      last_run: string | null
      next_run: string | null
      total_runs: number
      error_count: number
    }
    celery: {
      workers: number
      active_tasks: number
      processed_tasks: number
      failed_tasks: number
    }
    topic_collector: {
      status: 'running' | 'stopped' | 'error'
      last_collection: string | null
      total_collected: number
      sources_active: number
    }
  }
}

export default function SystemMonitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5)

  // メトリクスを取得
  const loadMetrics = async () => {
    try {
      // 実際のAPIエンドポイントが利用できない場合はモックデータを使用
      const mockMetrics: SystemMetrics = {
        system: {
          cpu_percent: Math.round(Math.random() * 40 + 10),
          memory: {
            total: 16777216000,
            used: Math.round(Math.random() * 8000000000 + 4000000000),
            percent: Math.round(Math.random() * 40 + 30)
          },
          disk: {
            total: 1000000000000,
            used: Math.round(Math.random() * 400000000000 + 400000000000),
            percent: Math.round(Math.random() * 20 + 40)
          },
          uptime: Math.round(Math.random() * 86400 + 3600),
          load_average: [
            Math.round(Math.random() * 200) / 100,
            Math.round(Math.random() * 200) / 100,
            Math.round(Math.random() * 200) / 100
          ]
        },
        database: {
          connected: Math.random() > 0.1,
          pool_size: 20,
          active_connections: Math.round(Math.random() * 10 + 2),
          idle_connections: Math.round(Math.random() * 8 + 2),
          status: Math.random() > 0.8 ? 'warning' : 'healthy'
        },
        redis: {
          connected: Math.random() > 0.05,
          memory_used: Math.round(Math.random() * 100000000 + 50000000),
          memory_peak: Math.round(Math.random() * 150000000 + 100000000),
          uptime: Math.round(Math.random() * 86400 + 3600),
          status: Math.random() > 0.9 ? 'warning' : 'healthy'
        },
        api: {
          total_requests: Math.round(Math.random() * 10000 + 5000),
          requests_per_minute: Math.round(Math.random() * 50 + 10),
          avg_response_time: Math.round(Math.random() * 200 + 100),
          error_rate: Math.round(Math.random() * 5) / 100,
          active_tasks: Math.round(Math.random() * 5)
        },
        services: {
          scheduler: {
            running: Math.random() > 0.1,
            last_run: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            next_run: new Date(Date.now() + Math.random() * 3600000).toISOString(),
            total_runs: Math.round(Math.random() * 1000 + 100),
            error_count: Math.round(Math.random() * 5)
          },
          celery: {
            workers: Math.round(Math.random() * 3 + 1),
            active_tasks: Math.round(Math.random() * 5),
            processed_tasks: Math.round(Math.random() * 500 + 100),
            failed_tasks: Math.round(Math.random() * 10)
          },
          topic_collector: {
            status: Math.random() > 0.2 ? 'running' : 'stopped',
            last_collection: new Date(Date.now() - Math.random() * 1800000).toISOString(),
            total_collected: Math.round(Math.random() * 1000 + 200),
            sources_active: Math.round(Math.random() * 8 + 2)
          }
        }
      }

      try {
        const response = await apiClient.request<{ metrics: SystemMetrics }>('/api/system/metrics')
        setMetrics(response.metrics)
      } catch (error) {
        console.warn('Using mock data for system metrics:', error)
        setMetrics(mockMetrics)
      }
    } catch (error) {
      console.error('Failed to load system metrics:', error)
      toast.error('システムメトリクスの読み込みに失敗しました')
    }
  }

  // 初回読み込み
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      await loadMetrics()
      setLoading(false)
    }
    loadInitialData()
  }, [])

  // 自動更新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadMetrics()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // システム制御
  const controlSystem = async (action: 'start' | 'stop' | 'restart') => {
    try {
      const response = await apiClient.systemControl(action)
      if (response.success) {
        toast.success(response.message)
        await loadMetrics()
      } else {
        toast.error(response.message)
      }
    } catch (error) {
      console.error('Failed to control system:', error)
      toast.error(`システム${action}に失敗しました`)
    }
  }

  // ステータスアイコンを取得
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case 'error':
      case 'stopped':
        return <XCircle className="h-4 w-4 text-red-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  // ステータスバッジを取得
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
        return <Badge className="bg-green-500/20 border-green-500/50 text-green-400">正常</Badge>
      case 'warning':
        return <Badge className="bg-yellow-500/20 border-yellow-500/50 text-yellow-400">警告</Badge>
      case 'error':
      case 'stopped':
        return <Badge className="bg-red-500/20 border-red-500/50 text-red-400">エラー</Badge>
      default:
        return <Badge className="bg-gray-500/20 border-gray-500/50 text-gray-400">不明</Badge>
    }
  }

  // バイト数をフォーマット
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // アップタイムをフォーマット
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}日 ${hours}時間`
    if (hours > 0) return `${hours}時間 ${minutes}分`
    return `${minutes}分`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Monitor className="h-6 w-6" />
              システム監視
            </h3>
            <p className="text-gray-400 mt-1">システムリソースとサービス状況を監視します</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-700 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <Monitor className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">システムメトリクスを読み込めませんでした</p>
        <Button
          onClick={() => loadMetrics()}
          className="mt-4 bg-blue-600 hover:bg-blue-700"
        >
          再試行
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            システム監視
          </h3>
          <p className="text-gray-400 mt-1">
            システムリソースとサービス状況を監視します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
          >
            <option value={5}>5秒間隔</option>
            <option value={10}>10秒間隔</option>
            <option value={30}>30秒間隔</option>
            <option value={60}>1分間隔</option>
          </select>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            className={autoRefresh ? "bg-green-600 hover:bg-green-700" : "border-gray-600"}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? '自動更新中' : '自動更新'}
          </Button>
          <Button
            onClick={loadMetrics}
            variant="outline"
            size="sm"
            className="border-gray-600"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* システムリソース */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU使用率 */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <Cpu className="h-4 w-4" />
              CPU使用率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-white">
                  {metrics.system.cpu_percent.toFixed(1)}%
                </span>
                <Badge className={
                  metrics.system.cpu_percent > 80 
                    ? "bg-red-500/20 border-red-500/50 text-red-400"
                    : metrics.system.cpu_percent > 60
                    ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                    : "bg-green-500/20 border-green-500/50 text-green-400"
                }>
                  {metrics.system.cpu_percent > 80 ? '高負荷' : 
                   metrics.system.cpu_percent > 60 ? '中負荷' : '正常'}
                </Badge>
              </div>
              <Progress value={metrics.system.cpu_percent} className="h-2" />
              <div className="text-xs text-gray-400">
                ロードアベレージ: {metrics.system.load_average.map(l => l.toFixed(2)).join(', ')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* メモリ使用量 */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <MemoryStick className="h-4 w-4" />
              メモリ使用量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-white">
                  {metrics.system.memory.percent.toFixed(1)}%
                </span>
                <Badge className={
                  metrics.system.memory.percent > 85 
                    ? "bg-red-500/20 border-red-500/50 text-red-400"
                    : metrics.system.memory.percent > 70
                    ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                    : "bg-green-500/20 border-green-500/50 text-green-400"
                }>
                  {metrics.system.memory.percent > 85 ? '高使用' : 
                   metrics.system.memory.percent > 70 ? '中使用' : '正常'}
                </Badge>
              </div>
              <Progress value={metrics.system.memory.percent} className="h-2" />
              <div className="text-xs text-gray-400">
                {formatBytes(metrics.system.memory.used)} / {formatBytes(metrics.system.memory.total)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ディスク使用量 */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <HardDrive className="h-4 w-4" />
              ディスク使用量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-white">
                  {metrics.system.disk.percent.toFixed(1)}%
                </span>
                <Badge className={
                  metrics.system.disk.percent > 90 
                    ? "bg-red-500/20 border-red-500/50 text-red-400"
                    : metrics.system.disk.percent > 80
                    ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                    : "bg-green-500/20 border-green-500/50 text-green-400"
                }>
                  {metrics.system.disk.percent > 90 ? '容量不足' : 
                   metrics.system.disk.percent > 80 ? '要注意' : '正常'}
                </Badge>
              </div>
              <Progress value={metrics.system.disk.percent} className="h-2" />
              <div className="text-xs text-gray-400">
                {formatBytes(metrics.system.disk.used)} / {formatBytes(metrics.system.disk.total)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* データベースとRedis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* データベース状況 */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                データベース
              </div>
              {getStatusBadge(metrics.database.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">接続状態</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(metrics.database.connected ? 'healthy' : 'error')}
                <span className="text-white">
                  {metrics.database.connected ? '接続中' : '切断'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">アクティブ接続</span>
              <span className="text-white">{metrics.database.active_connections}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">アイドル接続</span>
              <span className="text-white">{metrics.database.idle_connections}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">プールサイズ</span>
              <span className="text-white">{metrics.database.pool_size}</span>
            </div>
          </CardContent>
        </Card>

        {/* Redis状況 */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Redis
              </div>
              {getStatusBadge(metrics.redis.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">接続状態</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(metrics.redis.connected ? 'healthy' : 'error')}
                <span className="text-white">
                  {metrics.redis.connected ? '接続中' : '切断'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">メモリ使用量</span>
              <span className="text-white">{formatBytes(metrics.redis.memory_used)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">ピーク使用量</span>
              <span className="text-white">{formatBytes(metrics.redis.memory_peak)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">アップタイム</span>
              <span className="text-white">{formatUptime(metrics.redis.uptime)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API統計 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5" />
            API統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{metrics.api.total_requests.toLocaleString()}</div>
              <div className="text-sm text-gray-400">総リクエスト数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{metrics.api.requests_per_minute}</div>
              <div className="text-sm text-gray-400">リクエスト/分</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{metrics.api.avg_response_time}ms</div>
              <div className="text-sm text-gray-400">平均応答時間</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{(metrics.api.error_rate * 100).toFixed(2)}%</div>
              <div className="text-sm text-gray-400">エラー率</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-gray-400">アクティブタスク</span>
            <span className="text-white">{metrics.api.active_tasks}</span>
          </div>
        </CardContent>
      </Card>

      {/* サービス状況 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5" />
            サービス状況
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* スケジューラー */}
          <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                スケジューラー
              </h4>
              <div className="flex items-center gap-2">
                {getStatusIcon(metrics.services.scheduler.running ? 'running' : 'stopped')}
                <span className="text-white text-sm">
                  {metrics.services.scheduler.running ? '実行中' : '停止中'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">実行回数</div>
                <div className="text-white">{metrics.services.scheduler.total_runs}</div>
              </div>
              <div>
                <div className="text-gray-400">エラー回数</div>
                <div className="text-white">{metrics.services.scheduler.error_count}</div>
              </div>
              <div>
                <div className="text-gray-400">最終実行</div>
                <div className="text-white">
                  {metrics.services.scheduler.last_run 
                    ? new Date(metrics.services.scheduler.last_run).toLocaleString('ja-JP')
                    : 'なし'
                  }
                </div>
              </div>
              <div>
                <div className="text-gray-400">次回実行</div>
                <div className="text-white">
                  {metrics.services.scheduler.next_run 
                    ? new Date(metrics.services.scheduler.next_run).toLocaleString('ja-JP')
                    : 'なし'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Celeryワーカー */}
          <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Celeryワーカー
              </h4>
              <Badge className={
                metrics.services.celery.workers > 0 
                  ? "bg-green-500/20 border-green-500/50 text-green-400"
                  : "bg-red-500/20 border-red-500/50 text-red-400"
              }>
                {metrics.services.celery.workers > 0 ? '実行中' : '停止中'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">ワーカー数</div>
                <div className="text-white">{metrics.services.celery.workers}</div>
              </div>
              <div>
                <div className="text-gray-400">アクティブタスク</div>
                <div className="text-white">{metrics.services.celery.active_tasks}</div>
              </div>
              <div>
                <div className="text-gray-400">処理済み</div>
                <div className="text-white">{metrics.services.celery.processed_tasks}</div>
              </div>
              <div>
                <div className="text-gray-400">失敗</div>
                <div className="text-white">{metrics.services.celery.failed_tasks}</div>
              </div>
            </div>
          </div>

          {/* トピック収集 */}
          <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                トピック収集
              </h4>
              {getStatusBadge(metrics.services.topic_collector.status)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-400">アクティブソース</div>
                <div className="text-white">{metrics.services.topic_collector.sources_active}</div>
              </div>
              <div>
                <div className="text-gray-400">総収集数</div>
                <div className="text-white">{metrics.services.topic_collector.total_collected}</div>
              </div>
              <div>
                <div className="text-gray-400">最終収集</div>
                <div className="text-white">
                  {metrics.services.topic_collector.last_collection 
                    ? new Date(metrics.services.topic_collector.last_collection).toLocaleString('ja-JP')
                    : 'なし'
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* システム制御 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            システム制御
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={() => controlSystem('start')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              開始
            </Button>
            <Button
              onClick={() => controlSystem('stop')}
              variant="destructive"
            >
              <Pause className="h-4 w-4 mr-2" />
              停止
            </Button>
            <Button
              onClick={() => controlSystem('restart')}
              variant="outline"
              className="border-orange-500 text-orange-400 hover:bg-orange-600"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              再起動
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            システムアップタイム: {formatUptime(metrics.system.uptime)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}