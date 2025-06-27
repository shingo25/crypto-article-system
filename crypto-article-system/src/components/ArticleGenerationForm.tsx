'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

interface ArticleGenerationFormProps {
  topics: Topic[]
  onGenerate: (config: ArticleConfig) => Promise<void>
}

export interface ArticleConfig {
  topicId: string
  articleType: string
  wordCount: number
  depth: string
  keywords: string[]
  tone: string
  includeImages: boolean
  includeCharts: boolean
  includeSources: boolean
  customInstructions?: string
}

export default function ArticleGenerationForm({ topics, onGenerate }: ArticleGenerationFormProps) {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [config, setConfig] = useState<ArticleConfig>({
    topicId: '',
    articleType: 'analysis',
    wordCount: 1000,
    depth: 'medium',
    keywords: [],
    tone: 'professional',
    includeImages: true,
    includeCharts: true,
    includeSources: true,
    customInstructions: ''
  })
  const [keywordInput, setKeywordInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic)
    setConfig({ ...config, topicId: topic.id })
    setError(null)
  }

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !config.keywords.includes(keywordInput.trim())) {
      setConfig({
        ...config,
        keywords: [...config.keywords, keywordInput.trim()]
      })
      setKeywordInput('')
    }
  }

  const handleRemoveKeyword = (keyword: string) => {
    setConfig({
      ...config,
      keywords: config.keywords.filter(k => k !== keyword)
    })
  }

  const handleGenerate = async () => {
    if (!selectedTopic) {
      setError('トピックを選択してください')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      await onGenerate(config)
    } catch (error) {
      setError(error instanceof Error ? error.message : '記事生成に失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* トピック選択 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">トピック選択</CardTitle>
          <CardDescription className="text-slate-400">
            記事を生成するトピックを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {topics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => handleTopicSelect(topic)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedTopic?.id === topic.id
                    ? 'bg-blue-900 border-blue-600'
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{topic.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={
                        topic.priority === 'urgent' ? 'destructive' :
                        topic.priority === 'high' ? 'default' :
                        'secondary'
                      }>
                        {topic.priority}
                      </Badge>
                      <span className="text-sm text-slate-400">
                        スコア: {topic.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 記事設定 */}
      {selectedTopic && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">記事設定</CardTitle>
            <CardDescription className="text-slate-400">
              生成する記事の詳細設定を行ってください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 記事タイプ */}
            <div>
              <Label className="text-white">記事タイプ</Label>
              <select
                value={config.articleType}
                onChange={(e) => setConfig({ ...config, articleType: e.target.value })}
                className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              >
                <option value="breaking_news">速報記事</option>
                <option value="analysis">分析記事</option>
                <option value="technical">技術解説</option>
                <option value="market_overview">市場概況</option>
                <option value="educational">教育記事</option>
                <option value="opinion">オピニオン</option>
              </select>
            </div>

            {/* 文字数と深度 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">文字数</Label>
                <Input
                  type="number"
                  value={config.wordCount}
                  onChange={(e) => setConfig({ ...config, wordCount: parseInt(e.target.value) })}
                  min={300}
                  max={3000}
                  step={100}
                  className="mt-2 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-white">記事の深度</Label>
                <select
                  value={config.depth}
                  onChange={(e) => setConfig({ ...config, depth: e.target.value })}
                  className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                >
                  <option value="shallow">浅い（初心者向け）</option>
                  <option value="medium">中程度（一般向け）</option>
                  <option value="deep">深い（専門家向け）</option>
                </select>
              </div>
            </div>

            {/* トーン */}
            <div>
              <Label className="text-white">記事のトーン</Label>
              <select
                value={config.tone}
                onChange={(e) => setConfig({ ...config, tone: e.target.value })}
                className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              >
                <option value="professional">プロフェッショナル</option>
                <option value="casual">カジュアル</option>
                <option value="academic">アカデミック</option>
                <option value="enthusiastic">熱心</option>
                <option value="neutral">中立的</option>
              </select>
            </div>

            {/* キーワード */}
            <div>
              <Label className="text-white">キーワード</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                  placeholder="キーワードを入力"
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Button
                  onClick={handleAddKeyword}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  追加
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {config.keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveKeyword(keyword)}
                  >
                    {keyword} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* オプション */}
            <div className="space-y-3">
              <Label className="text-white">追加オプション</Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-white">
                  <input
                    type="checkbox"
                    checked={config.includeImages}
                    onChange={(e) => setConfig({ ...config, includeImages: e.target.checked })}
                    className="rounded border-slate-600"
                  />
                  <span>画像を含める</span>
                </label>
                <label className="flex items-center space-x-2 text-white">
                  <input
                    type="checkbox"
                    checked={config.includeCharts}
                    onChange={(e) => setConfig({ ...config, includeCharts: e.target.checked })}
                    className="rounded border-slate-600"
                  />
                  <span>チャートを含める</span>
                </label>
                <label className="flex items-center space-x-2 text-white">
                  <input
                    type="checkbox"
                    checked={config.includeSources}
                    onChange={(e) => setConfig({ ...config, includeSources: e.target.checked })}
                    className="rounded border-slate-600"
                  />
                  <span>情報源を含める</span>
                </label>
              </div>
            </div>

            {/* カスタム指示 */}
            <div>
              <Label className="text-white">カスタム指示（オプション）</Label>
              <Textarea
                value={config.customInstructions}
                onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
                placeholder="記事生成に関する追加の指示があれば入力してください"
                className="mt-2 bg-slate-700 border-slate-600 text-white"
                rows={3}
              />
            </div>

            {/* エラー表示 */}
            {error && (
              <Alert className="bg-red-900 border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>エラー</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 生成ボタン */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedTopic}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isGenerating ? '記事を生成中...' : '記事を生成'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}