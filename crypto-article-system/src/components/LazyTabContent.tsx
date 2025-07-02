import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { LoadingSkeleton } from './LoadingSkeleton'

// 動的インポートでタブコンテンツを遅延読み込み
const TopicList = dynamic(() => import('./TopicList').then(mod => ({ default: mod.TopicList })), {
  loading: () => <LoadingSkeleton count={6} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" />,
  ssr: false
})

const ArticleList = dynamic(() => import('./ArticleList'), {
  loading: () => <LoadingSkeleton count={4} className="space-y-4" />,
  ssr: false
})

const ArticleGenerationForm = dynamic(() => import('./ArticleGenerationForm'), {
  loading: () => <LoadingSkeleton count={1} className="h-96" />,
  ssr: false
})

const MarketDashboard = dynamic(() => import('./MarketDashboard'), {
  loading: () => <LoadingSkeleton count={8} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" />,
  ssr: false
})

const TenantDashboard = dynamic(() => import('./TenantDashboard'), {
  loading: () => <LoadingSkeleton count={6} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" />,
  ssr: false
})

const ContentDistributionDashboard = dynamic(() => import('./ContentDistributionDashboard'), {
  loading: () => <LoadingSkeleton count={4} className="space-y-6" />,
  ssr: false
})

const SettingsPage = dynamic(() => import('./SettingsPage'), {
  loading: () => <LoadingSkeleton count={8} className="space-y-4" />,
  ssr: false
})

interface LazyTabContentProps {
  activeTab: string
  topics: any[]
  articles: any[]
  isDarkMode: boolean
  topicsLoading: boolean
  articlesLoading: boolean
  hasMoreTopics: boolean
  loadMoreTopics: () => void
  getPriorityColor: (priority: string) => string
  generateArticle: (topicId: string) => void
  searchQuery: string
}

export const LazyTabContent = React.memo<LazyTabContentProps>(({
  activeTab,
  topics,
  articles,
  isDarkMode,
  topicsLoading,
  articlesLoading,
  hasMoreTopics,
  loadMoreTopics,
  getPriorityColor,
  generateArticle,
  searchQuery
}) => {
  const contentProps = React.useMemo(() => ({
    topics: (topics || []).filter(topic => 
      topic?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    isDarkMode,
    topicsLoading,
    articlesLoading,
    hasMoreTopics,
    loadMoreTopics,
    getPriorityColor,
    generateArticle,
    articles
  }), [topics, articles, isDarkMode, topicsLoading, articlesLoading, hasMoreTopics, loadMoreTopics, getPriorityColor, generateArticle, searchQuery])

  const renderContent = () => {
    switch (activeTab) {
      case 'topics':
        return (
          <Suspense fallback={<LoadingSkeleton count={6} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" />}>
            <TopicList
              topics={contentProps.topics}
              isLoading={contentProps.topicsLoading}
              hasMore={contentProps.hasMoreTopics}
              onLoadMore={contentProps.loadMoreTopics}
              isDarkMode={contentProps.isDarkMode}
              getPriorityColor={contentProps.getPriorityColor}
            />
          </Suspense>
        )
      case 'articles':
        return (
          <Suspense fallback={<LoadingSkeleton count={4} className="space-y-4" />}>
            <ArticleList articles={contentProps.articles} isLoading={contentProps.articlesLoading} />
          </Suspense>
        )
      case 'generate':
        return (
          <Suspense fallback={<LoadingSkeleton count={1} className="h-96" />}>
            <ArticleGenerationForm topics={contentProps.topics} onGenerate={contentProps.generateArticle} />
          </Suspense>
        )
      case 'market':
        return (
          <Suspense fallback={<LoadingSkeleton count={8} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" />}>
            <MarketDashboard />
          </Suspense>
        )
      case 'tenant':
        return (
          <Suspense fallback={<LoadingSkeleton count={6} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" />}>
            <TenantDashboard />
          </Suspense>
        )
      case 'distribution':
        return (
          <Suspense fallback={<LoadingSkeleton count={4} className="space-y-6" />}>
            <ContentDistributionDashboard />
          </Suspense>
        )
      case 'settings':
        return (
          <Suspense fallback={<LoadingSkeleton count={8} className="space-y-4" />}>
            <SettingsPage />
          </Suspense>
        )
      default:
        return null
    }
  }

  return (
    <div className={`rounded-3xl p-4 sm:p-8 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/30' 
        : 'bg-gradient-to-br from-white/90 to-blue-50/60 border border-gray-200/50 shadow-xl'
    } backdrop-blur-xl`}>
      {renderContent()}
    </div>
  )
})

LazyTabContent.displayName = 'LazyTabContent'