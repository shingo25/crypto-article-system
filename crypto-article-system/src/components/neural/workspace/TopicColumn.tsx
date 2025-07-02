'use client'

import React from 'react'
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

interface TopicCardProps {
  topic: any // useTopicsから取得するTopic型
  isSelected: boolean
  onSelect: (topic: any) => void
  onGenerate: (topic: any) => void
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

  return (
    <NeuralCard 
      className={cn(
        "group cursor-pointer neural-transition mb-4",
        isSelected && "ring-2 ring-neural-cyan shadow-lg shadow-neural-cyan/20"
      )}
      onClick={() => onSelect(topic)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <Badge className={cn("text-white border-0 text-xs", priorityColors[topic.priority] || 'neural-gradient-primary')}>
            <span className="mr-1">{priorityIcons[topic.priority] || '💡'}</span>
            {topic.priority?.toUpperCase() || 'MEDIUM'}
          </Badge>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-neural-elevated/30 rounded-full">
              <Target className="h-3 w-3 text-neural-cyan" />
              <span className="text-neural-cyan font-semibold text-xs">90</span>
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
        <h3 className="neural-title font-semibold mb-2 line-clamp-2 text-sm leading-tight group-hover:text-neural-cyan neural-transition">
          {topic.summary}
        </h3>

        {/* Coins */}
        <div className="flex flex-wrap gap-1 mb-3">
          {topic.coins?.slice(0, 3).map((coin: string) => (
            <div 
              key={coin} 
              className="flex items-center gap-1 px-2 py-1 bg-neural-surface rounded-full border border-neural-elevated/50"
            >
              <TrendingUp className="h-3 w-3 text-neural-success" />
              <span className="text-neural-text-secondary text-xs font-medium">{coin}</span>
            </div>
          ))}
          {topic.coins?.length > 3 && (
            <div className="px-2 py-1 bg-neural-elevated/30 rounded-full">
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

          <div className="flex items-center gap-1">
            
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
              Generate
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
  const filteredTopics = React.useMemo(() => {
    return topics.filter(topic => {
      const matchesSearch = !searchQuery || 
        topic.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.coins?.some((coin: string) => coin.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesPriority = topicFilter === 'all' || topic.priority === topicFilter

      return matchesSearch && matchesPriority
    })
  }, [topics, searchQuery, topicFilter])

  const handleTopicSelect = (topic: any) => {
    selectTopic(topic)
  }

  const handleGenerate = async (topic: any) => {
    selectTopic(topic)
    await startGeneration()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search & Filters */}
      <div className="p-4 space-y-3 border-b border-neural-elevated/20">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neural-text-muted" />
          <NeuralInput
            placeholder="Search topics, coins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
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
                topicFilter === priority ? 'all' : priority as any
              )}
            >
              {priority}
            </NeuralButton>
          ))}
        </div>
      </div>

      {/* Topics List */}
      <div className="flex-1 overflow-y-auto p-4">
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
          <>
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
          </>
        )}
      </div>
    </div>
  )
}