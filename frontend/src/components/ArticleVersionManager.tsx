'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  History, 
  Eye, 
  RotateCcw, 
  Clock, 
  User, 
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { DiffViewer } from './DiffViewer'
import toast from 'react-hot-toast'

interface ArticleVersion {
  id: string
  version: number
  title: string
  changes: string
  changeType: string
  createdAt: string
  author: {
    id: string
    username: string
    displayName: string
  } | null
  wordCount: number
}

interface ArticleVersionManagerProps {
  articleId: string
  onVersionRestored?: () => void
}

export function ArticleVersionManager({ articleId, onVersionRestored }: ArticleVersionManagerProps) {
  const [selectedVersionForDiff, setSelectedVersionForDiff] = useState<string | null>(null)
  const [rollbackReason, setRollbackReason] = useState('')
  const [isRollbackDialogOpen, setIsRollbackDialogOpen] = useState(false)
  const [rollbackVersionId, setRollbackVersionId] = useState<string | null>(null)

  const queryClient = useQueryClient()

  // バージョン履歴を取得
  const { data: versionsData, isLoading, error } = useQuery({
    queryKey: ['article-versions', articleId],
    queryFn: async () => {
      const response = await fetch(`/api/articles/${articleId}/versions`)
      if (!response.ok) {
        throw new Error('バージョン履歴の取得に失敗しました')
      }
      const data = await response.json()
      return data.data
    },
    staleTime: 30 * 1000, // 30秒間はキャッシュを使用
  })

  // 特定バージョンの詳細を取得
  const { data: versionDetailData } = useQuery({
    queryKey: ['article-version-detail', selectedVersionForDiff],
    queryFn: async () => {
      if (!selectedVersionForDiff) return null
      const response = await fetch(`/api/articles/${articleId}/versions/${selectedVersionForDiff}`)
      if (!response.ok) {
        throw new Error('バージョン詳細の取得に失敗しました')
      }
      const data = await response.json()
      return data.data
    },
    enabled: !!selectedVersionForDiff,
  })

  // ロールバックのミューテーション
  const rollbackMutation = useMutation({
    mutationFn: async ({ versionId, reason }: { versionId: string; reason?: string }) => {
      const response = await fetch(`/api/articles/${articleId}/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ versionId, reason }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'ロールバックに失敗しました')
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['article-versions', articleId] })
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      toast.success(data.data.message)
      setIsRollbackDialogOpen(false)
      setRollbackReason('')
      setRollbackVersionId(null)
      onVersionRestored?.()
    },
    onError: (error) => {
      toast.error(`ロールバックに失敗しました: ${error.message}`)
    },
  })

  const handleRollback = (versionId: string) => {
    setRollbackVersionId(versionId)
    setIsRollbackDialogOpen(true)
  }

  const confirmRollback = () => {
    if (rollbackVersionId) {
      rollbackMutation.mutate({
        versionId: rollbackVersionId,
        reason: rollbackReason || undefined
      })
    }
  }

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return 'bg-green-500 text-white'
      case 'edit':
        return 'bg-blue-500 text-white'
      case 'rollback':
        return 'bg-orange-500 text-white'
      case 'auto':
        return 'bg-purple-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getChangeTypeText = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return '作成'
      case 'edit':
        return '編集'
      case 'rollback':
        return 'ロールバック'
      case 'auto':
        return '自動'
      default:
        return '不明'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            バージョン履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !versionsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            バージョン履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
            <p>バージョン履歴の読み込みに失敗しました</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const versions: ArticleVersion[] = versionsData.versions || []

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            バージョン履歴
            <Badge variant="outline">{versions.length}件</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>バージョンがまだありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    index === 0 
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getChangeTypeColor(version.changeType)}>
                          v{version.version}
                        </Badge>
                        <Badge variant="outline">
                          {getChangeTypeText(version.changeType)}
                        </Badge>
                        {index === 0 && (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            最新
                          </Badge>
                        )}
                      </div>
                      
                      <h4 className="font-medium text-sm mb-1">{version.title}</h4>
                      
                      {version.changes && (
                        <p className="text-sm text-muted-foreground mb-2">{version.changes}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(version.createdAt), { 
                            addSuffix: true, 
                            locale: ja 
                          })}
                        </div>
                        
                        {version.author && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {version.author.displayName}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {version.wordCount.toLocaleString()}文字
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedVersionForDiff(version.id)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            差分
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>バージョン {version.version} の差分</DialogTitle>
                          </DialogHeader>
                          {versionDetailData && (
                            <DiffViewer
                              oldText={index < versions.length - 1 ? "" : versionDetailData.content}
                              newText={versionDetailData.content}
                              oldTitle={`バージョン ${version.version - 1}`}
                              newTitle={`バージョン ${version.version}`}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      {index > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRollback(version.id)}
                          disabled={rollbackMutation.isPending}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          復元
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ロールバック確認ダイアログ */}
      <Dialog open={isRollbackDialogOpen} onOpenChange={setIsRollbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>バージョンの復元</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              このバージョンに記事を復元しますか？この操作により、現在の内容は新しいバージョンとして保存されます。
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="rollback-reason">復元理由（オプション）</Label>
              <Textarea
                id="rollback-reason"
                placeholder="復元の理由を入力してください..."
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRollbackDialogOpen(false)}
                disabled={rollbackMutation.isPending}
              >
                キャンセル
              </Button>
              <Button
                onClick={confirmRollback}
                disabled={rollbackMutation.isPending}
              >
                {rollbackMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                復元実行
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}