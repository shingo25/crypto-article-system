'use client'

import React, { useCallback, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { NeuralCard, CardContent } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { NeuralInput } from '@/components/neural/NeuralInput'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  Target, 
  Clock, 
  TrendingUp,
  ExternalLink,
  Sparkles,
  MoreVertical
} from 'lucide-react'
import { useTopics } from '@/hooks/useTopics'
import { useWorkspaceStore } from '@/lib/stores/workspaceStore'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Topic } from '@/lib/types'

interface TopicCardProps {
  topic: Topic
  isSelected: boolean
  onSelect: (topic: Topic) => void
  onGenerate: (topic: Topic) => void
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, isSelected, onSelect, onGenerate }) => {
  const priorityColors: Record<string, string> = {
    urgent: 'neural-gradient-error',
    high: 'neural-gradient-warning', 
    medium: 'neural-gradient-primary',
    low: 'neural-gradient-success'
  }

  const priorityIcons: Record<string, string> = {
    urgent: '🔥',
    high: '⚡',
    medium: '💡',
    low: '📋'
  }

  // トピックタイプのアイコンと色
  const typeInfo = {
    analysis: { icon: '🔍', color: 'text-neural-cyan', label: '分析' },
    question: { icon: '❓', color: 'text-neural-warning', label: '考察' },
    comparison: { icon: '⚖️', color: 'text-neural-purple', label: '比較' },
    standard: { icon: '📰', color: 'text-neural-text-secondary', label: 'ニュース' }
  }
  
  const topicType = topic.type || 'standard'
  const typeDisplay = typeInfo[topicType] || typeInfo.standard

  return (
    <NeuralCard 
      className={cn(
        "group cursor-pointer neural-transition hover:scale-[1.02] hover:shadow-xl min-h-[180px]",
        isSelected && "ring-2 ring-neural-cyan shadow-lg shadow-neural-cyan/20 scale-[1.02]"
      )}
      onClick={() => onSelect(topic)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-white border-0 text-xs px-2 py-0.5", priorityColors[topic.priority] || 'neural-gradient-primary')}>
              <span className="mr-1 text-sm">{priorityIcons[topic.priority] || '💡'}</span>
              {topic.priority?.toUpperCase() || 'MEDIUM'}
            </Badge>
            
            {/* トピックタイプバッジ */}
            <div className={cn("flex items-center gap-1 px-2 py-1 bg-neural-elevated/30 rounded-full", typeDisplay.color)}>
              <span className="text-xs">{typeDisplay.icon}</span>
              <span className="text-xs font-medium">{typeDisplay.label}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-neural-elevated/30 rounded-full">
              <Target className="h-3 w-3 text-neural-cyan" />
              <span className="text-neural-cyan font-semibold text-xs">
                {topic.score ? Math.round(topic.score) : 90}
              </span>
            </div>
            
            <NeuralButton
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 neural-transition"
            >
              <MoreVertical className="h-3 w-3" />
            </NeuralButton>
          </div>
        </div>

        {/* Title */}
        <h3 className="neural-title font-semibold mb-3 line-clamp-2 text-sm leading-relaxed group-hover:text-neural-cyan neural-transition">
          {topic.summary}
        </h3>

        {/* 価格データ（分析トピックの場合） */}
        {topic.primaryData && (
          <div className="mb-3 p-2 bg-neural-elevated/20 rounded-lg">
            {topic.primaryData.change24h !== undefined && topic.primaryData.change24h !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-neural-text-secondary">価格変動</span>
                <span className={cn(
                  "font-semibold",
                  topic.primaryData.change24h > 0 ? "text-neural-success" : "text-neural-error"
                )}>
                  {topic.primaryData.change24h > 0 ? '+' : ''}{topic.primaryData.change24h.toFixed(1)}%
                </span>
              </div>
            )}
            {topic.primaryData.currentPrice && (
              <div className={cn(
                "flex items-center justify-between text-xs",
                topic.primaryData.change24h !== undefined ? "mt-1" : ""
              )}>
                <span className="text-neural-text-secondary">現在価格</span>
                <span className="font-medium">
                  ${typeof topic.primaryData.currentPrice === 'number' 
                    ? topic.primaryData.currentPrice.toLocaleString() 
                    : topic.primaryData.currentPrice}
                </span>
              </div>
            )}
            {topic.primaryData.volume24h && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-neural-text-secondary">24h取引高</span>
                <span className="font-medium text-xs">
                  {topic.primaryData.volume24h}
                </span>
              </div>
            )}
            {topic.primaryData.marketCapRank && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-neural-text-secondary">時価総額ランク</span>
                <span className="font-medium">#{topic.primaryData.marketCapRank}</span>
              </div>
            )}
          </div>
        )}

        {/* Coins */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {topic.coins?.slice(0, 3).map((coin: string) => (
            <div 
              key={coin} 
              className="flex items-center gap-1 px-2.5 py-1 bg-neural-surface/80 rounded-full border border-neural-elevated/50 hover:border-neural-cyan/50 transition-colors"
            >
              <TrendingUp className={cn(
                "h-3 w-3",
                topic.primaryData?.change24h !== undefined 
                  ? topic.primaryData.change24h > 0 ? "text-neural-success" : "text-neural-error"
                  : "text-neural-success"
              )} />
              <span className="text-neural-text-secondary text-xs font-medium">{coin}</span>
            </div>
          ))}
          {topic.coins?.length > 3 && (
            <div className="px-2.5 py-1 bg-neural-elevated/30 rounded-full">
              <span className="text-neural-text-muted text-xs">+{topic.coins.length - 3}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neural-text-muted">
            <Clock className="h-3 w-3" />
            {new Date(topic.timestamp).toLocaleTimeString('ja-JP', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* 予想読み時間 */}
            {topic.estimatedReadTime && (
              <div className="flex items-center gap-1 text-xs text-neural-text-muted">
                <Clock className="h-3 w-3" />
                <span>約{topic.estimatedReadTime}分</span>
              </div>
            )}
            
            <NeuralButton
              size="sm"
              variant="gradient"
              className="h-6 px-3 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onGenerate(topic)
              }}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {topic.type === 'analysis' ? '分析記事生成' : '記事生成'}
            </NeuralButton>
          </div>
        </div>
      </CardContent>
    </NeuralCard>
  )
}

export function TopicColumn() {
  const { topics, isLoading, hasMore, loadMoreTopics } = useTopics()
  const { 
    selectedTopic, 
    selectTopic, 
    topicFilter, 
    setTopicFilter,
    startGeneration
  } = useWorkspaceStore()

  const [searchQuery, setSearchQuery] = React.useState('')

  // フィルタリングされたトピック
  const filteredTopics = useMemo(() => {
    const filtered = topics.filter(topic => {
      const matchesSearch = !searchQuery || 
        topic.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.coins?.some((coin: string) => coin.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesPriority = topicFilter === 'all' || topic.priority === topicFilter

      return matchesSearch && matchesPriority
    })
    
    
    return filtered
  }, [topics, searchQuery, topicFilter])

  const handleTopicSelect = useCallback((topic: Topic) => {
    selectTopic(topic)
  }, [selectTopic])

  const handleGenerate = useCallback(async (topic: Topic) => {
    selectTopic(topic)
    await startGeneration()
  }, [selectTopic, startGeneration])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Search & Filters */}
      <div className="p-4 space-y-3 border-b border-neural-elevated/20">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neural-text-muted" />
          <NeuralInput
            placeholder="Search topics, coins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <NeuralButton
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            <Filter className="h-3 w-3 mr-1" />
            All
          </NeuralButton>
          
          {['urgent', 'high', 'medium', 'low'].map((priority) => (
            <NeuralButton
              key={priority}
              variant={topicFilter === priority ? "gradient" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => setTopicFilter(
                topicFilter === priority ? 'all' : priority as 'urgent' | 'high' | 'medium' | 'low'
              )}
            >
              {priority}
            </NeuralButton>
          ))}
        </div>
      </div>

      {/* Topics List */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 scrollbar-thin scrollbar-thumb-neural-elevated/30 scrollbar-track-transparent hover:scrollbar-thumb-neural-elevated/50" 
        style={{
          maxHeight: 'calc(100vh - 300px)',
          overscrollBehavior: 'contain'
        }}
      >
        {isLoading && filteredTopics.length === 0 ? (
          <LoadingSkeleton count={5} className="space-y-4" />
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔍</div>
            <div className="neural-title text-neural-text-secondary">No topics found</div>
            <div className="text-sm text-neural-text-muted mt-2">
              Try adjusting your search or filters
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                isSelected={selectedTopic?.id === topic.id}
                onSelect={handleTopicSelect}
                onGenerate={handleGenerate}
              />
            ))}
            
            {hasMore && (
              <div className="text-center py-4">
                <NeuralButton
                  variant="outline"
                  onClick={loadMoreTopics}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </NeuralButton>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}