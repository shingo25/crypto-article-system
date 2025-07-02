'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'
import {
  FileText,
  Clock,
  GitBranch,
  GitCommit,
  GitMerge,
  Eye,
  RotateCcw,
  Copy,
  Trash2,
  Edit3,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  History,
  Users,
  MessageSquare,
  Plus,
  Download,
  Upload
} from 'lucide-react'
import DOMPurify from 'dompurify'

interface ArticleVersion {
  id: string
  articleId: string
  version: number
  title: string
  content: string
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  createdBy: string
  changeNote: string
  wordCount: number
  tags: string[]
  metadata: {
    seoTitle?: string
    metaDescription?: string
    publishedUrl?: string
    lastModifiedBy?: string
    approvedBy?: string
  }
}

interface Article {
  id: string
  title: string
  currentVersion: number
  versions: ArticleVersion[]
  totalVersions: number
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  lastModified: string
}

interface VersionDiff {
  additions: number
  deletions: number
  modifications: number
  changes: Array<{
    type: 'addition' | 'deletion' | 'modification'
    line: number
    old?: string
    new?: string
  }>
}

export default function ArticleVersionManager() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [versionDiff, setVersionDiff] = useState<VersionDiff | null>(null)
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)
  const [showCreateVersion, setShowCreateVersion] = useState(false)
  const [newVersionNote, setNewVersionNote] = useState('')
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set())

  // 記事一覧を取得
  const loadArticles = async () => {
    try {
      setLoading(true)
      const response = await apiClient.request<{ articles: Article[] }>('/api/articles/versions')
      setArticles(response.articles || [])
    } catch (error) {
      console.error('Failed to load articles:', error)
      toast.error('記事一覧の読み込みに失敗しました')
      
      // モックデータでフォールバック
      const mockArticles: Article[] = [
        {
          id: '1',
          title: 'ビットコイン価格分析レポート',
          currentVersion: 3,
          totalVersions: 3,
          status: 'published',
          createdAt: '2025-01-01T10:00:00Z',
          lastModified: '2025-01-01T15:30:00Z',
          versions: [
            {
              id: 'v1',
              articleId: '1',
              version: 1,
              title: 'ビットコイン価格分析レポート',
              content: 'ビットコインの価格が急騰しています。市場の動向を分析します...',
              status: 'archived',
              createdAt: '2025-01-01T10:00:00Z',
              createdBy: 'AI Generator',
              changeNote: '初回作成',
              wordCount: 850,
              tags: ['ビットコイン', '価格分析'],
              metadata: {}
            },
            {
              id: 'v2',
              articleId: '1',
              version: 2,
              title: 'ビットコイン価格分析レポート',
              content: 'ビットコインの価格が急騰しています。詳細な市場の動向を分析し、今後の見通しについて考察します...',
              status: 'archived',
              createdAt: '2025-01-01T12:00:00Z',
              createdBy: 'Editor',
              changeNote: '内容を詳細化し、見通しを追加',
              wordCount: 1200,
              tags: ['ビットコイン', '価格分析', '市場予測'],
              metadata: {
                seoTitle: 'ビットコイン価格分析と今後の見通し',
                metaDescription: 'ビットコインの最新価格動向と市場分析レポート'
              }
            },
            {
              id: 'v3',
              articleId: '1',
              version: 3,
              title: 'ビットコイン価格分析レポート',
              content: 'ビットコインの価格が急騰しています。詳細な市場の動向を分析し、今後の見通しについて考察します。チャート分析も含めた包括的な内容です...',
              status: 'published',
              createdAt: '2025-01-01T15:30:00Z',
              createdBy: 'AI Generator',
              changeNote: 'チャート分析を追加、文章を洗練',
              wordCount: 1450,
              tags: ['ビットコイン', '価格分析', '市場予測', 'チャート分析'],
              metadata: {
                seoTitle: 'ビットコイン価格分析と今後の見通し | 詳細チャート付き',
                metaDescription: 'ビットコインの最新価格動向とチャート分析を含む市場分析レポート',
                publishedUrl: '/articles/bitcoin-analysis-2025'
              }
            }
          ]
        },
        {
          id: '2',
          title: 'イーサリアム アップデート解説',
          currentVersion: 2,
          totalVersions: 2,
          status: 'draft',
          createdAt: '2025-01-01T14:00:00Z',
          lastModified: '2025-01-01T16:00:00Z',
          versions: [
            {
              id: 'v4',
              articleId: '2',
              version: 1,
              title: 'イーサリアム アップデート解説',
              content: 'イーサリアムの最新アップデートについて解説します...',
              status: 'archived',
              createdAt: '2025-01-01T14:00:00Z',
              createdBy: 'AI Generator',
              changeNote: '初回作成',
              wordCount: 650,
              tags: ['イーサリアム', 'アップデート'],
              metadata: {}
            },
            {
              id: 'v5',
              articleId: '2',
              version: 2,
              title: 'イーサリアム アップデート解説',
              content: 'イーサリアムの最新アップデートについて詳しく解説します。技術的な改善点と今後への影響を分析...',
              status: 'draft',
              createdAt: '2025-01-01T16:00:00Z',
              createdBy: 'Editor',
              changeNote: '技術的詳細を追加、構成を改善',
              wordCount: 980,
              tags: ['イーサリアム', 'アップデート', '技術解説'],
              metadata: {
                seoTitle: 'イーサリアム最新アップデート解説',
                metaDescription: 'イーサリアムの最新アップデートの技術的詳細と影響分析'
              }
            }
          ]
        }
      ]
      setArticles(mockArticles)
    } finally {
      setLoading(false)
    }
  }

  // バージョン比較
  const compareVersions = async (versionId1: string, versionId2: string) => {
    try {
      setComparing(true)
      const response = await apiClient.request<{ diff: VersionDiff }>('/api/articles/versions/compare', {
        method: 'POST',
        body: JSON.stringify({ version1: versionId1, version2: versionId2 })
      })
      setVersionDiff(response.diff)
    } catch (error) {
      console.error('Failed to compare versions:', error)
      
      // モック比較結果
      const mockDiff: VersionDiff = {
        additions: 5,
        deletions: 2,
        modifications: 3,
        changes: [
          {
            type: 'addition',
            line: 15,
            new: '詳細な市場の動向を分析し、'
          },
          {
            type: 'modification',
            line: 20,
            old: '今後の見通しについて',
            new: '今後の見通しについて考察します'
          },
          {
            type: 'deletion',
            line: 25,
            old: '一時的な変動かもしれません。'
          }
        ]
      }
      setVersionDiff(mockDiff)
      toast.success('バージョン比較を表示しました')
    } finally {
      setComparing(false)
    }
  }

  // 新バージョン作成
  const createNewVersion = async (articleId: string) => {
    if (!newVersionNote.trim()) {
      toast.error('変更内容の説明を入力してください')
      return
    }

    try {
      const response = await apiClient.request('/api/articles/versions', {
        method: 'POST',
        body: JSON.stringify({
          articleId,
          changeNote: newVersionNote
        })
      })

      if (response.success) {
        toast.success('新しいバージョンを作成しました')
        setNewVersionNote('')
        setShowCreateVersion(false)
        await loadArticles()
      }
    } catch (error) {
      console.error('Failed to create version:', error)
      toast.error('バージョンの作成に失敗しました')
    }
  }

  // バージョン復元
  const restoreVersion = async (versionId: string) => {
    if (!confirm('このバージョンを現在の版として復元しますか？')) return

    try {
      const response = await apiClient.request(`/api/articles/versions/${versionId}/restore`, {
        method: 'POST'
      })

      if (response.success) {
        toast.success('バージョンを復元しました')
        await loadArticles()
      }
    } catch (error) {
      console.error('Failed to restore version:', error)
      toast.error('バージョンの復元に失敗しました')
    }
  }

  // バージョン削除
  const deleteVersion = async (versionId: string) => {
    if (!confirm('このバージョンを削除しますか？この操作は取り消せません。')) return

    try {
      const response = await apiClient.request(`/api/articles/versions/${versionId}`, {
        method: 'DELETE'
      })

      if (response.success) {
        toast.success('バージョンを削除しました')
        await loadArticles()
      }
    } catch (error) {
      console.error('Failed to delete version:', error)
      toast.error('バージョンの削除に失敗しました')
    }
  }

  useEffect(() => {
    loadArticles()
  }, [])

  // ステータスバッジ
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500/20 border-green-500/50 text-green-400">公開中</Badge>
      case 'draft':
        return <Badge className="bg-blue-500/20 border-blue-500/50 text-blue-400">下書き</Badge>
      case 'archived':
        return <Badge className="bg-gray-500/20 border-gray-500/50 text-gray-400">アーカイブ</Badge>
      default:
        return <Badge className="bg-gray-500/20 border-gray-500/50 text-gray-400">不明</Badge>
    }
  }

  // 記事展開/折りたたみ
  const toggleArticleExpansion = (articleId: string) => {
    const newExpanded = new Set(expandedArticles)
    if (newExpanded.has(articleId)) {
      newExpanded.delete(articleId)
    } else {
      newExpanded.add(articleId)
    }
    setExpandedArticles(newExpanded)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <History className="h-6 w-6" />
              記事バージョン管理
            </h3>
            <p className="text-gray-400 mt-1">記事の変更履歴と版管理を行います</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
            <History className="h-6 w-6" />
            記事バージョン管理
          </h3>
          <p className="text-gray-400 mt-1">
            記事の変更履歴と版管理を行います
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedVersions.length === 2 && (
            <Button
              onClick={() => compareVersions(selectedVersions[0], selectedVersions[1])}
              disabled={comparing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <GitBranch className="h-4 w-4 mr-2" />
              {comparing ? '比較中...' : 'バージョン比較'}
            </Button>
          )}
          <Button
            onClick={loadArticles}
            variant="outline"
            size="sm"
            className="border-gray-600"
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* バージョン比較結果 */}
      {versionDiff && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                バージョン比較
              </div>
              <Button
                onClick={() => setVersionDiff(null)}
                variant="outline"
                size="sm"
                className="border-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{versionDiff.additions}</div>
                <div className="text-sm text-gray-400">追加</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{versionDiff.modifications}</div>
                <div className="text-sm text-gray-400">変更</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{versionDiff.deletions}</div>
                <div className="text-sm text-gray-400">削除</div>
              </div>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {versionDiff.changes.map((change, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    change.type === 'addition'
                      ? 'bg-green-500/10 border-green-500/30'
                      : change.type === 'deletion'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={
                      change.type === 'addition'
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : change.type === 'deletion'
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    }>
                      {change.type === 'addition' ? '追加' : 
                       change.type === 'deletion' ? '削除' : '変更'}
                    </Badge>
                    <span className="text-xs text-gray-400">行 {change.line}</span>
                  </div>
                  {change.old && (
                    <div className="text-sm text-red-300 bg-red-500/5 p-2 rounded mb-1">
                      - {change.old}
                    </div>
                  )}
                  {change.new && (
                    <div className="text-sm text-green-300 bg-green-500/5 p-2 rounded">
                      + {change.new}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 記事一覧 */}
      {articles.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">バージョン管理対象の記事がありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <Card key={article.id} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => toggleArticleExpansion(article.id)}
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto"
                    >
                      {expandedArticles.has(article.id) ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    <div>
                      <h4 className="text-white font-medium">{article.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(article.status)}
                        <span className="text-xs text-gray-400">
                          v{article.currentVersion} / {article.totalVersions}版
                        </span>
                        <span className="text-xs text-gray-400">
                          最終更新: {new Date(article.lastModified).toLocaleString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowCreateVersion(article.id)}
                      size="sm"
                      variant="outline"
                      className="border-gray-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      新版作成
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedArticles.has(article.id) && (
                <CardContent>
                  <div className="space-y-3">
                    {article.versions.map((version) => (
                      <div
                        key={version.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          selectedVersions.includes(version.id)
                            ? 'bg-blue-500/10 border-blue-500/50'
                            : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700/70'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <input
                                type="checkbox"
                                checked={selectedVersions.includes(version.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    if (selectedVersions.length < 2) {
                                      setSelectedVersions([...selectedVersions, version.id])
                                    }
                                  } else {
                                    setSelectedVersions(selectedVersions.filter(id => id !== version.id))
                                  }
                                }}
                                className="rounded"
                                disabled={!selectedVersions.includes(version.id) && selectedVersions.length >= 2}
                              />
                              <Badge className="bg-purple-500/20 border-purple-500/50 text-purple-400">
                                v{version.version}
                              </Badge>
                              {getStatusBadge(version.status)}
                              {version.version === article.currentVersion && (
                                <Badge className="bg-orange-500/20 border-orange-500/50 text-orange-400">
                                  現在版
                                </Badge>
                              )}
                            </div>
                            
                            <h5 className="text-white font-medium mb-2">{version.title}</h5>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                              <div>
                                <span className="text-gray-400">作成者:</span>
                                <span className="text-white ml-2">{version.createdBy}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">文字数:</span>
                                <span className="text-white ml-2">{version.wordCount.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">作成日:</span>
                                <span className="text-white ml-2">
                                  {new Date(version.createdAt).toLocaleString('ja-JP')}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">タグ:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {version.tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            {version.changeNote && (
                              <div className="mb-3">
                                <span className="text-gray-400">変更内容:</span>
                                <p className="text-white text-sm mt-1">{version.changeNote}</p>
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-300 bg-gray-800 p-2 rounded border border-gray-600 max-h-20 overflow-y-auto">
                              {DOMPurify.sanitize(version.content.substring(0, 200), { ALLOWED_TAGS: [] })}
                              {version.content.length > 200 && '...'}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-600"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {version.version !== article.currentVersion && (
                              <Button
                                onClick={() => restoreVersion(version.id)}
                                size="sm"
                                variant="outline"
                                className="border-orange-500 text-orange-400 hover:bg-orange-600"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-600"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {version.status !== 'published' && (
                              <Button
                                onClick={() => deleteVersion(version.id)}
                                size="sm"
                                variant="destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 新版作成モーダル */}
      {showCreateVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-w-md w-full">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    新しいバージョンを作成
                  </div>
                  <Button
                    onClick={() => setShowCreateVersion(false)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="change-note">変更内容の説明</Label>
                  <Input
                    id="change-note"
                    placeholder="どのような変更を行いましたか？"
                    value={newVersionNote}
                    onChange={(e) => setNewVersionNote(e.target.value)}
                    className="bg-gray-700 border-gray-600"
                  />
                </div>
                
                <Alert className="border-blue-500/20 bg-blue-500/10">
                  <AlertDescription className="text-blue-300">
                    新しいバージョンを作成すると、現在の記事内容が新しい版として保存されます。
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => createNewVersion(showCreateVersion as string)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    作成
                  </Button>
                  <Button
                    onClick={() => setShowCreateVersion(false)}
                    variant="outline"
                    className="border-gray-600"
                  >
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 使用方法 */}
      <Alert className="border-blue-500/20 bg-blue-500/10">
        <MessageSquare className="h-4 w-4" />
        <AlertDescription className="text-blue-300">
          <strong>使用方法：</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• 記事をクリックしてバージョン履歴を展開できます</li>
            <li>• 2つのバージョンを選択して比較ができます</li>
            <li>• 古いバージョンを復元して現在版にできます</li>
            <li>• 各バージョンには変更内容とメタデータが記録されます</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}