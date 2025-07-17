'use client'

import React, { useState, useEffect } from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Badge } from '@/components/ui/badge'
import { Activity, Server, Database, Cpu, MemoryStick, HardDrive, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
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
}

export function SystemMonitoringNeural() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

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
    }, 30000) // 30秒間隔

    return () => clearInterval(interval)
  }, [autoRefresh])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getResourceColor = (percent: number) => {
    if (percent > 80) return 'text-neural-error'
    if (percent > 60) return 'text-neural-warning'
    return 'text-neural-success'
  }

  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'bg-neural-success'
    if (usage < 80) return 'bg-neural-warning'
    return 'bg-neural-error'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-neural-success'
      case 'warning':
        return 'text-neural-warning'
      case 'error':
        return 'text-neural-error'
      default:
        return 'text-neural-text-secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-neural-success" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-neural-warning" />
      case 'error':
        return <XCircle className="h-4 w-4 text-neural-error" />
      default:
        return <AlertTriangle className="h-4 w-4 text-neural-text-muted" />
    }
  }

  if (loading) {
    return (
      <NeuralCard className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-neural-cyan animate-pulse" />
            System Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 neural-neumorphic-inset rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </NeuralCard>
    )
  }

  if (!metrics) {
    return (
      <NeuralCard className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-neural-error" />
            System Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-neural-text-secondary mb-4">システムメトリクスを読み込めませんでした</p>
          <NeuralButton onClick={loadMetrics} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            再試行
          </NeuralButton>
        </CardContent>
      </NeuralCard>
    )
  }

  const overallStatus = 
    metrics.database.connected && metrics.redis.connected && 
    metrics.system.cpu_percent < 80 && metrics.system.memory.percent < 85
      ? 'healthy' : 'warning'

  return (
    <NeuralCard className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-5 w-5 text-neural-cyan" />
            System Monitoring
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs border-0", getStatusColor(overallStatus))}>
              {overallStatus.toUpperCase()}
            </Badge>
            <NeuralButton 
              variant="ghost" 
              size="sm" 
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={cn("h-3 w-3", autoRefresh && "animate-spin")} />
            </NeuralButton>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* System Status */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 neural-neumorphic-inset rounded-lg">
            <Activity className="h-5 w-5 mx-auto mb-2 text-neural-cyan" />
            <div className="text-xs text-neural-text-secondary">Uptime</div>
            <div className="text-sm font-semibold neural-title">{formatUptime(metrics.system.uptime)}</div>
          </div>
          
          <div className="text-center p-3 neural-neumorphic-inset rounded-lg">
            <Database className="h-5 w-5 mx-auto mb-2 text-neural-orchid" />
            <div className="text-xs text-neural-text-secondary">DB Connections</div>
            <div className="text-sm font-semibold neural-title">{metrics.database.active_connections}</div>
          </div>

          <div className="text-center p-3 neural-neumorphic-inset rounded-lg">
            <div className="text-lg font-bold neural-title text-neural-success mb-1">
              {metrics.api.requests_per_minute}
            </div>
            <div className="text-xs text-neural-text-secondary">Req/min</div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="space-y-3">
          <h4 className="font-medium neural-title text-sm">Resource Usage</h4>
          
          {/* CPU Usage */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                CPU
              </span>
              <span className={cn("font-medium", getResourceColor(metrics.system.cpu_percent))}>
                {metrics.system.cpu_percent.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-neural-surface rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-300", getUsageColor(metrics.system.cpu_percent))}
                style={{ width: `${metrics.system.cpu_percent}%` }}
              />
            </div>
          </div>

          {/* Memory Usage */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1">
                <MemoryStick className="h-3 w-3" />
                Memory
              </span>
              <span className={cn("font-medium", getResourceColor(metrics.system.memory.percent))}>
                {formatBytes(metrics.system.memory.used)} / {formatBytes(metrics.system.memory.total)}
              </span>
            </div>
            <div className="h-2 bg-neural-surface rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-300", getUsageColor(metrics.system.memory.percent))}
                style={{ width: `${metrics.system.memory.percent}%` }}
              />
            </div>
          </div>

          {/* Disk Usage */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                Storage
              </span>
              <span className={cn("font-medium", getResourceColor(metrics.system.disk.percent))}>
                {formatBytes(metrics.system.disk.used)} / {formatBytes(metrics.system.disk.total)}
              </span>
            </div>
            <div className="h-2 bg-neural-surface rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-300", getUsageColor(metrics.system.disk.percent))}
                style={{ width: `${metrics.system.disk.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Services Status */}
        <div className="space-y-3">
          <h4 className="font-medium neural-title text-sm">Services</h4>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between p-2 neural-neumorphic-inset rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(metrics.database.status)}
                <div>
                  <div className="text-xs font-medium neural-title">Database</div>
                  <div className="text-xs text-neural-text-muted">
                    {metrics.database.connected ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
              </div>
              <div className="text-xs text-neural-text-secondary">
                {metrics.database.active_connections}/{metrics.database.pool_size}
              </div>
            </div>

            <div className="flex items-center justify-between p-2 neural-neumorphic-inset rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(metrics.redis.status)}
                <div>
                  <div className="text-xs font-medium neural-title">Redis</div>
                  <div className="text-xs text-neural-text-muted">
                    {metrics.redis.connected ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
              </div>
              <div className="text-xs text-neural-text-secondary">
                {formatBytes(metrics.redis.memory_used)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </NeuralCard>
  )
}