'use client'

import React, { useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInView } from 'react-intersection-observer'
import { useArticles } from '@/hooks/useArticles'
import { LoadingSkeleton } from './LoadingSkeleton'
import { Sparkles, ExternalLink, Clock, TrendingUp, Zap, Target } from 'lucide-react'

interface Topic {
  id: string
  title: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  score: number
  coins: string[]
  collectedAt: string
  source?: string
  sourceUrl?: string
}

interface TopicListProps {
  topics: Topic[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  getPriorityColor: (priority: string) => string
}

const TopicCard = React.memo(({ 
  topic, 
  onGenerateArticle, 
  isGenerating, 
  getPriorityColor 
}: {
  topic: Topic
  onGenerateArticle: (topicId: string) => void
  isGenerating: boolean
  getPriorityColor: (priority: string) => string
}) => {
  const handleGenerate = useCallback(() => {
    onGenerateArticle(topic.id)
  }, [topic.id, onGenerateArticle])

  const priorityIcons = {
    urgent: '🚨',
    high: '⚡',
    medium: '📊',
    low: '📈'
  }

  return (
    <div className="group relative">
      {/* Glow effect on hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-0 group-hover:opacity-75 transition duration-500"></div>
      
      <Card className="relative bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700/50 backdrop-blur-xl transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-2xl rounded-3xl overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-700"></div>
        
        <CardContent className="p-6 relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <Badge className={`${getPriorityColor(topic.priority)} px-3 py-1 rounded-full font-semibold text-sm flex items-center gap-1`}>
                <span>{priorityIcons[topic.priority as keyof typeof priorityIcons]}</span>
                {topic.priority.toUpperCase()}
              </Badge>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                <Target className="h-3 w-3 text-blue-400" />
                <span className="text-blue-400 font-semibold text-sm">{Math.round(topic.score)}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                {new Date(topic.collectedAt).toLocaleTimeString('ja-JP', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-white font-semibold mb-4 line-clamp-2 leading-relaxed text-lg group-hover:text-blue-300 transition-colors duration-300">
            {topic.title}
          </h3>
          
          {/* Coins */}
          <div className="flex flex-wrap gap-2 mb-4">
            {topic.coins.map(coin => (
              <div key={coin} className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-full">
                <TrendingUp className="h-3 w-3 text-cyan-400" />
                <span className="text-cyan-400 font-medium text-sm">{coin}</span>
              </div>
            ))}
          </div>
          
          {/* Footer */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {topic.source && topic.sourceUrl ? (
                <a 
                  href={topic.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-400 hover:text-white text-sm font-medium">{topic.source}</span>
                </a>
              ) : topic.source && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-700/50 rounded-xl">
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-400 text-sm font-medium">{topic.source}</span>
                </div>
              )}
            </div>
            
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              size="sm"
              className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-2xl px-6 py-2 font-semibold transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl"
            >
              <div className="flex items-center gap-2 relative z-10">
                {isGenerating ? (
                  <Zap className="h-4 w-4 animate-pulse" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate'}
              </div>
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700"></div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

TopicCard.displayName = 'TopicCard'

export function TopicList({ 
  topics, 
  isLoading, 
  hasMore, 
  onLoadMore, 
  getPriorityColor 
}: TopicListProps) {
  const { generateArticle, isGenerating } = useArticles()
  
  const { ref, inView } = useInView({
    threshold: 0,
    onChange: (inView) => {
      if (inView && hasMore && !isLoading) {
        onLoadMore()
      }
    },
  })

  if (isLoading && topics.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-600 to-gray-700 rounded-3xl blur opacity-30 animate-pulse"></div>
            <div className="relative space-y-4 p-6 bg-gray-800/60 rounded-3xl border border-gray-700/50">
              <div className="flex justify-between">
                <LoadingSkeleton className="h-6 w-20 rounded-full" />
                <LoadingSkeleton className="h-4 w-16 rounded-lg" />
              </div>
              <LoadingSkeleton className="h-5 w-full rounded-lg" />
              <LoadingSkeleton className="h-4 w-3/4 rounded-lg" />
              <div className="flex gap-2">
                <LoadingSkeleton className="h-6 w-12 rounded-full" />
                <LoadingSkeleton className="h-6 w-12 rounded-full" />
              </div>
              <div className="flex justify-between items-center">
                <LoadingSkeleton className="h-6 w-16 rounded-xl" />
                <LoadingSkeleton className="h-8 w-24 rounded-2xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
          <div className="text-4xl">📭</div>
        </div>
        <div className="text-white text-2xl font-bold mb-2">No Topics Found</div>
        <div className="text-gray-400 text-lg mb-6">Start the system to begin collecting topics</div>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl px-8 py-3 font-semibold">
          <Sparkles className="h-4 w-4 mr-2" />
          Start Collection
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            onGenerateArticle={generateArticle}
            isGenerating={isGenerating}
            getPriorityColor={getPriorityColor}
          />
        ))}
      </div>

      {/* Load more section */}
      {hasMore && (
        <div ref={ref} className="flex justify-center py-8">
          {isLoading ? (
            <div className="flex items-center gap-3 px-6 py-3 bg-gray-800/50 rounded-2xl border border-gray-700/50">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-300 font-medium">Loading more topics...</span>
            </div>
          ) : (
            <Button
              onClick={onLoadMore}
              variant="outline"
              className="bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-2xl px-8 py-3 font-semibold transition-all duration-300"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Load More Topics
            </Button>
          )}
        </div>
      )}
    </div>
  )
}