'use client'

import React, { useState, useEffect } from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Zap,
  Eye,
  ExternalLink,
  Cpu,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAIStats, getActiveProviderInfo, getProvidersInfo, type AIProviderInfo } from '@/lib/ai-config'
import { useRouter } from 'next/navigation'

export function AIConfigNeural() {
  const [aiStats, setAIStats] = useState<ReturnType<typeof getAIStats> | null>(null)
  const [activeProvider, setActiveProvider] = useState<AIProviderInfo | null>(null)
  const [allProviders, setAllProviders] = useState<AIProviderInfo[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadAIInfo = () => {
      try {
        const stats = getAIStats()
        const active = getActiveProviderInfo()
        const providers = getProvidersInfo()
        
        setAIStats(stats)
        setActiveProvider(active)
        setAllProviders(providers)
      } catch (error) {
        console.error('Failed to load AI info:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAIInfo()
    
    // 定期的に更新（設定変更を検知）
    const interval = setInterval(loadAIInfo, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleOpenSettings = () => {
    router.push('/settings')
  }

  if (loading) {
    return (
      <NeuralCard className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-neural-cyan animate-pulse" />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 neural-neumorphic-inset rounded animate-pulse" />
            <div className="h-4 neural-neumorphic-inset rounded animate-pulse" />
            <div className="h-4 neural-neumorphic-inset rounded animate-pulse" />
          </div>
        </CardContent>
      </NeuralCard>
    )
  }

  const getStatusColor = () => {
    if (!aiStats?.hasActiveConfig) return 'text-neural-error'
    if (aiStats.configuredProviders === aiStats.totalProviders) return 'text-neural-success'
    return 'text-neural-warning'
  }

  const getStatusIcon = () => {
    if (!aiStats?.hasActiveConfig) return <AlertCircle className="h-4 w-4 text-neural-error" />
    if (aiStats.configuredProviders === aiStats.totalProviders) return <CheckCircle className="h-4 w-4 text-neural-success" />
    return <AlertCircle className="h-4 w-4 text-neural-warning" />
  }

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-neural-success'
    if (percentage >= 50) return 'bg-neural-warning'
    return 'bg-neural-error'
  }

  return (
    <NeuralCard className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-neural-cyan" />
            AI Configuration
          </CardTitle>
          <NeuralButton
            variant="ghost"
            size="sm"
            onClick={handleOpenSettings}
            className="h-8 w-8 p-0"
          >
            <Settings className="h-4 w-4" />
          </NeuralButton>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* アクティブ設定状況 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neural-text-secondary">設定状況</span>
            {getStatusIcon()}
          </div>
          
          {activeProvider ? (
            <div className="p-3 neural-neumorphic-inset rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{activeProvider.icon}</span>
                  <span className="font-semibold neural-title text-sm">{activeProvider.name}</span>
                </div>
                <Badge className="bg-neural-success/20 text-neural-success border-neural-success/30 text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  アクティブ
                </Badge>
              </div>
              
              {activeProvider.currentModel && (
                <div className="space-y-1">
                  <div className="text-xs neural-title">{activeProvider.currentModel.name}</div>
                  <div className="text-xs text-neural-text-muted">{activeProvider.currentModel.description}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-neural-cyan" />
                      <span className="text-xs text-neural-text-secondary">{activeProvider.currentModel.speed}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-neural-warning" />
                      <span className="text-xs text-neural-text-secondary">{activeProvider.currentModel.cost}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 neural-neumorphic-inset rounded-lg text-center">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-neural-error" />
              <p className="text-sm text-neural-error">AI設定が未完了です</p>
              <p className="text-xs text-neural-text-muted mt-1">設定ページでAPIキーを設定してください</p>
            </div>
          )}
        </div>

        {/* 設定完了率 */}
        {aiStats && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neural-text-secondary">プロバイダー設定完了率</span>
              <span className={cn("text-sm font-semibold", getStatusColor())}>
                {aiStats.completenessPercentage}%
              </span>
            </div>
            
            <div className="w-full bg-neural-elevated rounded-full h-2">
              <div 
                className={cn("h-2 rounded-full transition-all duration-500", getCompletionColor(aiStats.completenessPercentage))}
                style={{ width: `${aiStats.completenessPercentage}%` }}
              />
            </div>
            
            <div className="text-xs text-neural-text-muted">
              {aiStats.configuredProviders} / {aiStats.totalProviders} プロバイダー設定済み
            </div>
          </div>
        )}

        {/* 設定済みプロバイダー一覧 */}
        <div className="space-y-2">
          <span className="text-sm text-neural-text-secondary">利用可能なプロバイダー</span>
          <div className="grid grid-cols-2 gap-2">
            {allProviders.slice(0, 4).map((provider, index) => (
              <div
                key={index}
                className={cn(
                  "p-2 rounded-lg border text-center neural-transition",
                  provider.isConfigured 
                    ? "bg-neural-success/10 border-neural-success/30" 
                    : "bg-neural-elevated/20 border-neural-elevated/30"
                )}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-sm">{provider.icon}</span>
                  {provider.isConfigured && (
                    <CheckCircle className="h-3 w-3 text-neural-success" />
                  )}
                </div>
                <div className="text-xs neural-title truncate">{provider.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="pt-2 border-t border-neural-elevated/20">
          <NeuralButton
            variant="gradient"
            size="sm"
            onClick={handleOpenSettings}
            className="w-full h-8 text-xs"
          >
            <Settings className="h-3 w-3 mr-2" />
            AI設定を管理
            <ExternalLink className="h-3 w-3 ml-2" />
          </NeuralButton>
        </div>
      </CardContent>
    </NeuralCard>
  )
}