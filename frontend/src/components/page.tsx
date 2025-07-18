'use client'

// 動的レンダリングを強制（プリレンダリングエラー回避）
export const dynamic = 'force-dynamic'

import React, { useState } from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { NeuralButton } from '@/components/neural/NeuralButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  Activity,
  Target,
  Zap,
  FileText,
  Globe,
  Filter,
  Download
} from 'lucide-react'
import MarketDashboard from '@/components/MarketDashboard'

// パフォーマンス統計コンポーネント
const PerformanceStats = () => {
  const stats = [
    {
      label: 'Generated Articles',
      value: '247',
      change: '+12%',
      trend: 'up',
      icon: FileText,
      color: 'text-neural-cyan'
    },
    {
      label: 'Average SEO Score',
      value: '87.3',
      change: '+5.2%',
      trend: 'up',
      icon: Target,
      color: 'text-neural-success'
    },
    {
      label: 'Publishing Rate',
      value: '94%',
      change: '+2.1%',
      trend: 'up',
      icon: Zap,
      color: 'text-neural-warning'
    },
    {
      label: 'Active Topics',
      value: '156',
      change: '-3%',
      trend: 'down',
      icon: Activity,
      color: 'text-neural-orchid'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <NeuralCard key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 neural-neumorphic-inset rounded-lg">
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold neural-title">{stat.value}</div>
                    <div className="text-xs text-neural-text-secondary">{stat.label}</div>
                  </div>
                </div>
                <Badge 
                  className={`text-xs border-0 ${
                    stat.trend === 'up' ? 'neural-gradient-success' : 'neural-gradient-error'
                  } text-white`}
                >
                  {stat.change}
                </Badge>
              </div>
            </CardContent>
          </NeuralCard>
        )
      })}
    </div>
  )
}

// 記事パフォーマンス分析
const ArticlePerformance = () => {
  const articles = [
    {
      title: 'Bitcoin市場分析 - 2025年Q1レポート',
      views: '12.5K',
      engagement: '89%',
      seoScore: 94,
      publishedAt: '2025-01-15',
      status: 'published'
    },
    {
      title: 'Ethereum DeFiエコシステムの展望',
      views: '8.7K',
      engagement: '76%',
      seoScore: 87,
      publishedAt: '2025-01-14',
      status: 'published'
    },
    {
      title: 'アルトコイン投資戦略ガイド',
      views: '15.2K',
      engagement: '92%',
      seoScore: 91,
      publishedAt: '2025-01-13',
      status: 'published'
    }
  ]

  return (
    <NeuralCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-neural-cyan" />
          Top Performing Articles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {articles.map((article, index) => (
            <div key={index} className="p-3 neural-neumorphic-inset rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium neural-title text-sm line-clamp-1 flex-1">
                  {article.title}
                </h4>
                <Badge className="neural-gradient-success text-white border-0 text-xs ml-2">
                  #{index + 1}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-neural-text-muted">Views</div>
                  <div className="font-semibold neural-title">{article.views}</div>
                </div>
                <div>
                  <div className="text-neural-text-muted">Engagement</div>
                  <div className="font-semibold neural-title">{article.engagement}</div>
                </div>
                <div>
                  <div className="text-neural-text-muted">SEO Score</div>
                  <div className="font-semibold neural-title">{article.seoScore}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2 text-xs text-neural-text-muted">
                <span>Published {article.publishedAt}</span>
                <span className="text-neural-success">Published</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </NeuralCard>
  )
}

// 時系列チャート（シンプル版）
const TimeSeriesChart = () => {
  return (
    <NeuralCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-neural-cyan" />
          Article Generation Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center neural-neumorphic-inset rounded-lg">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-neural-text-muted" />
            <div className="neural-title text-neural-text-secondary">Chart Visualization</div>
            <div className="text-sm text-neural-text-muted mt-2">
              Integration with charting library coming soon
            </div>
          </div>
        </div>
      </CardContent>
    </NeuralCard>
  )
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold neural-title neural-glow-text mb-2">
              Analytics
            </h1>
            <p className="text-neural-text-secondary">
              Performance insights and market analysis
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <NeuralButton variant="ghost" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </NeuralButton>
            <NeuralButton variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </NeuralButton>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 neural-neumorphic mb-6">
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-2 data-[state=active]:bg-neural-elevated/20 data-[state=active]:text-neural-cyan"
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="articles" 
            className="flex items-center gap-2 data-[state=active]:bg-neural-elevated/20 data-[state=active]:text-neural-cyan"
          >
            <FileText className="h-4 w-4" />
            Articles
          </TabsTrigger>
          <TabsTrigger 
            value="market" 
            className="flex items-center gap-2 data-[state=active]:bg-neural-elevated/20 data-[state=active]:text-neural-cyan"
          >
            <Globe className="h-4 w-4" />
            Market
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PerformanceStats />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimeSeriesChart />
            <ArticlePerformance />
          </div>
        </TabsContent>

        <TabsContent value="articles" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TimeSeriesChart />
            </div>
            <ArticlePerformance />
          </div>
          
          <NeuralCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-neural-cyan" />
                Article Analytics Details
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="text-4xl mb-4">📈</div>
              <div className="neural-title text-neural-text-secondary">Detailed Article Analytics</div>
              <div className="text-sm text-neural-text-muted mt-2">
                Advanced article performance metrics and insights
              </div>
            </CardContent>
          </NeuralCard>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <div className="neural-neumorphic-inset rounded-lg p-6">
            <MarketDashboard />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}