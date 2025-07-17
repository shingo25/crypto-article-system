'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Edit, Trash2, Search, Filter } from "lucide-react"

interface Topic {
  id: string
  title: string
  priority: string
  score: number
  coins: string[]
  collectedAt: string
  source?: string
  sourceUrl?: string
}

interface TopicManagementProps {
  topics: Topic[]
  onUpdateTopic: (topicId: string, updates: Partial<Topic>) => Promise<void>
  onDeleteTopic: (topicId: string) => Promise<void>
  onRefreshTopics: () => Promise<void>
}

export default function TopicManagement({ 
  topics, 
  onUpdateTopic, 
  onDeleteTopic,
  onRefreshTopics 
}: TopicManagementProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [filterSource, setFilterSource] = useState<string>('')
  const [editingTopic, setEditingTopic] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Topic>>({})
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // フィルタリング
  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.coins.some(coin => coin.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesPriority = !filterPriority || topic.priority === filterPriority
    const matchesSource = !filterSource || topic.source === filterSource
    
    return matchesSearch && matchesPriority && matchesSource
  })

  const handleEditStart = (topic: Topic) => {
    setEditingTopic(topic.id)
    setEditForm({
      title: topic.title,
      priority: topic.priority,
      score: topic.score
    })
    setError(null)
  }

  const handleEditSave = async () => {
    if (!editingTopic) return

    try {
      await onUpdateTopic(editingTopic, editForm)
      setEditingTopic(null)
      setEditForm({})
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'トピックの更新に失敗しました')
    }
  }

  const handleEditCancel = () => {
    setEditingTopic(null)
    setEditForm({})
    setError(null)
  }

  const handleDelete = async (topicId: string) => {
    if (!confirm('このトピックを削除してもよろしいですか？')) return

    try {
      await onDeleteTopic(topicId)
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'トピックの削除に失敗しました')
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefreshTopics()
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'トピックの更新に失敗しました')
    } finally {
      setIsRefreshing(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white">トピック管理</CardTitle>
              <CardDescription className="text-slate-400">
                収集されたトピックの編集・削除・管理
              </CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRefreshing ? '更新中...' : '最新トピックを取得'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* フィルター */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white">検索</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="タイトルまたはコインで検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-white">優先度</Label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              >
                <option value="">すべて</option>
                <option value="urgent">緊急</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            
            <div>
              <Label className="text-white">ソース</Label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              >
                <option value="">すべて</option>
                <option value="RSS配信">RSS配信</option>
                <option value="価格データ">価格データ</option>
                <option value="トレンド">トレンド</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert className="bg-red-900 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* トピックリスト */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">
            トピック一覧 ({filteredTopics.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-screen overflow-y-auto">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                className="p-4 bg-slate-700 border border-slate-600 rounded-lg"
              >
                {editingTopic === topic.id ? (
                  // 編集モード
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">タイトル</Label>
                      <Input
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="mt-1 bg-slate-600 border-slate-500 text-white"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">優先度</Label>
                        <select
                          value={editForm.priority || ''}
                          onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white"
                        >
                          <option value="urgent">緊急</option>
                          <option value="high">高</option>
                          <option value="medium">中</option>
                          <option value="low">低</option>
                        </select>
                      </div>
                      
                      <div>
                        <Label className="text-white">スコア</Label>
                        <Input
                          type="number"
                          value={editForm.score || 0}
                          onChange={(e) => setEditForm({ ...editForm, score: parseFloat(e.target.value) })}
                          className="mt-1 bg-slate-600 border-slate-500 text-white"
                          min={0}
                          max={100}
                          step={0.1}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={handleEditCancel}
                        variant="outline"
                        className="border-slate-500 text-slate-300 hover:bg-slate-600"
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleEditSave}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        保存
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 表示モード
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getPriorityColor(topic.priority)}>
                          {topic.priority}
                        </Badge>
                        <span className="text-sm text-slate-400">
                          スコア: {topic.score.toFixed(1)}
                        </span>
                        {topic.source && (
                          <Badge variant="secondary" className="bg-slate-600 text-white">
                            {topic.source}
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="text-white font-medium mb-2">{topic.title}</h3>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <div className="flex gap-2">
                          {topic.coins.map((coin) => (
                            <Badge key={coin} variant="outline" className="border-yellow-600 text-yellow-600">
                              {coin}
                            </Badge>
                          ))}
                        </div>
                        <span>{topic.collectedAt}</span>
                        {topic.sourceUrl && (
                          <a 
                            href={topic.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            元記事
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => handleEditStart(topic)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(topic.id)}
                        size="sm"
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {filteredTopics.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                該当するトピックが見つかりません
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}