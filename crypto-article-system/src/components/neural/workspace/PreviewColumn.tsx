'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Eye, 
  Edit3, 
  SplitSquareHorizontal,
  Save,
  Download,
  Share2,
  Clock,
  FileText,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Settings,
  Sparkles
} from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspaceStore'

const PreviewModeToggle: React.FC = () => {
  const { previewMode, setPreviewMode } = useWorkspaceStore()

  const modes = [
    { key: 'edit', label: 'Edit', icon: Edit3 },
    { key: 'preview', label: 'Preview', icon: Eye },
    { key: 'split', label: 'Split', icon: SplitSquareHorizontal }
  ] as const

  return (
    <div className="flex items-center gap-1 p-1 bg-neural-surface rounded-lg">
      {modes.map(({ key, label, icon: Icon }) => (
        <Button
          key={key}
          variant="ghost"
          size="sm"
          className={cn(
            "neural-button text-xs h-8 px-3",
            previewMode === key && "neural-gradient-primary text-white"
          )}
          onClick={() => setPreviewMode(key)}
        >
          <Icon className="h-3 w-3 mr-1" />
          {label}
        </Button>
      ))}
    </div>
  )
}

const ArticleMetadata: React.FC = () => {
  const { currentArticle } = useWorkspaceStore()

  if (!currentArticle) return null

  const { metadata } = currentArticle

  return (
    <Card className="neural-neumorphic border-0 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold neural-title flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Article Metadata
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-neural-surface rounded-lg">
            <div className="text-2xl font-bold neural-title text-neural-cyan">
              {metadata.wordCount}
            </div>
            <div className="text-xs text-neural-text-muted">Words</div>
          </div>
          
          <div className="text-center p-3 bg-neural-surface rounded-lg">
            <div className="text-2xl font-bold neural-title text-neural-success">
              {metadata.readingTime}
            </div>
            <div className="text-xs text-neural-text-muted">Min read</div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-neural-text-secondary mb-2 block">
            Keywords
          </label>
          <div className="flex flex-wrap gap-1">
            {metadata.keywords.map((keyword) => (
              <Badge 
                key={keyword}
                variant="outline" 
                className="text-xs border-neural-elevated text-neural-text-secondary"
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-neural-text-muted">
          <Clock className="h-3 w-3" />
          Updated {new Date(metadata.updatedAt).toLocaleString('ja-JP')}
        </div>
      </CardContent>
    </Card>
  )
}

const ArticleStatusCard: React.FC = () => {
  const { currentArticle } = useWorkspaceStore()

  if (!currentArticle) return null

  const statusConfig = {
    draft: { icon: Edit3, color: 'text-neural-warning', bg: 'bg-neural-warning/10', label: 'Draft' },
    generating: { icon: Sparkles, color: 'text-neural-cyan', bg: 'bg-neural-cyan/10', label: 'Generating...' },
    review: { icon: AlertCircle, color: 'text-neural-orchid', bg: 'bg-neural-orchid/10', label: 'In Review' },
    published: { icon: CheckCircle, color: 'text-neural-success', bg: 'bg-neural-success/10', label: 'Published' }
  }

  const config = statusConfig[currentArticle.status]
  const Icon = config.icon

  return (
    <Card className="neural-neumorphic border-0 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.bg)}>
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>
            <div>
              <div className="font-semibold neural-title text-sm">{config.label}</div>
              <div className="text-xs text-neural-text-muted">Article Status</div>
            </div>
          </div>
          
          <Badge className={cn("border-0 text-white", {
            'neural-gradient-warning': currentArticle.status === 'draft',
            'neural-gradient-primary': currentArticle.status === 'generating',
            'neural-gradient-secondary': currentArticle.status === 'review',
            'neural-gradient-success': currentArticle.status === 'published'
          })}>
            {config.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

const ArticleEditor: React.FC = () => {
  const { currentArticle, updateArticleContent } = useWorkspaceStore()
  const [content, setContent] = React.useState('')

  React.useEffect(() => {
    if (currentArticle) {
      setContent(currentArticle.content)
    }
  }, [currentArticle])

  const handleContentChange = (value: string) => {
    setContent(value)
    updateArticleContent(value)
  }

  if (!currentArticle) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold neural-title text-sm">Content Editor</h3>
        <Button
          size="sm"
          className="neural-gradient-primary text-white border-0 h-8 px-3 text-xs"
        >
          <Save className="h-3 w-3 mr-1" />
          Save
        </Button>
      </div>
      
      <Textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        className="neural-neumorphic-inset border-0 bg-neural-surface text-neural-text-primary min-h-[400px] resize-none"
        placeholder="Start writing your article..."
      />
    </div>
  )
}

const ArticlePreview: React.FC = () => {
  const { currentArticle } = useWorkspaceStore()

  if (!currentArticle) return null

  // マークダウンを簡易的にHTMLに変換
  const formatContent = (content: string) => {
    return content
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold neural-title mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold neural-title mb-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium neural-title mb-2">$1</h3>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^\n/, '<p class="mb-4">')
      + '</p>'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold neural-title text-sm">Preview</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="neural-button h-8 px-3 text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="neural-button h-8 px-3 text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open
          </Button>
        </div>
      </div>
      
      <div className="neural-neumorphic-inset p-6 bg-neural-surface rounded-lg overflow-y-auto max-h-[400px]">
        <div 
          className="neural-text-primary prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: formatContent(currentArticle.content) 
          }}
        />
      </div>
    </div>
  )
}

const EmptyState: React.FC = () => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center py-8">
      <div className="text-6xl mb-6">📝</div>
      <div className="neural-title text-neural-text-secondary text-xl mb-2">
        No article selected
      </div>
      <div className="text-neural-text-muted mb-6 max-w-sm">
        Generate an article from a topic to start editing and previewing content
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-neural-text-muted">
        <BookOpen className="h-4 w-4" />
        <span>Ready for content creation</span>
      </div>
    </div>
  </div>
)

export function PreviewColumn() {
  const { currentArticle, previewMode, saveArticle } = useWorkspaceStore()

  const handleSave = async () => {
    await saveArticle()
  }

  if (!currentArticle) {
    return <EmptyState />
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold neural-title">Article Preview</h2>
        <PreviewModeToggle />
      </div>

      {/* Article Status */}
      <ArticleStatusCard />

      {/* Article Metadata */}
      <ArticleMetadata />

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {previewMode === 'edit' && <ArticleEditor />}
        {previewMode === 'preview' && <ArticlePreview />}
        {previewMode === 'split' && (
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="overflow-hidden">
              <ArticleEditor />
            </div>
            <div className="overflow-hidden">
              <ArticlePreview />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-neural-elevated/20">
        <div className="flex items-center gap-2">
          <Button
            className="neural-gradient-primary text-white border-0 flex-1"
            onClick={handleSave}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Article
          </Button>
          
          <Button
            variant="outline"
            className="neural-button"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button
            variant="outline"
            className="neural-button"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="neural-button"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}