'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createComponentLogger } from '@/lib/simple-logger'
import toast from 'react-hot-toast'
import {
  Play,
  Pause,
  RotateCcw,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Activity,
  Settings,
  Plus
} from 'lucide-react'

const componentLogger = createComponentLogger('QueueDashboard')

interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
  error?: string
}

interface QueueSummary {
  totalWaiting: number
  totalActive: number
  totalCompleted: number
  totalFailed: number
}

interface JobStatus {
  id: string
  name: string
  data: any
  progress: number
  state: string
  timestamp: number
  processedOn?: number
  finishedOn?: number
  failedReason?: string
  returnvalue?: any
}

export default function QueueDashboard() {
  const [queues, setQueues] = useState<Record<string, QueueStats>>({})
  const [summary, setSummary] = useState<QueueSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedQueue, setSelectedQueue] = useState<string>('')
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(5)

  // キュー統計を取得
  const loadQueueStats = useCallback(async () => {
    try {
      setLoading(true)
      componentLogger.info('キュー統計を取得中')
      
      const response = await fetch('/api/queue')
      const data = await response.json()
      
      if (data.success) {
        setQueues(data.queues)
        setSummary(data.summary)
        componentLogger.performance('キュー統計取得', Date.now() - Date.now(), {
          queueCount: Object.keys(data.queues).length
        })
      } else {
        componentLogger.error('キュー統計取得APIエラー', new Error(data.error))
        toast.error('キュー統計の取得に失敗しました')
      }
    } catch (error) {
      componentLogger.error('キュー統計取得エラー', error as Error)
      toast.error('キュー統計の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  // ジョブステータスを取得
  const getJobStatus = async (queueName: string, jobId: string) => {
    try {
      const response = await fetch('/api/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_job_status',
          queueName,
          jobId
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setJobStatus(data.job)
      } else {
        toast.error('ジョブが見つかりません')
      }
    } catch (error) {
      componentLogger.error('ジョブステータス取得エラー', error as Error)
      toast.error('ジョブステータスの取得に失敗しました')
    }
  }

  // キュー操作
  const executeQueueAction = async (action: string, queueName: string, jobId?: string) => {
    try {
      componentLogger.info('キュー操作を実行', { action, queueName, jobId })
      
      const response = await fetch('/api/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          queueName,
          jobId
        })
      })
      
      const data = await response.json()
      if (data.success) {
        toast.success(data.message || '操作が完了しました')
        await loadQueueStats()
      } else {
        toast.error(data.error || '操作に失敗しました')
      }
    } catch (error) {
      componentLogger.error('キュー操作エラー', error as Error, { action, queueName })
      toast.error('操作に失敗しました')
    }
  }

  // ジョブを追加
  const addJob = async (queueName: string, jobType: string, data: any, options?: any) => {
    try {
      componentLogger.info('ジョブを追加', { queueName, jobType })
      
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueName,
          jobType,
          data,
          options
        })
      })
      
      const result = await response.json()
      if (result.success) {
        toast.success(`ジョブ ${result.job.id} を追加しました`)
        await loadQueueStats()
      } else {
        toast.error('ジョブの追加に失敗しました')
      }
    } catch (error) {
      componentLogger.error('ジョブ追加エラー', error as Error)
      toast.error('ジョブの追加に失敗しました')
    }
  }

  // 自動更新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadQueueStats, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, loadQueueStats])

  // 初期読み込み
  useEffect(() => {
    loadQueueStats()
  }, [loadQueueStats])

  // ステータスバッジ
  const getStatusBadge = (stats: QueueStats) => {
    if (stats.error) {
      return <Badge variant="destructive">エラー</Badge>
    }
    if (stats.paused) {
      return <Badge variant="secondary">一時停止</Badge>
    }
    if (stats.active > 0) {
      return <Badge className="bg-green-500">実行中</Badge>
    }
    if (stats.waiting > 0) {
      return <Badge className="bg-blue-500">待機中</Badge>
    }
    return <Badge variant="outline">アイドル</Badge>
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6" />
            キュー管理ダッシュボード
          </h3>
          <p className="text-gray-400 mt-1">
            バックグラウンドジョブの監視と管理
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
            onClick={loadQueueStats}
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
      </div>

      {/* サマリー */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-900 border-blue-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {summary.totalWaiting.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-200">待機中</div>
                </div>
                <Clock className="h-8 w-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-900 border-green-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {summary.totalActive.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-200">実行中</div>
                </div>
                <Zap className="h-8 w-8 text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-900 border-purple-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {summary.totalCompleted.toLocaleString()}
                  </div>
                  <div className="text-sm text-purple-200">完了</div>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-900 border-red-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {summary.totalFailed.toLocaleString()}
                  </div>
                  <div className="text-sm text-red-200">失敗</div>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-600">
          <TabsTrigger 
            value="overview"
            className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
          >
            📊 概要
          </TabsTrigger>
          <TabsTrigger 
            value="management"
            className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
          >
            ⚙️ 管理
          </TabsTrigger>
          <TabsTrigger 
            value="add-job"
            className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
          >
            ➕ ジョブ追加
          </TabsTrigger>
        </TabsList>

        {/* 概要タブ */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(queues).map(([queueName, stats]) => (
              <Card key={queueName} className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white capitalize">
                      {queueName.replace('-', ' ')}
                    </CardTitle>
                    {getStatusBadge(stats)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.error ? (
                    <Alert className="border-red-500 bg-red-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-red-700">
                        {stats.error}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">待機中:</span>
                          <span className="text-blue-400 font-semibold">{stats.waiting}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">実行中:</span>
                          <span className="text-green-400 font-semibold">{stats.active}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">遅延:</span>
                          <span className="text-yellow-400 font-semibold">{stats.delayed}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">完了:</span>
                          <span className="text-purple-400 font-semibold">{stats.completed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">失敗:</span>
                          <span className="text-red-400 font-semibold">{stats.failed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">状態:</span>
                          <span className={stats.paused ? "text-orange-400" : "text-green-400"}>
                            {stats.paused ? "一時停止" : "実行中"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* アクションボタン */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => executeQueueAction(stats.paused ? 'resume_queue' : 'pause_queue', queueName)}
                      variant="outline"
                      size="sm"
                      className="border-slate-600"
                    >
                      {stats.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={() => executeQueueAction('retry_failed', queueName)}
                      variant="outline"
                      size="sm"
                      className="border-slate-600"
                      disabled={stats.failed === 0}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => executeQueueAction('clean_completed', queueName)}
                      variant="outline"
                      size="sm"
                      className="border-slate-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 管理タブ */}
        <TabsContent value="management" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">キュー管理操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-slate-300">キュー選択:</label>
                  <select
                    value={selectedQueue}
                    onChange={(e) => setSelectedQueue(e.target.value)}
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                  >
                    <option value="">キューを選択...</option>
                    {Object.keys(queues).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedQueue && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => executeQueueAction('pause_queue', selectedQueue)}
                    variant="outline"
                    size="sm"
                    className="border-slate-600"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    一時停止
                  </Button>
                  <Button
                    onClick={() => executeQueueAction('resume_queue', selectedQueue)}
                    variant="outline"
                    size="sm"
                    className="border-slate-600"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    再開
                  </Button>
                  <Button
                    onClick={() => executeQueueAction('clean_completed', selectedQueue)}
                    variant="outline"
                    size="sm"
                    className="border-slate-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    完了ジョブ削除
                  </Button>
                  <Button
                    onClick={() => executeQueueAction('clean_failed', selectedQueue)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    失敗ジョブ削除
                  </Button>
                  <Button
                    onClick={() => executeQueueAction('retry_failed', selectedQueue)}
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-400"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    失敗ジョブ再試行
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ジョブ状態確認 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">ジョブ状態確認</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="ジョブID"
                  className="p-2 bg-slate-700 border border-slate-600 rounded text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && selectedQueue) {
                      getJobStatus(selectedQueue, e.currentTarget.value)
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="ジョブID"]') as HTMLInputElement
                    if (input?.value && selectedQueue) {
                      getJobStatus(selectedQueue, input.value)
                    }
                  }}
                  disabled={!selectedQueue}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  状態確認
                </Button>
              </div>

              {jobStatus && (
                <div className="bg-slate-900 p-4 rounded border border-slate-600">
                  <h4 className="text-white font-semibold mb-2">ジョブ: {jobStatus.id}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">名前:</span>
                      <span className="text-white">{jobStatus.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">状態:</span>
                      <Badge className={
                        jobStatus.state === 'completed' ? 'bg-green-500' :
                        jobStatus.state === 'failed' ? 'bg-red-500' :
                        jobStatus.state === 'active' ? 'bg-blue-500' : 'bg-gray-500'
                      }>
                        {jobStatus.state}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">進捗:</span>
                      <div className="flex items-center gap-2 flex-1 ml-4">
                        <Progress value={jobStatus.progress} className="flex-1" />
                        <span className="text-white text-xs">{jobStatus.progress}%</span>
                      </div>
                    </div>
                    {jobStatus.failedReason && (
                      <div>
                        <span className="text-slate-400">エラー:</span>
                        <pre className="text-red-300 text-xs mt-1 p-2 bg-red-900/20 rounded">
                          {jobStatus.failedReason}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ジョブ追加タブ */}
        <TabsContent value="add-job" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">クイックジョブ追加</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => addJob('topic-collection', 'collect_topics', {
                    sources: ['coindesk', 'cointelegraph'],
                    limit: 20,
                    keywords: ['bitcoin', 'ethereum', 'crypto']
                  })}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  トピック収集
                </Button>
                
                <Button
                  onClick={() => addJob('article-generation', 'generate_article', {
                    topicId: 'sample-topic-' + Date.now(),
                    options: {
                      wordCount: 800,
                      depth: 'medium'
                    }
                  })}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  記事生成
                </Button>
                
                <Button
                  onClick={() => addJob('price-updates', 'update_prices', {
                    symbols: ['BTC', 'ETH', 'ADA', 'SOL'],
                    force: false
                  })}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  価格更新
                </Button>
                
                <Button
                  onClick={() => addJob('file-cleanup', 'cleanup_files', {
                    directory: '/tmp',
                    olderThan: '24h',
                    pattern: '*.log'
                  })}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  ファイル清理
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 自動更新設定 */}
      {autoRefresh && (
        <Card className="bg-green-900/20 border-green-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-400" />
                <span className="text-green-400">自動更新中 ({refreshInterval}秒間隔)</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-green-400 text-sm">間隔:</label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                  className="p-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                >
                  <option value={5}>5秒</option>
                  <option value={10}>10秒</option>
                  <option value={30}>30秒</option>
                  <option value={60}>1分</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}