'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useArticles } from '@/hooks/useArticles'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  Edit3, 
  Save, 
  X, 
  FileText, 
  Clock, 
  Hash, 
  Type,
  AlignLeft,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  Shield,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react'

interface ArticleEditorProps {
  articleId: string
  initialTitle?: string
  initialContent?: string
  initialType?: string
  initialCoins?: string[]
  onClose?: () => void
  onSave?: (data: any) => void
}

export function ArticleEditor({
  articleId,
  initialTitle = '',
  initialContent = '',
  initialType = 'analysis',
  initialCoins = [],
  onClose,
  onSave
}: ArticleEditorProps) {
  const { updateArticle, isUpdating } = useArticles()
  
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [type, setType] = useState(initialType)
  const [coins, setCoins] = useState(initialCoins.join(', '))
  const [isPreview, setIsPreview] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [hasChanges, setHasChanges] = useState(false)
  const [factCheckResults, setFactCheckResults] = useState<FactCheckResult | null>(null)
  const [isFactChecking, setIsFactChecking] = useState(false)
  const [showFactCheck, setShowFactCheck] = useState(false)

  // 文字数カウント
  useEffect(() => {
    const count = content.length
    setWordCount(count)
  }, [content])

  // 変更検知
  useEffect(() => {
    const changed = 
      title !== initialTitle || 
      content !== initialContent || 
      type !== initialType || 
      coins !== initialCoins.join(', ')
    setHasChanges(changed)
  }, [title, content, type, coins, initialTitle, initialContent, initialType, initialCoins])

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('タイトルを入力してください')
      return
    }
    
    if (!content.trim()) {
      toast.error('本文を入力してください')
      return
    }

    const articleData = {
      title: title.trim(),
      content: content.trim(),
      type,
      coins: coins.split(',').map(coin => coin.trim()).filter(Boolean),
      wordCount
    }

    try {
      await updateArticle({ id: articleId, updates: articleData })
      
      if (onSave) {
        onSave(articleData)
      }
      
      toast.success('記事を保存しました')
      setHasChanges(false)
    } catch (error) {
      toast.error('保存に失敗しました')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    toast.success('本文をコピーしました')
  }

  const handleDownload = () => {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${articleId}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('記事をダウンロードしました')
  }

  const handleFactCheck = async () => {
    if (!content.trim()) {
      toast.error('ファクトチェックするコンテンツがありません')
      return
    }

    setIsFactChecking(true)
    
    try {
      const result = await apiClient.runFactCheck(articleId)
      setFactCheckResults(result.results)
      setShowFactCheck(true)
      toast.success('ファクトチェックが完了しました')
    } catch (error: any) {
      toast.error('ファクトチェックに失敗しました: ' + (error.message || 'Unknown error'))
    } finally {
      setIsFactChecking(false)
    }
  }

  const getReliabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getReliabilityIcon = (score: number) => {
    if (score >= 80) return <ShieldCheck className="h-4 w-4" />
    if (score >= 60) return <Shield className="h-4 w-4" />
    return <ShieldAlert className="h-4 w-4" />
  }

  const highlightFactCheckItems = (text: string, items: FactCheckResult['items']) => {
    if (!items || items.length === 0) return text
    
    let highlightedText = text
    items.forEach((item, index) => {
      if (item.text && text.includes(item.text)) {
        const className = item.verified === true 
          ? 'bg-green-200/20 border-b-2 border-green-400 text-green-300'
          : item.verified === false 
          ? 'bg-red-200/20 border-b-2 border-red-400 text-red-300'
          : 'bg-yellow-200/20 border-b-2 border-yellow-400 text-yellow-300'
        
        highlightedText = highlightedText.replace(
          item.text,
          `<span class="${className}" title="${item.message || ''}">${item.text}</span>`
        )
      }
    })
    return highlightedText
  }

  return (
    <Card className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700/50 backdrop-blur-xl shadow-2xl">
      <CardHeader className="border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Edit3 className="h-6 w-6" />
            記事編集
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-400">
                <AlertCircle className="h-3 w-3 mr-1" />
                未保存の変更
              </Badge>
            )}
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* タイトル編集 */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-2">
            <Type className="h-4 w-4" />
            タイトル
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="記事のタイトルを入力..."
            className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* 記事タイプ */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-2">
            <FileText className="h-4 w-4" />
            記事タイプ
          </Label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="analysis">分析記事</option>
            <option value="news">ニュース記事</option>
            <option value="guide">ガイド記事</option>
            <option value="review">レビュー記事</option>
          </select>
        </div>

        {/* 関連コイン */}
        <div className="space-y-2">
          <Label className="text-white flex items-center gap-2">
            <Hash className="h-4 w-4" />
            関連コイン（カンマ区切り）
          </Label>
          <Input
            value={coins}
            onChange={(e) => setCoins(e.target.value)}
            placeholder="BTC, ETH, SOL..."
            className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* 本文編集/プレビュー */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-white flex items-center gap-2">
              <AlignLeft className="h-4 w-4" />
              本文
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {wordCount} 文字
              </span>
              <Button
                onClick={handleFactCheck}
                disabled={isFactChecking || !content.trim()}
                variant="outline"
                size="sm"
                className={`border-gray-600 text-gray-300 hover:bg-gray-700 ${
                  factCheckResults ? (factCheckResults.reliabilityScore >= 80 ? 'border-green-500 text-green-400' : 
                                     factCheckResults.reliabilityScore >= 60 ? 'border-yellow-500 text-yellow-400' : 
                                     'border-red-500 text-red-400') : ''
                }`}
              >
                {isFactChecking ? (
                  <>
                    <Clock className="h-3 w-3 mr-1 animate-spin" />
                    チェック中
                  </>
                ) : (
                  <>
                    {factCheckResults ? getReliabilityIcon(factCheckResults.reliabilityScore) : <Shield className="h-3 w-3" />}
                    <span className="ml-1">ファクトチェック</span>
                    {factCheckResults && (
                      <span className={`ml-1 ${getReliabilityColor(factCheckResults.reliabilityScore)}`}>
                        ({factCheckResults.reliabilityScore}%)
                      </span>
                    )}
                  </>
                )}
              </Button>
              <Button
                onClick={() => setIsPreview(!isPreview)}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {isPreview ? (
                  <>
                    <Edit3 className="h-3 w-3 mr-1" />
                    編集
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    プレビュー
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {isPreview ? (
            <div className="min-h-[400px] p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="prose prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ 
                  __html: factCheckResults && showFactCheck 
                    ? highlightFactCheckItems(content.replace(/\n/g, '<br>'), factCheckResults.items)
                    : content.replace(/\n/g, '<br>')
                }} />
              </div>
              
              {/* ファクトチェック結果表示 */}
              {factCheckResults && showFactCheck && (
                <div className="mt-4 p-4 bg-gray-900/50 border border-gray-600 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium flex items-center gap-2">
                      {getReliabilityIcon(factCheckResults.reliabilityScore)}
                      ファクトチェック結果
                    </h4>
                    <Button
                      onClick={() => setShowFactCheck(false)}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{factCheckResults.totalFacts}</div>
                      <div className="text-xs text-gray-400">総項目数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{factCheckResults.verified}</div>
                      <div className="text-xs text-gray-400">検証済み</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">{factCheckResults.failed}</div>
                      <div className="text-xs text-gray-400">問題あり</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getReliabilityColor(factCheckResults.reliabilityScore)}`}>
                        {factCheckResults.reliabilityScore}%
                      </div>
                      <div className="text-xs text-gray-400">信頼度</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {factCheckResults.items.map((item, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-gray-800/50 rounded text-sm">
                        <div className="mt-1">
                          {item.verified === true ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : item.verified === false ? (
                            <AlertCircle className="h-4 w-4 text-red-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium">{item.text}</div>
                          {item.message && <div className="text-gray-400 mt-1">{item.message}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="記事の本文を入力..."
              className="min-h-[400px] bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500 resize-none"
            />
          )}
        </div>
      </CardContent>

      <CardFooter className="border-t border-gray-700/50 p-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Copy className="h-4 w-4 mr-2" />
              コピー
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Download className="h-4 w-4 mr-2" />
              ダウンロード
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={isUpdating || !hasChanges}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {isUpdating ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存する
                </>
              )}
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}