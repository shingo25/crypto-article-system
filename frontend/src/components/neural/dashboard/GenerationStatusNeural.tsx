'use client'

import React from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Sparkles, FileText, Clock, TrendingUp, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

// モックデータ - 実際のAPIに置き換え予定
const mockGenerationData = {
  status: 'active',
  queue: 3,
  generated: {
    today: 12,
    thisWeek: 84,
    total: 1247
  },
  current: {
    topic: 'Bitcoin and Ethereum Market Analysis',
    progress: 65,
    stage: 'writing',
    eta: '2m 30s'
  },
  recent: [
    { id: 1, title: 'DeFi Trends in 2025', status: 'completed', time: '5m ago' },
    { id: 2, title: 'NFT Market Recovery', status: 'completed', time: '12m ago' },
    { id: 3, title: 'Layer 2 Solutions Comparison', status: 'completed', time: '28m ago' }
  ]
}

export function GenerationStatusNeural() {
  const { status, queue, generated, current, recent } = mockGenerationData

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'analyzing':
        return 'text-neural-cyan'
      case 'writing':
        return 'text-neural-warning'
      case 'optimizing':
        return 'text-neural-orchid'
      case 'completed':
        return 'text-neural-success'
      default:
        return 'text-neural-text-secondary'
    }
  }

  return (
    <NeuralCard className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-neural-cyan" />
          Generation Status
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Generation */}
        {status === 'active' && current ? (
          <div className="p-3 neural-neumorphic-inset rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium neural-title">Currently Generating</div>
              <div className={cn("text-xs font-medium", getStageColor(current.stage))}>
                {current.stage.toUpperCase()}
              </div>
            </div>
            
            <div className="text-xs text-neural-text-secondary mb-2 line-clamp-1">
              {current.topic}
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span className="font-medium">{current.progress}%</span>
              </div>
              <div className="h-2 bg-neural-surface rounded-full overflow-hidden">
                <div 
                  className="h-full bg-neural-cyan transition-all duration-300"
                  style={{ width: `${current.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-neural-text-muted">
                <span>ETA: {current.eta}</span>
                <span>{queue} in queue</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-4 neural-neumorphic-inset rounded-lg">
            <Activity className="h-8 w-8 mx-auto mb-2 text-neural-text-muted" />
            <div className="text-sm neural-title text-neural-text-secondary">No Active Generation</div>
            <div className="text-xs text-neural-text-muted mt-1">
              {queue > 0 ? `${queue} items in queue` : 'Queue is empty'}
            </div>
          </div>
        )}

        {/* Generation Statistics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 neural-neumorphic-inset rounded-lg">
            <div className="text-lg font-bold neural-title text-neural-cyan">{generated.today}</div>
            <div className="text-xs text-neural-text-muted">Today</div>
          </div>
          
          <div className="text-center p-2 neural-neumorphic-inset rounded-lg">
            <div className="text-lg font-bold neural-title text-neural-orchid">{generated.thisWeek}</div>
            <div className="text-xs text-neural-text-muted">This Week</div>
          </div>
          
          <div className="text-center p-2 neural-neumorphic-inset rounded-lg">
            <div className="text-lg font-bold neural-title text-neural-success">{generated.total}</div>
            <div className="text-xs text-neural-text-muted">Total</div>
          </div>
        </div>

        {/* Recent Articles */}
        <div className="space-y-2">
          <h4 className="font-medium neural-title text-sm">Recent Articles</h4>
          <div className="space-y-1">
            {recent.map((article) => (
              <div 
                key={article.id}
                className="flex items-center justify-between p-2 neural-neumorphic-inset rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3 text-neural-text-muted" />
                  <div>
                    <div className="text-xs font-medium neural-title line-clamp-1">
                      {article.title}
                    </div>
                    <div className="text-xs text-neural-text-muted">{article.time}</div>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-neural-success" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t border-neural-elevated/20">
          <NeuralButton
            variant="gradient"
            size="sm"
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            New Generation
          </NeuralButton>
        </div>
      </CardContent>
    </NeuralCard>
  )
}