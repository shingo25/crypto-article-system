'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createComponentLogger } from '@/lib/simple-logger'
import { WorkflowType, WorkflowStatus, ApprovalAction } from '@/lib/workflow'
import toast from 'react-hot-toast'
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  MessageSquare,
  Send,
  FileText,
  Users,
  BarChart3,
  Filter,
  RefreshCw,
  Plus,
  Settings
} from 'lucide-react'

const componentLogger = createComponentLogger('WorkflowDashboard')

interface WorkflowInstance {
  id: string
  type: WorkflowType
  status: WorkflowStatus
  resourceType: string
  resourceId: string
  submittedBy: string
  submittedAt: string
  currentStep?: string
  completedAt?: string
  metadata: {
    title: string
    priority: 'low' | 'medium' | 'high'
  }
}

interface WorkflowStats {
  total: number
  pending: number
  approved: number
  rejected: number
  byType: Record<WorkflowType, number>
  avgApprovalTime: number
}

export default function WorkflowDashboard() {
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([])
  const [stats, setStats] = useState<WorkflowStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInstance | null>(null)
  const [currentUserId] = useState('current_user_id') // 実際の実装では認証から取得
  
  // フィルタ状態
  const [filters, setFilters] = useState({
    status: '' as WorkflowStatus | '',
    type: '' as WorkflowType | '',
    submittedBy: '',
    page: 1,
    limit: 20
  })

  // ワークフロー一覧を取得
  const loadWorkflows = useCallback(async () => {
    setLoading(true)
    try {
      componentLogger.info('ワークフロー一覧を取得中', { filters })
      
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.type) params.append('type', filters.type)
      if (filters.submittedBy) params.append('submittedBy', filters.submittedBy)
      params.append('page', filters.page.toString())
      params.append('limit', filters.limit.toString())

      const response = await fetch(`/api/workflow?${params}`)
      const data = await response.json()

      if (data.success) {
        setWorkflows(data.data)
        componentLogger.performance('ワークフロー一覧取得', Date.now() - Date.now(), {
          count: data.data.length
        })
      } else {
        toast.error('ワークフローの取得に失敗しました')
      }
    } catch (error) {
      componentLogger.error('ワークフロー取得エラー', error as Error)
      toast.error('ワークフローの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [filters])

  // 統計情報を取得
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/workflow/stats?timeRange=7d')
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      componentLogger.error('統計情報取得エラー', error as Error)
    }
  }, [])

  // 承認/却下アクション
  const processApproval = async (
    workflowInstanceId: string,
    action: ApprovalAction,
    comment?: string
  ) => {
    try {
      componentLogger.info('承認アクションを実行', {
        workflowInstanceId,
        action,
        approverId: currentUserId
      })

      const response = await fetch('/api/workflow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowInstanceId,
          approverId: currentUserId,
          action,
          comment
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('承認処理が完了しました')
        await loadWorkflows()
        await loadStats()
      } else {
        toast.error(data.error || '承認処理に失敗しました')
      }
    } catch (error) {
      componentLogger.error('承認処理エラー', error as Error)
      toast.error('承認処理に失敗しました')
    }
  }

  // ワークフロー開始
  const startWorkflow = async (
    type: WorkflowType,
    resourceType: string,
    resourceId: string,
    resourceData: any
  ) => {
    try {
      componentLogger.info('ワークフローを開始', {
        type,
        resourceType,
        resourceId
      })

      const response = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          resourceType,
          resourceId,
          resourceData,
          submittedBy: currentUserId
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('ワークフローを開始しました')
        await loadWorkflows()
        await loadStats()
      } else {
        toast.error(data.error || 'ワークフローの開始に失敗しました')
      }
    } catch (error) {
      componentLogger.error('ワークフロー開始エラー', error as Error)
      toast.error('ワークフローの開始に失敗しました')
    }
  }

  // 初期読み込み
  useEffect(() => {
    loadWorkflows()
    loadStats()
  }, [loadWorkflows, loadStats])

  // ステータスバッジ
  const getStatusBadge = (status: WorkflowStatus) => {
    switch (status) {
      case WorkflowStatus.PENDING:
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />待機中</Badge>
      case WorkflowStatus.IN_REVIEW:
        return <Badge className="bg-blue-500"><Eye className="h-3 w-3 mr-1" />審査中</Badge>
      case WorkflowStatus.APPROVED:
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />承認済み</Badge>
      case WorkflowStatus.REJECTED:
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />却下</Badge>
      case WorkflowStatus.CANCELLED:
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />キャンセル</Badge>
      case WorkflowStatus.EXPIRED:
        return <Badge className="bg-gray-500"><AlertTriangle className="h-3 w-3 mr-1" />期限切れ</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // 優先度バッジ
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800 border-red-200">高</Badge>
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">中</Badge>
      case 'low':
        return <Badge className="bg-green-100 text-green-800 border-green-200">低</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  // ワークフロータイプの表示名
  const getWorkflowTypeName = (type: WorkflowType) => {
    const typeNames: Record<WorkflowType, string> = {
      [WorkflowType.ARTICLE_APPROVAL]: '記事承認',
      [WorkflowType.TOPIC_APPROVAL]: 'トピック承認',
      [WorkflowType.TEMPLATE_APPROVAL]: 'テンプレート承認',
      [WorkflowType.SYSTEM_SETTING_APPROVAL]: 'システム設定承認',
      [WorkflowType.USER_REGISTRATION_APPROVAL]: 'ユーザー登録承認'
    }
    return typeNames[type] || type
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6" />
            承認ワークフロー管理
          </h3>
          <p className="text-gray-400 mt-1">
            コンテンツの承認フローを管理・監視します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadWorkflows}
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

      {/* 統計情報 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-900 border-blue-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.pending.toLocaleString()}
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
                    {stats.approved.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-200">承認済み</div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-900 border-red-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.rejected.toLocaleString()}
                  </div>
                  <div className="text-sm text-red-200">却下</div>
                </div>
                <XCircle className="h-8 w-8 text-red-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-900 border-purple-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.avgApprovalTime.toFixed(1)}h
                  </div>
                  <div className="text-sm text-purple-200">平均承認時間</div>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-600">
          <TabsTrigger 
            value="pending"
            className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
          >
            ⏳ 承認待ち
          </TabsTrigger>
          <TabsTrigger 
            value="all"
            className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
          >
            📋 全て
          </TabsTrigger>
          <TabsTrigger 
            value="stats"
            className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
          >
            📊 統計
          </TabsTrigger>
          <TabsTrigger 
            value="create"
            className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
          >
            ➕ 新規作成
          </TabsTrigger>
        </TabsList>

        {/* 承認待ちタブ */}
        <TabsContent value="pending" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">🔍 フィルタ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">ワークフロータイプ</Label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as WorkflowType }))}
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                  >
                    <option value="">すべて</option>
                    {Object.values(WorkflowType).map(type => (
                      <option key={type} value={type}>{getWorkflowTypeName(type)}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label className="text-slate-300">ステータス</Label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as WorkflowStatus }))}
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                  >
                    <option value="">すべて</option>
                    <option value={WorkflowStatus.PENDING}>待機中</option>
                    <option value={WorkflowStatus.IN_REVIEW}>審査中</option>
                    <option value={WorkflowStatus.APPROVED}>承認済み</option>
                    <option value={WorkflowStatus.REJECTED}>却下</option>
                  </select>
                </div>
                
                <div>
                  <Label className="text-slate-300">申請者</Label>
                  <Input
                    placeholder="ユーザーID"
                    value={filters.submittedBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, submittedBy: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ワークフロー一覧 */}
          <div className="grid grid-cols-1 gap-4">
            {workflows.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">ワークフローが見つかりません</p>
                </CardContent>
              </Card>
            ) : (
              workflows.map((workflow) => (
                <Card key={workflow.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-white font-semibold">
                            {workflow.metadata.title}
                          </h4>
                          {getStatusBadge(workflow.status)}
                          {getPriorityBadge(workflow.metadata.priority)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span>{getWorkflowTypeName(workflow.type)}</span>
                          <span>申請者: {workflow.submittedBy}</span>
                          <span>{new Date(workflow.submittedAt).toLocaleString('ja-JP')}</span>
                        </div>
                        
                        {workflow.currentStep && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-slate-300 border-slate-500">
                              現在のステップ: {workflow.currentStep}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => setSelectedWorkflow(workflow)}
                          variant="outline"
                          size="sm"
                          className="border-slate-600"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {workflow.status === WorkflowStatus.PENDING && (
                          <>
                            <Button
                              onClick={() => processApproval(workflow.id, ApprovalAction.APPROVE)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              承認
                            </Button>
                            <Button
                              onClick={() => processApproval(workflow.id, ApprovalAction.REJECT, '要修正')}
                              variant="destructive"
                              size="sm"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              却下
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* 全ワークフロータブ */}
        <TabsContent value="all" className="space-y-4">
          <div className="text-slate-400">
            全てのワークフローを表示します。フィルタを使用して検索できます。
          </div>
          {/* 上と同様のワークフロー一覧表示 */}
        </TabsContent>

        {/* 統計タブ */}
        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">📊 タイプ別統計</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-slate-300">{getWorkflowTypeName(type as WorkflowType)}</span>
                        <Badge variant="outline" className="text-slate-300 border-slate-500">
                          {count.toLocaleString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">⏱️ パフォーマンス指標</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-slate-300">平均承認時間:</span>
                      <span className="text-white font-semibold">{stats.avgApprovalTime.toFixed(1)}時間</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">承認率:</span>
                      <span className="text-white font-semibold">
                        {((stats.approved / (stats.approved + stats.rejected)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">処理済み:</span>
                      <span className="text-white font-semibold">
                        {(stats.approved + stats.rejected).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* 新規作成タブ */}
        <TabsContent value="create" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">🆕 クイック承認申請</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => startWorkflow(
                    WorkflowType.ARTICLE_APPROVAL,
                    'article',
                    'sample_article_' + Date.now(),
                    {
                      title: 'テスト記事承認',
                      word_count: 800,
                      category: 'news'
                    }
                  )}
                  className="bg-blue-600 hover:bg-blue-700 h-16"
                >
                  <div className="text-center">
                    <FileText className="h-6 w-6 mx-auto mb-1" />
                    <div>記事承認申請</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => startWorkflow(
                    WorkflowType.TOPIC_APPROVAL,
                    'topic',
                    'sample_topic_' + Date.now(),
                    {
                      title: 'テストトピック承認',
                      priority: 'medium'
                    }
                  )}
                  className="bg-green-600 hover:bg-green-700 h-16"
                >
                  <div className="text-center">
                    <MessageSquare className="h-6 w-6 mx-auto mb-1" />
                    <div>トピック承認申請</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}