'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Settings,
  Globe,
  Sparkles,
  Activity,
  AlertTriangle,
  Send,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Eye,
  Edit,
  PieChart
} from 'lucide-react'

// マーケット情報駆動型ナビゲーション構造
const NEURAL_NAVIGATION = [
  {
    id: 'market',
    label: 'Market',
    icon: BarChart3,
    href: '/market',
    description: 'Market monitoring and discovery',
    children: [
      { id: 'overview', label: 'Overview', icon: Eye, href: '/market' },
      { id: 'news', label: 'News Feed', icon: Activity, href: '/market/news' },
      { id: 'alerts', label: 'Price Alerts', icon: AlertTriangle, href: '/market/alerts' }
    ]
  },
  {
    id: 'content',
    label: 'Content',
    icon: FileText,
    href: '/content',
    description: 'Article generation and management',
    children: [
      { id: 'workspace', label: 'Workspace', icon: Edit, href: '/content/workspace' },
      { id: 'articles', label: 'Articles', icon: FileText, href: '/content/articles' },
      { id: 'templates', label: 'Templates', icon: Sparkles, href: '/content/templates' }
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: TrendingUp,
    href: '/analytics',
    description: 'Performance analysis and insights',
    children: [
      { id: 'performance', label: 'Performance', icon: PieChart, href: '/analytics/performance' },
      { id: 'trends', label: 'Market Trends', icon: Activity, href: '/analytics/trends' }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    description: 'System and account configuration'
  }
] as const

interface NeuralLayoutProps {
  children: React.ReactNode
  currentPath?: string
}

export function NeuralLayout({ children, currentPath }: NeuralLayoutProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  
  // 現在のパスから適切なセクションを決定
  const getActiveSection = () => {
    if (pathname?.startsWith('/market')) return 'market'
    if (pathname?.startsWith('/content')) return 'content'
    if (pathname?.startsWith('/analytics')) return 'analytics'
    if (pathname?.startsWith('/settings')) return 'settings'
    // 旧パスの互換性対応
    if (pathname?.startsWith('/dashboard')) return 'market'
    if (pathname?.startsWith('/workspace')) return 'content'
    return 'market'
  }
  
  const activeSection = getActiveSection()

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Neural Aurora Background */}
      <div className="neural-aurora" />
      
      {/* Header */}
      <div className="p-6 border-b border-neural-elevated/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 neural-neumorphic flex items-center justify-center">
            <div className="text-2xl">🧠</div>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="neural-title text-lg">CryptoAI Pro</h1>
              <p className="text-xs text-neural-text-secondary">Neural Genesis</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {NEURAL_NAVIGATION.map((item) => (
          <div key={item.id}>
            <Link href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start h-12 neural-transition",
                  isCollapsed ? "px-3" : "px-4",
                  activeSection === item.id && "neural-gradient-primary text-white"
                )}
              >
                <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-neural-text-muted">{item.description}</div>
                    )}
                  </div>
                )}
              </Button>
            </Link>
            
            {/* Submenu */}
            {!isCollapsed && item.children && activeSection === item.id && (
              <div className="ml-6 mt-2 space-y-1">
                {item.children.map((child) => (
                  <Link key={child.id} href={child.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-neural-text-secondary hover:text-neural-cyan"
                    >
                      <child.icon className="h-4 w-4 mr-2" />
                      {child.label}
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-neural-elevated/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full neural-button"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!isCollapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-neural-void text-neural-text-primary">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-neural-surface/80 backdrop-blur-xl border-r border-neural-elevated/50 neural-transition hidden lg:block",
          isCollapsed ? "w-20" : "w-80"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-80 bg-neural-surface/95 backdrop-blur-xl border-r border-neural-elevated/50 neural-transition lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-neural-elevated/50">
          <h2 className="neural-title">Menu</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(false)}
            className="neural-button"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-neural-void/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className={cn(
          "neural-transition",
          isCollapsed ? "lg:ml-20" : "lg:ml-80"
        )}
      >
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-neural-surface/80 backdrop-blur-xl border-b border-neural-elevated/50 p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileOpen(true)}
              className="neural-button"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="neural-title text-lg">CryptoAI Pro</h1>
            <div className="w-8" /> {/* Spacer */}
          </div>
        </header>

        {/* Page Content */}
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}