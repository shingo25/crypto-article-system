'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Sparkles, 
  Zap, 
  Brain, 
  FileText,
  Settings,
  Play,
  Square,
  RotateCcw,
  Clock,
  Target
} from 'lucide-react'
import { useWorkspaceStore } from '@/lib/stores/workspaceStore'

const GenerationProgress: React.FC = () => {
  const { generationState } = useWorkspaceStore()

  const stageLabels = {
    idle: 'Ready to generate',
    analyzing: 'Analyzing topic...',
    writing: 'Writing content...',
    optimizing: 'Optimizing structure...',
    finalizing: 'Finalizing article...',
    completed: 'Generation completed!',
    error: 'Generation failed'
  } as const

  const stageIcons = {
    idle: Brain,
    analyzing: Target,
    writing: FileText,
    optimizing: Settings,
    finalizing: Sparkles,
    completed: Sparkles,
    error: RotateCcw
  } as const

  const Icon = stageIcons[generationState.stage]

  return (
    <Card className="neural-neumorphic border-0 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={cn(
              "h-4 w-4",
              generationState.isGenerating ? "text-neural-cyan animate-pulse" : "text-neural-text-muted"
            )} />
            <span className="font-medium text-sm neural-title">
              {generationState.currentStep || stageLabels[generationState.stage]}
            </span>
          </div>
          
          {generationState.isGenerating && (
            <Badge className="neural-gradient-primary text-white border-0 text-xs">
              {generationState.progress}%
            </Badge>
          )}
        </div>

        {generationState.isGenerating && (
          <Progress 
            value={generationState.progress} 
            className="h-2 bg-neural-elevated/50"
          />
        )}

        {generationState.error && (
          <div className="mt-3 p-3 bg-neural-error/10 border border-neural-error/20 rounded-lg">
            <div className="text-neural-error text-sm font-medium">
              {generationState.error}
            </div>
          </div>
        )}

        {generationState.estimatedTime && generationState.isGenerating && (
          <div className="mt-3 flex items-center gap-2 text-xs text-neural-text-muted">
            <Clock className="h-3 w-3" />
            Estimated time: {generationState.estimatedTime}s remaining
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const GenerationSettings: React.FC = () => {
  const [settings, setSettings] = React.useState({
    style: 'professional',
    length: 'medium',
    includeImages: true,
    seoOptimized: true
  })

  return (
    <Card className="neural-neumorphic border-0 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold neural-title flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Generation Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Style */}
        <div>
          <label className="text-xs font-medium text-neural-text-secondary mb-2 block">
            Writing Style
          </label>
          <div className="grid grid-cols-3 gap-1">
            {['Professional', 'Casual', 'Technical'].map((style) => (
              <Button
                key={style}
                variant="ghost"
                size="sm"
                className={cn(
                  "neural-button text-xs h-8",
                  settings.style === style.toLowerCase() && "neural-gradient-primary text-white"
                )}
                onClick={() => setSettings(prev => ({ ...prev, style: style.toLowerCase() }))}
              >
                {style}
              </Button>
            ))}
          </div>
        </div>

        {/* Length */}
        <div>
          <label className="text-xs font-medium text-neural-text-secondary mb-2 block">
            Article Length
          </label>
          <div className="grid grid-cols-3 gap-1">
            {['Short', 'Medium', 'Long'].map((length) => (
              <Button
                key={length}
                variant="ghost"
                size="sm"
                className={cn(
                  "neural-button text-xs h-8",
                  settings.length === length.toLowerCase() && "neural-gradient-primary text-white"
                )}
                onClick={() => setSettings(prev => ({ ...prev, length: length.toLowerCase() }))}
              >
                {length}
              </Button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.includeImages}
              onChange={(e) => setSettings(prev => ({ ...prev, includeImages: e.target.checked }))}
              className="w-3 h-3 rounded border-neural-elevated text-neural-cyan focus:ring-neural-cyan"
            />
            <span className="text-xs text-neural-text-secondary">Include images</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.seoOptimized}
              onChange={(e) => setSettings(prev => ({ ...prev, seoOptimized: e.target.checked }))}
              className="w-3 h-3 rounded border-neural-elevated text-neural-cyan focus:ring-neural-cyan"
            />
            <span className="text-xs text-neural-text-secondary">SEO optimized</span>
          </label>
        </div>
      </CardContent>
    </Card>
  )
}

const TopicSummary: React.FC = () => {
  const { selectedTopic } = useWorkspaceStore()

  if (!selectedTopic) {
    return (
      <Card className="neural-neumorphic border-0 mb-4">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <div className="neural-title text-neural-text-secondary">Select a topic</div>
          <div className="text-sm text-neural-text-muted mt-1">
            Choose a topic from the left panel to start generating
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="neural-neumorphic border-0 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold neural-title flex items-center gap-2">
          <Target className="h-4 w-4 text-neural-cyan" />
          Selected Topic
        </CardTitle>
      </CardHeader>
      <CardContent>
        <h3 className="font-semibold neural-title mb-2 text-sm leading-tight">
          {selectedTopic.summary}
        </h3>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {selectedTopic.coins.map((coin: string) => (
            <Badge 
              key={coin} 
              variant="outline" 
              className="text-xs border-neural-elevated text-neural-text-secondary"
            >
              {coin}
            </Badge>
          ))}
        </div>

        {selectedTopic.summary && (
          <p className="text-xs text-neural-text-muted leading-relaxed line-clamp-3">
            {selectedTopic.summary}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function GenerationColumn() {
  const { 
    selectedTopic, 
    generationState, 
    startGeneration,
    resetWorkspace
  } = useWorkspaceStore()

  const handleStartGeneration = async () => {
    if (selectedTopic) {
      await startGeneration(selectedTopic)
    }
  }

  const handleStopGeneration = () => {
    // 実際の実装では生成プロセスを停止
    console.log('Stopping generation...')
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Topic Summary */}
      <TopicSummary />

      {/* Generation Progress */}
      <GenerationProgress />

      {/* Generation Settings */}
      <GenerationSettings />

      {/* Actions */}
      <div className="space-y-2">
        {generationState.isGenerating ? (
          <Button
            variant="outline"
            className="w-full neural-button border-neural-error text-neural-error hover:bg-neural-error/10"
            onClick={handleStopGeneration}
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Generation
          </Button>
        ) : (
          <Button
            className="w-full neural-gradient-primary text-white border-0"
            disabled={!selectedTopic}
            onClick={handleStartGeneration}
          >
            <Zap className="h-4 w-4 mr-2" />
            Generate Article
          </Button>
        )}

        <Button
          variant="ghost"
          className="w-full neural-button"
          onClick={resetWorkspace}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Workspace
        </Button>
      </div>

      {/* Help Text */}
      <div className="mt-auto pt-4 border-t border-neural-elevated/20">
        <div className="text-xs text-neural-text-muted leading-relaxed">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-3 w-3 text-neural-cyan" />
            <span className="font-medium">AI Generation Tips</span>
          </div>
          <ul className="space-y-1 ml-5 list-disc">
            <li>Select high-score topics for better results</li>
            <li>Professional style works best for crypto content</li>
            <li>Medium length provides optimal balance</li>
          </ul>
        </div>
      </div>
    </div>
  )
}