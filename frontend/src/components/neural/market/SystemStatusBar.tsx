'use client'

import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { 
  Server, 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Wifi,
  Zap,
  HardDrive,
  ChevronDown,
  ChevronUp,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useWebSocket } from '@/hooks/useWebSocket'

interface SystemStatus {
  overall: 'healthy' | 'warning' | 'error'
  api: {
    status: 'healthy' | 'warning' | 'error'
    responseTime: number
  }
  database: {
    status: 'healthy' | 'warning' | 'error'
    connections: number
  }
  system: {
    status: 'healthy' | 'warning' | 'error'
    cpu: number
    memory: number
  }
  lastCheck: string
}

export function SystemStatusBar() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  // WebSocketからアラート情報を取得
  const { alerts, isConnected } = useWebSocket('http://localhost:3002')

  const loadSystemStatus = async () => {
    try {
      // モックデータ - 実際のAPIに置き換え予定
      const mockStatus: SystemStatus = {
        overall: Math.random() > 0.8 ? 'warning' : 'healthy',
        api: {
          status: Math.random() > 0.9 ? 'warning' : 'healthy',
          responseTime: Math.round(Math.random() * 200 + 50)
        },
        database: {
          status: Math.random() > 0.95 ? 'warning' : 'healthy',
          connections: Math.round(Math.random() * 10 + 5)
        },
        system: {
          status: Math.random() > 0.85 ? 'warning' : 'healthy',
          cpu: Math.round(Math.random() * 40 + 20),
          memory: Math.round(Math.random() * 30 + 40)
        },
        lastCheck: new Date().toISOString()
      }
      
      setStatus(mockStatus)
    } catch (error) {
      console.error('Failed to load system status:', error)
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      await loadSystemStatus()
      setLoading(false)
    }
    loadInitialData()

    // 30秒間隔で更新
    const interval = setInterval(loadSystemStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-neural-success" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-neural-warning" />
      case 'error':
        return <XCircle className="h-4 w-4 text-neural-error" />
      default:
        return <Activity className="h-4 w-4 text-neural-text-muted" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-neural-success bg-neural-success/10 border-neural-success/20'
      case 'warning':
        return 'text-neural-warning bg-neural-warning/10 border-neural-warning/20'
      case 'error':
        return 'text-neural-error bg-neural-error/10 border-neural-error/20'
      default:
        return 'text-neural-text-secondary bg-neural-surface/50 border-neural-elevated/20'
    }
  }

  const handleViewDetails = () => {
    router.push('/settings/system')
  }

  if (loading || !status) {
    return (
      <div className="flex items-center justify-between p-3 neural-neumorphic-inset rounded-lg animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-neural-surface rounded-full" />
          <div className="w-24 h-4 bg-neural-surface rounded" />
        </div>
        <div className="w-16 h-6 bg-neural-surface rounded" />
      </div>
    )
  }

  return (
    <div className="neural-card border border-neural-elevated/30">
      {/* コンパクトビュー */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {getStatusIcon(status.overall)}
            <span className="text-sm font-semibold neural-title">
              System Status
            </span>
          </div>
          
          <Badge className={cn("text-xs font-medium px-2 py-1", getStatusColor(status.overall))}>
            {status.overall.toUpperCase()}
          </Badge>
          
          {/* 主要メトリクス（デスクトップのみ） */}
          <div className="hidden md:flex items-center gap-4 text-xs text-neural-text-muted">
            <div className="flex items-center gap-1">
              <Server className="h-3 w-3" />
              <span>API: {status.api.responseTime}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              <span>DB: {status.database.connections} conns</span>
            </div>
            <div className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              <span>CPU: {status.system.cpu}%</span>
            </div>
            {/* アラート数表示 */}
            {alerts.length > 0 && (
              <div className="flex items-center gap-1">
                <Bell className={cn("h-3 w-3", alerts.some(a => a.level === 'high') ? "text-neural-error animate-pulse" : "text-neural-warning")} />
                <span className={cn(alerts.some(a => a.level === 'high') ? "text-neural-error font-semibold" : "")}>
                  {alerts.length} alerts
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-xs text-neural-text-muted">
            Last: {new Date(status.lastCheck).toLocaleTimeString('ja-JP', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
          
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0"
          >
            {isExpanded ? 
              <ChevronUp className="h-4 w-4" /> : 
              <ChevronDown className="h-4 w-4" />
            }
          </NeuralButton>
        </div>
      </div>

      {/* 展開ビュー */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-neural-elevated/20">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            {/* API Status */}
            <div className="flex items-center gap-2 p-2 neural-neumorphic-inset rounded-lg">
              <Wifi className="h-4 w-4 text-neural-cyan" />
              <div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(status.api.status)}
                  <span className="text-xs font-medium neural-title">API</span>
                </div>
                <div className="text-xs text-neural-text-muted">
                  {status.api.responseTime}ms
                </div>
              </div>
            </div>

            {/* Database Status */}
            <div className="flex items-center gap-2 p-2 neural-neumorphic-inset rounded-lg">
              <Database className="h-4 w-4 text-neural-orchid" />
              <div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(status.database.status)}
                  <span className="text-xs font-medium neural-title">DB</span>
                </div>
                <div className="text-xs text-neural-text-muted">
                  {status.database.connections} conn
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="flex items-center gap-2 p-2 neural-neumorphic-inset rounded-lg">
              <Server className="h-4 w-4 text-neural-warning" />
              <div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(status.system.status)}
                  <span className="text-xs font-medium neural-title">System</span>
                </div>
                <div className="text-xs text-neural-text-muted">
                  CPU {status.system.cpu}% / RAM {status.system.memory}%
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <NeuralButton
              variant="ghost"
              size="sm"
              onClick={handleViewDetails}
              className="text-xs"
            >
              詳細を表示
            </NeuralButton>
            <NeuralButton
              variant="ghost"
              size="sm"
              onClick={loadSystemStatus}
              className="text-xs"
            >
              更新
            </NeuralButton>
          </div>
        </div>
      )}
    </div>
  )
}