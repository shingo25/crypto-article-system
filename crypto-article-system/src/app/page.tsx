'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import SettingsPage from '@/components/SettingsPage'
import ArticleGenerationForm from '@/components/ArticleGenerationForm'
import MarketDashboard from '@/components/MarketDashboard'
import TenantDashboard from '@/components/TenantDashboard'
import ContentDistributionDashboard from '@/components/ContentDistributionDashboard'
import { useTopics } from '@/hooks/useTopics'
import { useArticles } from '@/hooks/useArticles'
import { useSystemStats } from '@/hooks/useSystemStats'
import { TopicList } from '@/components/TopicList'
import { ArticleList } from '@/components/ArticleList'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { 
  Search, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  Play, 
  Pause,
  RefreshCw,
  Download,
  Sparkles,
  Filter,
  SortAsc,
  FileText,
  Activity,
  Zap,
  Moon,
  Sun,
  Globe,
  Command,
  Layers,
  Shield,
  Cpu,
  Database,
  Wifi,
  Target,
  Brain,
  Layout,
  Menu,
  Send
} from 'lucide-react'

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const { 
    topics, 
    isLoading: topicsLoading, 
    loadMoreTopics, 
    hasMore: hasMoreTopics,
    filters,
    setFilters
  } = useTopics()
  
  const { 
    articles, 
    isLoading: articlesLoading,
    generateArticle
  } = useArticles()
  
  const { 
    stats, 
    isLoading: statsLoading,
    startSystem,
    stopSystem,
    collectTopics,
    isControlling,
    isCollecting
  } = useSystemStats()

  const isRunning = stats.systemStatus === 'running'

  const toggleTheme = () => setIsDarkMode(!isDarkMode)

  const StatCard = ({ icon: Icon, title, value, subtitle, gradient, textColor = "text-white", iconBg }) => (
    <div className={`relative overflow-hidden rounded-3xl p-6 group cursor-pointer transition-all duration-500 hover:scale-105 ${gradient}`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8 group-hover:scale-125 transition-transform duration-700"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-4 -translate-x-4 group-hover:scale-110 transition-transform duration-500"></div>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center group-hover:rotate-6 transition-transform duration-300`}>
            <Icon className={`h-6 w-6 ${textColor}`} />
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium opacity-80 ${textColor}`}>{title}</div>
            {statsLoading ? (
              <div className="h-8 w-16 bg-white/20 rounded-lg animate-pulse mt-1"></div>
            ) : (
              <div className={`text-3xl font-bold ${textColor} tracking-tight`}>{value}</div>
            )}
          </div>
        </div>
        {subtitle && (
          <div className={`text-sm ${textColor} opacity-70 font-medium`}>{subtitle}</div>
        )}
      </div>
      
      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-1000"></div>
      </div>
    </div>
  )

  const ActionButton = ({ onClick, disabled, variant, icon: Icon, children, className = "" }) => (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden flex items-center gap-2 font-semibold rounded-2xl px-6 py-3 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${className}`}
      variant={variant}
    >
      <Icon className="h-4 w-4 z-10" />
      <span className="z-10">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700"></div>
    </Button>
  )

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
            {/* Mobile Menu Button - Left Side */}
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
                  
                  {/* Mobile Search */}
                  <div className="mt-6">
                    <div className="relative w-full">
                      <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <Input
                        placeholder="Search topics, articles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`pl-12 pr-4 py-3 w-full rounded-2xl border-0 font-medium ${
                          isDarkMode 
                            ? 'bg-gray-800/60 text-white placeholder:text-gray-400 focus:bg-gray-800' 
                            : 'bg-gray-100/60 text-gray-900 placeholder:text-gray-500 focus:bg-white'
                        } backdrop-blur-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/20`}
                      />
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <div className="mt-8 space-y-4">
                    <div className="space-y-2">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Actions
                      </h3>
                      
                      <Button
                        onClick={() => { collectTopics(); setMobileMenuOpen(false); }}
                        disabled={isCollecting}
                        variant="default"
                        className="w-full justify-start bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                      >
                        {isCollecting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isCollecting ? 'Collecting...' : 'Collect Topics'}
                      </Button>
                      
                      <Button
                        onClick={() => { 
                          isRunning ? stopSystem() : startSystem(); 
                          setMobileMenuOpen(false); 
                        }}
                        disabled={isControlling}
                        variant={isRunning ? "destructive" : "default"}
                        className={`w-full justify-start ${
                          isRunning 
                            ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0" 
                            : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                        }`}
                      >
                        {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                        {isControlling ? 'Processing...' : (isRunning ? 'Stop System' : 'Start System')}
                      </Button>
                      
                      <Button
                        onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
                        variant="outline"
                        className={`w-full justify-start border-2 ${
                          isDarkMode 
                            ? 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600' 
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        {isDarkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo & Brand - Center on Mobile, Left on Desktop */}
            <div className="flex items-center gap-4 flex-1 md:flex-initial justify-center md:justify-start">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Brain className="h-7 w-7 text-white" />
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

            {/* Center Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <Input
                  placeholder="Search topics, articles, insights..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-12 pr-4 py-3 w-full rounded-2xl border-0 font-medium ${
                    isDarkMode 
                      ? 'bg-gray-800/60 text-white placeholder:text-gray-400 focus:bg-gray-800' 
                      : 'bg-gray-100/60 text-gray-900 placeholder:text-gray-500 focus:bg-white'
                  } backdrop-blur-sm transition-all duration-300 focus:ring-2 focus:ring-blue-500/20`}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <kbd className={`px-2 py-1 text-xs rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                    ⌘K
                  </kbd>
                </div>
              </div>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <ActionButton
                onClick={toggleTheme}
                variant="outline"
                icon={isDarkMode ? Sun : Moon}
                className={`border-2 ${
                  isDarkMode 
                    ? 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                {isDarkMode ? 'Light' : 'Dark'}
              </ActionButton>

              <ActionButton
                onClick={collectTopics}
                disabled={isCollecting}
                variant="default"
                icon={isCollecting ? RefreshCw : Download}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
              >
                {isCollecting ? 'Collecting...' : 'Collect'}
              </ActionButton>

              <ActionButton
                onClick={isRunning ? stopSystem : startSystem}
                disabled={isControlling}
                variant={isRunning ? "destructive" : "default"}
                icon={isRunning ? Pause : Play}
                className={isRunning 
                  ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0" 
                  : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                }
              >
                {isControlling ? 'Processing...' : (isRunning ? 'Stop' : 'Start')}
              </ActionButton>
            </div>

            {/* Mobile Status Indicator */}
            <div className="md:hidden">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                isRunning 
                  ? 'bg-green-500/10 border border-green-500/20' 
                  : 'bg-gray-500/10 border border-gray-500/20'
              }`}>
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
            <StatCard
              icon={Target}
              title="Articles Generated"
              value={stats.articlesGenerated}
              subtitle="This month"
              gradient="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500"
              iconBg="bg-white/20"
            />
            <StatCard
              icon={Database}
              title="Topics Collected"
              value={stats.topicsCollected}
              subtitle="Analyzed topics"
              gradient="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500"
              iconBg="bg-white/20"
            />
            <StatCard
              icon={Layout}
              title="Templates"
              value={stats.templatesCount || 4}
              subtitle="Active templates"
              gradient="bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500"
              iconBg="bg-white/20"
            />
            <StatCard
              icon={Cpu}
              title="System Status"
              value={stats.systemStatus === 'running' ? 'Active' : 'Idle'}
              subtitle={`Last run: ${new Date(stats.lastRun || Date.now()).toLocaleTimeString()}`}
              gradient="bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500"
              iconBg="bg-white/20"
            />
            <StatCard
              icon={Shield}
              title="Daily Quota"
              value={`${stats.dailyQuota.used}/${stats.dailyQuota.total}`}
              subtitle={`${stats.dailyQuota.total - stats.dailyQuota.used} remaining`}
              gradient="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500"
              iconBg="bg-white/20"
            />
          </div>

          {/* Enhanced Tabs */}
          <Tabs defaultValue="topics" className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <TabsList className={`grid grid-cols-3 sm:grid-cols-7 p-2 rounded-3xl w-full lg:w-auto ${
                isDarkMode 
                  ? 'bg-gray-800/50 border border-gray-700/50' 
                  : 'bg-white/80 border border-gray-300/50 shadow-lg'
              } backdrop-blur-xl`}>
                <TabsTrigger 
                  value="topics" 
                  className={`flex items-center justify-center gap-1 sm:gap-2 rounded-2xl px-2 sm:px-4 py-3 font-semibold transition-all duration-300 min-h-[44px] ${
                    isDarkMode 
                      ? 'text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white' 
                      : 'text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white hover:bg-gray-100'
                  }`}
                >
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline text-xs sm:text-sm">Topics</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="articles" 
                  className={`flex items-center justify-center gap-1 sm:gap-2 rounded-2xl px-2 sm:px-4 py-3 font-semibold transition-all duration-300 min-h-[44px] ${
                    isDarkMode 
                      ? 'text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white' 
                      : 'text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white hover:bg-gray-100'
                  }`}
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline text-xs sm:text-sm">Articles</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="generate" 
                  className={`flex items-center justify-center gap-1 sm:gap-2 rounded-2xl px-2 sm:px-4 py-3 font-semibold transition-all duration-300 min-h-[44px] ${
                    isDarkMode 
                      ? 'text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white' 
                      : 'text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white hover:bg-gray-100'
                  }`}
                >
                  <Sparkles className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline text-xs sm:text-sm">Generate</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="market" 
                  className={`flex items-center justify-center gap-1 sm:gap-2 rounded-2xl px-2 sm:px-4 py-3 font-semibold transition-all duration-300 min-h-[44px] ${
                    isDarkMode 
                      ? 'text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 data-[state=active]:text-white' 
                      : 'text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 data-[state=active]:text-white hover:bg-gray-100'
                  }`}
                >
                  <Activity className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline text-xs sm:text-sm">Market</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tenant" 
                  className={`flex items-center justify-center gap-1 sm:gap-2 rounded-2xl px-2 sm:px-4 py-3 font-semibold transition-all duration-300 min-h-[44px] ${
                    isDarkMode 
                      ? 'text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white' 
                      : 'text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white hover:bg-gray-100'
                  }`}
                >
                  <Layers className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline text-xs sm:text-sm">Tenant</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="distribution" 
                  className={`flex items-center justify-center gap-1 sm:gap-2 rounded-2xl px-2 sm:px-4 py-3 font-semibold transition-all duration-300 min-h-[44px] ${
                    isDarkMode 
                      ? 'text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white' 
                      : 'text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white hover:bg-gray-100'
                  }`}
                >
                  <Send className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline text-xs sm:text-sm">Dist</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className={`flex items-center justify-center gap-1 sm:gap-2 rounded-2xl px-2 sm:px-4 py-3 font-semibold transition-all duration-300 min-h-[44px] ${
                    isDarkMode 
                      ? 'text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-gray-700 data-[state=active]:text-white' 
                      : 'text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-gray-700 data-[state=active]:text-white hover:bg-gray-100'
                  }`}
                >
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline text-xs sm:text-sm">Settings</span>
                </TabsTrigger>
              </TabsList>

              {/* Quick Actions */}
              <div className="hidden lg:flex gap-2">
                <Button variant="outline" size="sm" className={`rounded-xl ${
                  isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-400 text-gray-600 hover:bg-gray-100 hover:border-gray-500'
                }`}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className={`rounded-xl ${
                  isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-400 text-gray-600 hover:bg-gray-100 hover:border-gray-500'
                }`}>
                  <SortAsc className="h-4 w-4 mr-2" />
                  Sort
                </Button>
              </div>
            </div>

            {/* Topic Monitoring */}
            <TabsContent value="topics" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} tracking-tight`}>
                    Real-time Topic Intelligence
                  </h2>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-700'} mt-2 text-lg font-medium`}>
                    AI-curated high-impact topics with live monitoring
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-green-500 font-semibold text-sm">Live</span>
                  </div>
                </div>
              </div>

              <div className={`rounded-3xl p-4 sm:p-8 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/30' 
                  : 'bg-gradient-to-br from-white/70 to-blue-50/50 border border-gray-300/40'
              } backdrop-blur-xl shadow-2xl`}>
                <TopicList
                  topics={topics.filter(topic => 
                    topic.title.toLowerCase().includes(searchQuery.toLowerCase())
                  )}
                  isLoading={topicsLoading}
                  hasMore={hasMoreTopics}
                  onLoadMore={loadMoreTopics}
                  getPriorityColor={(priority) => {
                    switch (priority) {
                      case 'urgent': return 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                      case 'high': return 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg'
                      case 'medium': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      case 'low': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg'
                    }
                  }}
                />
              </div>
            </TabsContent>

            {/* Article Management */}
            <TabsContent value="articles" className="space-y-6">
              <div>
                <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} tracking-tight`}>
                  Content Management Hub
                </h2>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-700'} mt-2 text-lg font-medium`}>
                  Manage, edit, and publish your AI-generated content
                </p>
              </div>

              <div className={`rounded-3xl p-4 sm:p-8 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/30' 
                  : 'bg-gradient-to-br from-white/70 to-blue-50/50 border border-gray-300/40'
              } backdrop-blur-xl shadow-2xl`}>
                <ArticleList
                  articles={articles}
                  isLoading={articlesLoading}
                />
              </div>
            </TabsContent>

            {/* AI Generation Studio */}
            <TabsContent value="generate" className="space-y-6">
              <div>
                <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} tracking-tight`}>
                  AI Generation Studio
                </h2>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-700'} mt-2 text-lg font-medium`}>
                  Advanced AI configuration for optimal content creation
                </p>
              </div>

              <div className={`rounded-3xl p-4 sm:p-8 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/30' 
                  : 'bg-gradient-to-br from-white/70 to-blue-50/50 border border-gray-300/40'
              } backdrop-blur-xl shadow-2xl`}>
                <ArticleGenerationForm 
                  topics={topics}
                  onGenerate={generateArticle}
                />
              </div>
            </TabsContent>

            {/* Market Analysis */}
            <TabsContent value="market" className="space-y-6">
              <MarketDashboard />
            </TabsContent>

            {/* Tenant Management */}
            <TabsContent value="tenant" className="space-y-6">
              <TenantDashboard />
            </TabsContent>

            {/* Content Distribution */}
            <TabsContent value="distribution" className="space-y-6">
              <ContentDistributionDashboard />
            </TabsContent>

            {/* Settings */}
            <TabsContent value="settings" className="space-y-6">
              <SettingsPage />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}