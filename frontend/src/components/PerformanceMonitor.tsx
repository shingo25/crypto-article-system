'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'
import {
  Activity,
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Eye,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Settings,
  Calendar,
  Target,
  Gauge,
  Timer,
  Database,
  Cpu,
  MemoryStick,
  HardDrive,
  Globe,
  Users
} from 'lucide-react'

interface PerformanceMetrics {
  timestamp: string
  response_times: {
    p50: number
    p95: number
    p99: number
    avg: number
    max: number
  }
  throughput: {
    requests_per_second: number
    requests_per_minute: number
    peak_rps: number
  }
  errors: {
    total_errors: number
    error_rate: number
    error_types: Record<string, number>
  }
  resources: {
    cpu_usage: number
    memory_usage: number
    disk_io: number
    network_io: number
    active_connections: number
  }
  business_metrics: {
    articles_generated: number
    topics_collected: number
    active_users: number
    api_calls: number
    cache_hit_rate: number
  }
}

interface AlertRule {
  id: string
  name: string
  metric: string
  operator: '>' | '<' | '==' | '>=' | '<='
  threshold: number
  enabled: boolean
  notification_methods: string[]
  last_triggered?: string
}

interface TimeRange {
  value: string
  label: string
  hours: number
}

const TIME_RANGES: TimeRange[] = [
  { value: '1h', label: '過去1時間', hours: 1 },
  { value: '6h', label: '過去6時間', hours: 6 },
  { value: '24h', label: '過去24時間', hours: 24 },
  { value: '7d', label: '過去7日', hours: 168 },
  { value: '30d', label: '過去30日', hours: 720 }
]

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([])
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null)
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [timeRange, setTimeRange] = useState<string>('24h')
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30)

  // メトリクスを取得
  const loadMetrics = async () => {
    try {
      const selectedRange = TIME_RANGES.find(r => r.value === timeRange)
      const hours = selectedRange?.hours || 24

      // 実際のAPIエンドポイントが利用できない場合はモックデータを使用
      const mockCurrentMetrics: PerformanceMetrics = {
        timestamp: new Date().toISOString(),
        response_times: {
          p50: Math.round(Math.random() * 200 + 100),
          p95: Math.round(Math.random() * 800 + 400),
          p99: Math.round(Math.random() * 1500 + 1000),
          avg: Math.round(Math.random() * 300 + 150),
          max: Math.round(Math.random() * 2000 + 1500)
        },
        throughput: {
          requests_per_second: Math.round(Math.random() * 50 + 10),
          requests_per_minute: Math.round(Math.random() * 3000 + 600),
          peak_rps: Math.round(Math.random() * 100 + 50)
        },
        errors: {
          total_errors: Math.round(Math.random() * 10),
          error_rate: Math.round(Math.random() * 5 * 100) / 100,
          error_types: {
            '500': Math.round(Math.random() * 3),
            '404': Math.round(Math.random() * 5),
            '429': Math.round(Math.random() * 2)
          }
        },
        resources: {
          cpu_usage: Math.round(Math.random() * 40 + 20),
          memory_usage: Math.round(Math.random() * 50 + 30),
          disk_io: Math.round(Math.random() * 1000 + 500),
          network_io: Math.round(Math.random() * 5000 + 2000),
          active_connections: Math.round(Math.random() * 100 + 50)
        },
        business_metrics: {
          articles_generated: Math.round(Math.random() * 20 + 5),
          topics_collected: Math.round(Math.random() * 50 + 20),
          active_users: Math.round(Math.random() * 10 + 3),
          api_calls: Math.round(Math.random() * 1000 + 500),
          cache_hit_rate: Math.round(Math.random() * 30 + 70)
        }
      }

      const mockHistoricalData = Array.from({ length: Math.min(hours, 24) }, (_, i) => ({
        ...mockCurrentMetrics,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        response_times: {
          ...mockCurrentMetrics.response_times,
          avg: Math.round(Math.random() * 300 + 150)
        }
      })).reverse()

      try {
        const response = await apiClient.request<{ current: PerformanceMetrics, history: PerformanceMetrics[] }>('/api/performance/metrics', {
          method: 'GET'
        })
        setCurrentMetrics(response.current)
        setMetrics(response.history)
      } catch (error) {
        console.warn('Using mock data for performance metrics:', error)
        setCurrentMetrics(mockCurrentMetrics)
        setMetrics(mockHistoricalData)
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error)
      toast.error('パフォーマンスメトリクスの読み込みに失敗しました')
    }
  }

  // アラートルールを取得
  const loadAlerts = async () => {
    try {
      const mockAlerts: AlertRule[] = [
        {
          id: '1',
          name: 'レスポンス時間警告',
          metric: 'response_time_p95',
          operator: '>',
          threshold: 1000,
          enabled: true,
          notification_methods: ['email', 'slack'],
          last_triggered: '2025-01-01T10:30:00Z'
        },
        {
          id: '2',
          name: 'エラー率警告',
          metric: 'error_rate',
          operator: '>',
          threshold: 5,
          enabled: true,
          notification_methods: ['email'],
          last_triggered: undefined
        },
        {
          id: '3',
          name: 'CPU使用率警告',
          metric: 'cpu_usage',
          operator: '>',
          threshold: 80,
          enabled: false,
          notification_methods: ['slack']
        }
      ]

      try {
        const response = await apiClient.request<{ alerts: AlertRule[] }>('/api/performance/alerts')
        setAlerts(response.alerts)
      } catch (error) {
        setAlerts(mockAlerts)
      }
    } catch (error) {
      console.error('Failed to load alert rules:', error)
    }
  }

  // 初回読み込み
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      await Promise.all([loadMetrics(), loadAlerts()])
      setLoading(false)
    }
    loadInitialData()
  }, [timeRange])

  // 自動更新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadMetrics()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, timeRange])

  // メトリクスの傾向を計算
  const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    const change = ((current - previous) / previous) * 100
    if (Math.abs(change) < 5) return 'stable'
    return change > 0 ? 'up' : 'down'
  }

  // ステータスを取得
  const getHealthStatus = () => {
    if (!currentMetrics) return { status: 'unknown', color: 'text-gray-400' }
    
    const { response_times, errors, resources } = currentMetrics
    
    if (
      response_times.p95 > 1000 ||
      errors.error_rate > 5 ||
      resources.cpu_usage > 80 ||
      resources.memory_usage > 85
    ) {
      return { status: 'critical', color: 'text-red-400' }
    }
    
    if (
      response_times.p95 > 500 ||
      errors.error_rate > 2 ||
      resources.cpu_usage > 60 ||
      resources.memory_usage > 70
    ) {
      return { status: 'warning', color: 'text-yellow-400' }
    }
    
    return { status: 'healthy', color: 'text-green-400' }
  }

  // メトリクスエクスポート
  const exportMetrics = async () => {
    try {
      const data = {
        timeRange,
        exported_at: new Date().toISOString(),
        current_metrics: currentMetrics,
        historical_data: metrics,
        alert_rules: alerts
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('メトリクスをエクスポートしました')
    } catch (error) {
      console.error('Failed to export metrics:', error)
      toast.error('エクスポートに失敗しました')
    }
  }

  const healthStatus = getHealthStatus()
  const previousMetrics = metrics.length > 1 ? metrics[metrics.length - 2] : null

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              パフォーマンス監視
            </h3>
            <p className="text-gray-400 mt-1">システムパフォーマンスとメトリクスを監視します</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-700 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!currentMetrics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">パフォーマンスメトリクスを読み込めませんでした</p>
        <Button
          onClick={loadMetrics}
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
            <BarChart3 className="h-6 w-6" />
            パフォーマンス監視
          </h3>
          <p className="text-gray-400 mt-1">
            システムパフォーマンスとメトリクスを監視します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-gray-700 border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {TIME_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            onClick={exportMetrics}
            variant="outline"
            size="sm"
            className="border-gray-600"
          >
            <Download className="h-4 w-4" />
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

      {/* システムヘルス概要 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              システムヘルス
            </div>
            <div className="flex items-center gap-2">
              {healthStatus.status === 'healthy' && <CheckCircle className="h-5 w-5 text-green-400" />}
              {healthStatus.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-400" />}
              {healthStatus.status === 'critical' && <AlertTriangle className="h-5 w-5 text-red-400" />}
              <span className={`font-medium ${healthStatus.color}`}>
                {healthStatus.status === 'healthy' && '正常'}
                {healthStatus.status === 'warning' && '注意'}
                {healthStatus.status === 'critical' && '重大'}
                {healthStatus.status === 'unknown' && '不明'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {currentMetrics.response_times.avg}ms
              </div>
              <div className="text-sm text-gray-400">平均応答時間</div>
              {previousMetrics && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  {calculateTrend(currentMetrics.response_times.avg, previousMetrics.response_times.avg) === 'up' && (
                    <TrendingUp className="h-3 w-3 text-red-400" />
                  )}
                  {calculateTrend(currentMetrics.response_times.avg, previousMetrics.response_times.avg) === 'down' && (
                    <TrendingDown className="h-3 w-3 text-green-400" />
                  )}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {currentMetrics.throughput.requests_per_second}
              </div>
              <div className="text-sm text-gray-400">RPS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {currentMetrics.errors.error_rate.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-400">エラー率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {currentMetrics.resources.active_connections}
              </div>
              <div className="text-sm text-gray-400">アクティブ接続</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* パフォーマンスメトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* レスポンス時間 */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4" />
              レスポンス時間
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">P50</span>
                <span className="text-white">{currentMetrics.response_times.p50}ms</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">P95</span>
                <span className="text-white">{currentMetrics.response_times.p95}ms</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">P99</span>
                <span className="text-white">{currentMetrics.response_times.p99}ms</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">最大</span>
                <span className="text-white">{currentMetrics.response_times.max}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* スループット */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" />
              スループット
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">現在RPS</span>
                <span className="text-white">{currentMetrics.throughput.requests_per_second}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">RPM</span>
                <span className="text-white">{currentMetrics.throughput.requests_per_minute}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">ピークRPS</span>
                <span className="text-white">{currentMetrics.throughput.peak_rps}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* リソース使用量 */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <Cpu className="h-4 w-4" />
              リソース
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">CPU</span>
                  <span className="text-white">{currentMetrics.resources.cpu_usage}%</span>
                </div>
                <Progress value={currentMetrics.resources.cpu_usage} className="h-1" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">メモリ</span>
                  <span className="text-white">{currentMetrics.resources.memory_usage}%</span>
                </div>
                <Progress value={currentMetrics.resources.memory_usage} className="h-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ビジネスメトリクス */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" />
              ビジネス指標
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">記事生成</span>
                <span className="text-white">{currentMetrics.business_metrics.articles_generated}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">トピック収集</span>
                <span className="text-white">{currentMetrics.business_metrics.topics_collected}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">キャッシュ率</span>
                <span className="text-white">{currentMetrics.business_metrics.cache_hit_rate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* エラー詳細 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            エラー分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {currentMetrics.errors.total_errors}
              </div>
              <div className="text-sm text-gray-400">総エラー数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {currentMetrics.errors.error_rate.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-400">エラー率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {Object.keys(currentMetrics.errors.error_types).length}
              </div>
              <div className="text-sm text-gray-400">エラータイプ</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-white font-medium">エラータイプ別</h4>
            {Object.entries(currentMetrics.errors.error_types).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-gray-400">HTTP {type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white">{count}件</span>
                  <div className="w-20 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full"
                      style={{ 
                        width: `${Math.min((count / Math.max(...Object.values(currentMetrics.errors.error_types))) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* アラートルール */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            アラートルール
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">アラートルールが設定されていません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">{alert.name}</h4>
                    <Badge className={
                      alert.enabled 
                        ? "bg-green-500/20 border-green-500/50 text-green-400"
                        : "bg-gray-500/20 border-gray-500/50 text-gray-400"
                    }>
                      {alert.enabled ? '有効' : '無効'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">
                    {alert.metric} {alert.operator} {alert.threshold}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>通知方法: {alert.notification_methods.join(', ')}</span>
                    {alert.last_triggered && (
                      <span>最終発火: {new Date(alert.last_triggered).toLocaleString('ja-JP')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}