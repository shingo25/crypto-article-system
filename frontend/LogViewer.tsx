'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api'
import { createComponentLogger } from '@/lib/simple-logger'
import toast from 'react-hot-toast'

const componentLogger = createComponentLogger('LogViewer')
import {
  FileText,
  Filter,
  RefreshCw,
  Download,
  Eye,
  AlertTriangle,
  Info,
  AlertCircle,
  XCircle,
  Clock,
  Search,
  Trash2,
  Settings,
  Monitor,
  Activity
} from 'lucide-react'

interface LogEntry {
  id: string
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  module: string
  message: string
  details?: any
  userId?: string
  ipAddress?: string
  userAgent?: string
}

interface LogFilter {
  level: string
  module: string
  search: string
  startDate: string
  endDate: string
  limit: number
}

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [filter, setFilter] = useState<LogFilter>({
    level: '',
    module: '',
    search: '',
    startDate: '',
    endDate: '',
    limit: 100
  })

  // ログを取得
  const loadLogs = async () => {
    const startTime = Date.now()
    try {
      setLoading(true)
      componentLogger.info('ログ読み込みを開始')
      
      const params = new URLSearchParams()
      
      if (filter.level) params.append('level', filter.level.toLowerCase())
      if (filter.module) params.append('component', filter.module)
      if (filter.search) params.append('search', filter.search)
      if (filter.startDate) params.append('since', filter.startDate)
      if (filter.limit) params.append('limit', filter.limit.toString())

      const response = await fetch(`/api/logs/export?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.logs || [])
        componentLogger.performance('ログ読み込み', Date.now() - startTime, {
          logCount: data.logs?.length || 0,
          filters: filter
        })
      } else {
        componentLogger.error('ログAPI呼び出しに失敗', new Error(data.error))
        toast.error('ログの読み込みに失敗しました')
      }
    } catch (error) {
      componentLogger.error('ログ読み込みエラー', error as Error, {
        duration: Date.now() - startTime,
        filters: filter
      })
      toast.error('ログの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 自動更新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 5000) // 5秒間隔
      return () => clearInterval(interval)
    }
  }, [autoRefresh, filter])

  // 初回読み込み
  useEffect(() => {
    loadLogs()
  }, [])

  // ログレベルのアイコンと色
  const getLevelInfo = (level: string) => {
    switch (level) {
      case 'DEBUG':
        return { icon: <Settings className="h-4 w-4" />, color: 'bg-gray-500/20 border-gray-500/50 text-gray-400' }
      case 'INFO':
        return { icon: <Info className="h-4 w-4" />, color: 'bg-blue-500/20 border-blue-500/50 text-blue-400' }
      case 'WARNING':
        return { icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' }
      case 'ERROR':
        return { icon: <AlertCircle className="h-4 w-4" />, color: 'bg-orange-500/20 border-orange-500/50 text-orange-400' }
      case 'CRITICAL':
        return { icon: <XCircle className="h-4 w-4" />, color: 'bg-red-500/20 border-red-500/50 text-red-400' }
      default:
        return { icon: <Info className="h-4 w-4" />, color: 'bg-gray-500/20 border-gray-500/50 text-gray-400' }
    }
  }

  // ログのエクスポート
  const exportLogs = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.level) params.append('level', filter.level)
      if (filter.module) params.append('module', filter.module)
      if (filter.search) params.append('search', filter.search)
      if (filter.startDate) params.append('since', filter.startDate)
      params.append('format', 'json')
      params.append('limit', '1000')

      const response = await fetch(`/api/logs/export?${params.toString()}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `logs-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('ログをエクスポートしました')
    } catch (error) {
      console.error('Failed to export logs:', error)
      toast.error('ログのエクスポートに失敗しました')
    }
  }

  // ログのクリア（危険な操作）
  const clearLogs = async () => {
    if (!confirm('すべてのログを削除しますか？この操作は取り消せません。')) return

    try {
      const response = await apiClient.request('/api/logs', {
        method: 'DELETE'
      })
      
      if (response.success) {
        toast.success('ログを削除しました')
        await loadLogs()
      } else {
        toast.error('ログの削除に失敗しました')
      }
    } catch (error) {
      console.error('Failed to clear logs:', error)
      toast.error('ログの削除に失敗しました')
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6" />
            システムログビューア
          </h3>
          <p className="text-gray-400 mt-1">
            アプリケーションのログを監視・分析します
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={exportLogs}
            variant="outline"
            size="sm"
            className="border-gray-600"
          >
            <Download className="h-4 w-4 mr-2" />
            エクスポート
          </Button>
          <Button
            onClick={clearLogs}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            クリア
          </Button>
        </div>
      </div>

      {/* フィルター */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="h-5 w-5" />
            フィルター
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level-filter">ログレベル</Label>
              <select
                id="level-filter"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                value={filter.level}
                onChange={(e) => setFilter({ ...filter, level: e.target.value })}
              >
                <option value="">全て</option>
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="module-filter">モジュール</Label>
              <select
                id="module-filter"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                value={filter.module}
                onChange={(e) => setFilter({ ...filter, module: e.target.value })}
              >
                <option value="">全て</option>
                <option value="api_server">API Server</option>
                <option value="article_generator">Article Generator</option>
                <option value="topic_collector">Topic Collector</option>
                <option value="fact_checker">Fact Checker</option>
                <option value="wordpress_publisher">WordPress Publisher</option>
                <option value="scheduler">Scheduler</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="search-filter">検索</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search-filter"
                  placeholder="メッセージを検索..."
                  value={filter.search}
                  onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                  className="pl-10 bg-gray-700 border-gray-600"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="limit-filter">表示件数</Label>
              <select
                id="limit-filter"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                value={filter.limit}
                onChange={(e) => setFilter({ ...filter, limit: parseInt(e.target.value) })}
              >
                <option value={50}>50件</option>
                <option value={100}>100件</option>
                <option value={500}>500件</option>
                <option value={1000}>1000件</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={loadLogs}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              フィルター適用
            </Button>
            <Button
              onClick={() => setFilter({
                level: '',
                module: '',
                search: '',
                startDate: '',
                endDate: '',
                limit: 100
              })}
              variant="outline"
              className="border-gray-600"
            >
              リセット
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ログ一覧 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">ログエントリ ({logs.length}件)</CardTitle>
            <Button
              onClick={loadLogs}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-gray-600"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              更新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && logs.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">ログが見つかりません</p>
              <p className="text-gray-500 text-sm">フィルター条件を調整してください</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {logs.map((log) => {
                const levelInfo = getLevelInfo(log.level)
                return (
                  <div
                    key={log.id}
                    className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700/70 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={levelInfo.color}>
                            {levelInfo.icon}
                            {log.level}
                          </Badge>
                          <Badge className="bg-purple-500/20 border-purple-500/50 text-purple-400">
                            {log.module}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {new Date(log.timestamp).toLocaleString('ja-JP')}
                          </div>
                        </div>
                        
                        <p className="text-white mb-2 leading-relaxed">
                          {log.message}
                        </p>
                        
                        {log.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-blue-400 hover:text-blue-300 text-sm">
                              詳細を表示
                            </summary>
                            <pre className="mt-2 p-3 bg-gray-800 border border-gray-600 rounded text-xs text-gray-300 overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                        
                        {(log.userId || log.ipAddress) && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            {log.userId && (
                              <span>ユーザー: {log.userId}</span>
                            )}
                            {log.ipAddress && (
                              <span>IP: {log.ipAddress}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}