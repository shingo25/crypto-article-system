'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  AlertCircle, 
  Activity, 
  Server, 
  Clock, 
  TrendingUp, 
  Zap, 
  Database,
  Monitor,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Globe
} from "lucide-react"
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

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

interface SystemStats {
  articlesGenerated: number
  topicsCollected: number
  systemStatus: 'running' | 'stopped' | 'error'
  lastRun: string
  dailyQuota: {
    used: number
    total: number
  }
}

interface LogEntry {
  timestamp: string
  level: string
  message: string
  component?: string
}

interface PerformanceMetrics {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkLatency: number
  apiResponseTime: number
  uptime: string
}

export default function SystemMonitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [systemStats, setSystemStats] = useState<SystemStats>({
    articlesGenerated: 0,
    topicsCollected: 0,
    systemStatus: 'stopped',
    lastRun: '',
    dailyQuota: { used: 0, total: 50 }
  })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [performance, setPerformance] = useState<PerformanceMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkLatency: 0,
    apiResponseTime: 0,
    uptime: '0h 0m'
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5)

  // メトリクスを取得
  const loadMetrics = async () => {
    try {
      const response = await apiClient.request<{ metrics: SystemMetrics }>('/api/system/metrics')
      setMetrics(response.metrics)
    } catch (error) {
      console.error('Failed to load system metrics:', error)
      toast.error('システムメトリクスの読み込みに失敗しました')
    }
  }

  // データ取得
  const fetchData = async () => {
    try {
      setError(null)
      
      // システム統計を取得
      const stats = await apiClient.getSystemStats()
      setSystemStats(stats)
      
      // ログを取得
      const logsResponse = await apiClient.getLogs({ limit: 50 })
      setLogs(logsResponse.logs || [])
      
      // パフォーマンスメトリクス（モック）
      setPerformance({
        cpuUsage: Math.round(Math.random() * 30 + 10), // 10-40%
        memoryUsage: Math.round(Math.random() * 40 + 30), // 30-70%
        diskUsage: Math.round(Math.random() * 20 + 40), // 40-60%
        networkLatency: Math.round(Math.random() * 50 + 20), // 20-70ms
        apiResponseTime: Math.round(Math.random() * 200 + 100), // 100-300ms
        uptime: '2h 34m'
      })
      
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error)
      setError(error instanceof Error ? error.message : 'データの取得に失敗しました')
    }
  }

  // 初回データ取得
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      await Promise.all([fetchData(), loadMetrics()])
      setLoading(false)
    }
    loadInitialData()
  }, [])

  // 自動更新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchData()
      loadMetrics()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchData(), loadMetrics()])
    setIsRefreshing(false)
  }

  // システム制御
  const controlSystem = async (action: 'start' | 'stop' | 'restart') => {
    try {
      const response = await apiClient.systemControl(action)
      if (response.success) {
        toast.success(response.message)
        await Promise.all([fetchData(), loadMetrics()])
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500 text-white'
      case 'stopped': return 'bg-red-500 text-white'
      case 'error': return 'bg-orange-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return 'text-red-400'
      case 'WARN': return 'text-yellow-400'
      case 'INFO': return 'text-green-400'
      case 'DEBUG': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  const getPerformanceColor = (value: number, threshold: number) => {
    if (value < threshold) return 'text-green-400'
    if (value < threshold * 1.5) return 'text-yellow-400'
    return 'text-red-400'
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
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isRefreshing ? '更新中...' : '手動更新'}
              </Button>
            </div>
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

      {/* システム概要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className={`border-0 text-white card-hover ${
          systemStats.systemStatus === 'running' 
            ? 'bg-gradient-to-br from-green-500 to-green-700' 
            : 'bg-gradient-to-br from-red-500 to-red-700'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              システム状態
            </CardTitle>
            <Server className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats.systemStatus === 'running' ? '稼働中' : '停止中'}
            </div>
            <p className="text-xs text-white/70 mt-1">
              最終実行: {systemStats.lastRun}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-0 text-white card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">
              記事生成数
            </CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats.dailyQuota.used} / {systemStats.dailyQuota.total}
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mt-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(systemStats.dailyQuota.used / systemStats.dailyQuota.total) * 100}%` 
                }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 border-0 text-white card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100">
              収集トピック数
            </CardTitle>
            <Database className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats.topicsCollected}
            </div>
            <p className="text-xs text-emerald-200 mt-1">
              アクティブトピック
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-purple-800 border-0 text-white card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-100">
              稼働時間
            </CardTitle>
            <Clock className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performance.uptime}
            </div>
            <p className="text-xs text-purple-200 mt-1">
              連続稼働中
            </p>
          </CardContent>
        </Card>
      </div>

      {/* パフォーマンスメトリクス */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5" />
              パフォーマンスメトリクス
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">CPU使用率</span>
                <span className={`font-bold ${getPerformanceColor(performance.cpuUsage, 50)}`}>
                  {performance.cpuUsage}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    performance.cpuUsage < 50 ? 'bg-green-500' : 
                    performance.cpuUsage < 75 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${performance.cpuUsage}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">メモリ使用率</span>
                <span className={`font-bold ${getPerformanceColor(performance.memoryUsage, 70)}`}>
                  {performance.memoryUsage}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    performance.memoryUsage < 70 ? 'bg-green-500' : 
                    performance.memoryUsage < 85 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${performance.memoryUsage}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">ディスク使用率</span>
                <span className={`font-bold ${getPerformanceColor(performance.diskUsage, 80)}`}>
                  {performance.diskUsage}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    performance.diskUsage < 80 ? 'bg-green-500' : 
                    performance.diskUsage < 90 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${performance.diskUsage}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-600">
              <div className="text-center">
                <div className="text-sm text-slate-400">ネットワーク遅延</div>
                <div className={`text-lg font-bold ${getPerformanceColor(performance.networkLatency, 100)}`}>
                  {performance.networkLatency}ms
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-400">API応答時間</div>
                <div className={`text-lg font-bold ${getPerformanceColor(performance.apiResponseTime, 500)}`}>
                  {performance.apiResponseTime}ms
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* システムログ */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">システムログ</CardTitle>
            <CardDescription className="text-slate-400">
              最新の{logs.length}件のログエントリ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto border border-slate-600">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 mb-2">
                    <span className="text-blue-400 text-xs shrink-0">
                      {log.timestamp}
                    </span>
                    <span className={`font-bold text-xs shrink-0 ${getLogLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}:
                    </span>
                    <span className="text-xs text-slate-300">
                      {log.component && `[${log.component}] `}{log.message}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-8">
                  ログエントリがありません
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 詳細統計 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">詳細統計</CardTitle>
          <CardDescription className="text-slate-400">
            システム動作の詳細な分析データ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="text-white font-medium">記事生成統計</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">今日の生成数</span>
                  <span className="text-white">{systemStats.dailyQuota.used}件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">平均生成時間</span>
                  <span className="text-white">3.2分</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">成功率</span>
                  <span className="text-green-400">98.5%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-medium">トピック収集統計</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">アクティブトピック</span>
                  <span className="text-white">{systemStats.topicsCollected}件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">今日の新規取得</span>
                  <span className="text-white">24件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">平均スコア</span>
                  <span className="text-white">78.3</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-medium">エラー統計</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">過去24時間</span>
                  <span className="text-yellow-400">2件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">API接続エラー</span>
                  <span className="text-red-400">0件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">システム可用性</span>
                  <span className="text-green-400">99.8%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}