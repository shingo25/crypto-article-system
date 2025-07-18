'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Tabs, TabsList, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useSystemStats } from '@/hooks/useSystemStats'
import { OptimizedTabTrigger } from '@/components/OptimizedTabTrigger'
import { OptimizedStatCard } from '@/components/OptimizedStatCard'
import { LazyTabContent } from '@/components/LazyTabContent'
import {
  Globe, FileText, Sparkles, Activity, Layers, Send, Settings,
  Target, Database, Layout, Cpu, Shield, Menu, Search, Sun, Moon,
  Download, Play, Pause, RefreshCw
} from 'lucide-react'

// タブ設定の定数化
const TAB_CONFIG = [
  { value: 'topics', icon: Globe, label: 'Topics', gradientColors: { from: 'blue-600', to: 'purple-600' } },
  { value: 'articles', icon: FileText, label: 'Articles', gradientColors: { from: 'emerald-600', to: 'teal-600' } },
  { value: 'generate', icon: Sparkles, label: 'Generate', gradientColors: { from: 'purple-600', to: 'pink-600' } },
  { value: 'market', icon: Activity, label: 'Market', gradientColors: { from: 'cyan-600', to: 'blue-600' } },
  { value: 'tenant', icon: Layers, label: 'Tenant', gradientColors: { from: 'indigo-600', to: 'purple-600' } },
  { value: 'distribution', icon: Send, label: 'Dist', gradientColors: { from: 'emerald-600', to: 'teal-600' } },
  { value: 'settings', icon: Settings, label: 'Settings', gradientColors: { from: 'gray-600', to: 'gray-700' } }
] as const

// 統計カード設定
const STAT_CARDS = [
  {
    icon: Target,
    title: "Articles Generated",
    key: "articlesGenerated",
    subtitle: "This month",
    gradient: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500",
    iconBg: "bg-white/20"
  },
  {
    icon: Database,
    title: "Topics Collected", 
    key: "topicsCollected",
    subtitle: "Analyzed topics",
    gradient: "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500",
    iconBg: "bg-white/20"
  },
  {
    icon: Layout,
    title: "Templates",
    key: "templatesCount",
    subtitle: "Active templates",
    gradient: "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500", 
    iconBg: "bg-white/20",
    fallbackValue: 4
  },
  {
    icon: Cpu,
    title: "System Status",
    key: "systemStatus",
    subtitle: "Last run:",
    gradient: "bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500",
    iconBg: "bg-white/20"
  },
  {
    icon: Shield,
    title: "Daily Quota",
    key: "dailyQuota", 
    subtitle: "50 remaining",
    gradient: "bg-gradient-to-br from-orange-500 via-red-500 to-pink-500",
    iconBg: "bg-white/20",
    fallbackValue: "Active"
  }
] as const

export default function OptimizedHomePage() {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('topics')

  const {
    stats,
    topics,
    articles,
    isLoading: statsLoading,
    topicsLoading,
    articlesLoading,
    hasMoreTopics,
    loadMoreTopics,
    startSystem,
    stopSystem,
    collectTopics,
    isControlling,
    isCollecting
  } = useSystemStats()

  const isRunning = stats.systemStatus === 'running'

  // メモ化されたコールバック
  const toggleTheme = useCallback(() => setIsDarkMode(!isDarkMode), [isDarkMode])
  const handleTabChange = useCallback((value: string) => setActiveTab(value), [])
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  //優先度カラー関数をメモ化
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
      case 'high': return 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg'
      case 'medium': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
      case 'low': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg'
    }
  }, [])

  // 統計カードデータをメモ化
  const statCardsData = useMemo(() => 
    STAT_CARDS.map(card => ({
      ...card,
      value: card.key === 'systemStatus' 
        ? (stats.systemStatus === 'running' ? 'Active' : 'Idle')
        : card.key === 'templatesCount' && !stats[card.key]
          ? card.fallbackValue
          : stats[card.key] || card.fallbackValue || 'N/A',
      subtitle: card.key === 'systemStatus'
        ? `Last run: ${new Date(stats.lastRun || Date.now()).toLocaleTimeString()}`
        : card.subtitle
    }))
  , [stats])

  return (
    <div className={`min-h-screen transition-all duration-700 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
    }`}>
      {/* Animated background pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 left-20 w-72 h-72 rounded-full ${isDarkMode ? 'bg-blue-500/5' : 'bg-blue-500/8'} blur-3xl animate-pulse`}></div>
        <div className={`absolute bottom-20 right-20 w-96 h-96 rounded-full ${isDarkMode ? 'bg-purple-500/5' : 'bg-purple-500/8'} blur-3xl animate-pulse delay-1000`}></div>
        <div className={`absolute top-1/2 left-1/2 w-64 h-64 rounded-full ${isDarkMode ? 'bg-cyan-500/5' : 'bg-cyan-500/8'} blur-3xl animate-pulse delay-500`}></div>
      </div>

      {/* Modern Navbar */}
      <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gray-900/80 border-gray-800/50' 
          : 'bg-white/90 border-gray-300/30 shadow-lg'
      } backdrop-blur-2xl border-b`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`p-2 border-2 ${
                      isDarkMode 
                        ? 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className={`w-80 ${
                  isDarkMode 
                    ? 'bg-gray-900 border-gray-800' 
                    : 'bg-white border-gray-200'
                }`}>
                  <SheetHeader>
                    <SheetTitle className={`text-left ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      CryptoAI Pro
                    </SheetTitle>
                  </SheetHeader>
                  {/* Mobile menu content here */}
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo */}
            <div className="flex items-center gap-4 flex-1 md:flex-initial justify-center md:justify-start">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <div className="text-white font-bold text-xl">🧠</div>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>
                  CryptoAI Pro
                </h1>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>
                  Next-Gen Article Intelligence
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search topics, articles, insights..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className={`pl-12 pr-4 py-3 w-full rounded-2xl border-0 font-medium ${
                    isDarkMode 
                      ? 'bg-gray-800/60 text-white placeholder:text-gray-400 focus:bg-gray-800' 
                      : 'bg-gray-100/60 text-gray-900 placeholder:text-gray-500 focus:bg-white'
                  } backdrop-blur-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/20`}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <kbd className="px-2 py-1 text-xs rounded-lg bg-gray-700 text-gray-300">⌘K</kbd>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                onClick={toggleTheme}
                variant="outline"
                className={`rounded-2xl border-2 ${
                  isDarkMode 
                    ? 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                {isDarkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {isDarkMode ? 'Light' : 'Dark'}
              </Button>
              
              <Button
                onClick={collectTopics}
                disabled={isCollecting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-2xl"
              >
                {isCollecting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {isCollecting ? 'Collecting...' : 'Collect'}
              </Button>
              
              <Button
                onClick={isRunning ? stopSystem : startSystem}
                disabled={isControlling}
                className={`rounded-2xl border-0 ${
                  isRunning 
                    ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600" 
                    : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                } text-white`}
              >
                {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isControlling ? 'Processing...' : (isRunning ? 'Stop' : 'Start')}
              </Button>
            </div>

            {/* Status Indicator */}
            <div className="md:hidden">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-500/10 border border-gray-500/20">
                <div className={`w-2 h-2 rounded-full ${
                  isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                }`}></div>
                <span className={`text-xs font-semibold ${
                  isRunning ? 'text-green-500' : 'text-gray-500'
                }`}>
                  {isRunning ? 'Active' : 'Idle'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 mb-8">
            {statCardsData.map((card, index) => (
              <OptimizedStatCard
                key={index}
                icon={card.icon}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                gradient={card.gradient}
                iconBg={card.iconBg}
                isLoading={statsLoading}
              />
            ))}
          </div>

          {/* Enhanced Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <TabsList className={`grid grid-cols-3 sm:grid-cols-7 p-2 rounded-3xl w-full lg:w-auto ${
                isDarkMode 
                  ? 'bg-gray-800/50 border border-gray-700/50' 
                  : 'bg-white/90 border border-gray-200/70 shadow-xl'
              } backdrop-blur-xl`}>
                {TAB_CONFIG.map(tab => (
                  <OptimizedTabTrigger
                    key={tab.value}
                    value={tab.value}
                    icon={tab.icon}
                    label={tab.label}
                    isDarkMode={isDarkMode}
                    gradientColors={tab.gradientColors}
                  />
                ))}
              </TabsList>
            </div>

            {/* Tab Content */}
            {TAB_CONFIG.map(tab => (
              <TabsContent key={tab.value} value={tab.value} className="space-y-6">
                <div>
                  <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} tracking-tight`}>
                    {getTabTitle(tab.value)}
                  </h2>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-700'} mt-2 text-lg font-medium`}>
                    {getTabSubtitle(tab.value)}
                  </p>
                </div>

                <LazyTabContent
                  activeTab={activeTab}
                  topics={topics}
                  articles={articles}
                  isDarkMode={isDarkMode}
                  topicsLoading={topicsLoading}
                  articlesLoading={articlesLoading}
                  hasMoreTopics={hasMoreTopics}
                  loadMoreTopics={loadMoreTopics}
                  getPriorityColor={getPriorityColor}
                  generateArticle={() => {}} // TODO: implement
                  searchQuery={searchQuery}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// ヘルパー関数
function getTabTitle(value: string): string {
  const titles = {
    topics: 'Real-time Topic Intelligence',
    articles: 'Content Management Hub',
    generate: 'AI Generation Studio',
    market: 'Market Analysis Dashboard',
    tenant: 'Tenant Management',
    distribution: 'Content Distribution',
    settings: 'System Settings'
  }
  return titles[value] || 'Dashboard'
}

function getTabSubtitle(value: string): string {
  const subtitles = {
    topics: 'AI-curated high-impact topics with live monitoring',
    articles: 'Manage, edit, and publish your AI-generated content',
    generate: 'Advanced AI configuration for optimal content creation',
    market: 'Real-time cryptocurrency market insights and analysis',
    tenant: 'Multi-tenant configuration and white-label management',
    distribution: 'Multi-channel content distribution and analytics',
    settings: 'System configuration and performance tuning'
  }
  return subtitles[value] || 'Manage your content and system'
}