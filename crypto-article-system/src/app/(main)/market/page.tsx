'use client'

// 動的レンダリングを強制（プリレンダリングエラー回避）
export const dynamic = 'force-dynamic'

import React from 'react'
import { MarketPulse } from '@/components/neural/market/MarketPulse'
import { ContentPipeline } from '@/components/neural/market/ContentPipeline'
import { SystemStatusBar } from '@/components/neural/market/SystemStatusBar'

export default function MarketOverviewPage() {
  return (
    <div className="min-h-screen bg-neural-void">
      {/* Aurora Background */}
      <div className="neural-aurora" />
      
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold neural-title neural-glow-text mb-2">
                Market Overview
              </h1>
              <p className="text-neural-text-secondary text-sm lg:text-base">
                Real-time market intelligence for content creation
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-neural-elevated/20 rounded-lg border border-neural-elevated/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-neural-success rounded-full animate-pulse"></div>
                  <span className="text-xs text-neural-text-secondary">Live Data</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* System Status Bar */}
        <div className="mb-6">
          <SystemStatusBar />
        </div>
        
        {/* Main Content Layout - Market Pulse Full Width */}
        <div className="mb-6 lg:mb-8">
          <MarketPulse />
        </div>
        
        {/* Content Pipeline - Bottom Section */}
        <div className="mt-8 pt-6 border-t border-neural-elevated/20">
          <div className="mb-4">
            <h2 className="text-lg font-semibold neural-title mb-2">
              コンテンツ管理
            </h2>
            <p className="text-sm text-neural-text-secondary">
              記事生成とパフォーマンス監視
            </p>
          </div>
          <ContentPipeline />
        </div>
        
        {/* Mobile Layout Optimization */}
        <div className="block lg:hidden mt-6 p-4 bg-neural-surface/50 rounded-lg border border-neural-elevated/30">
          <p className="text-xs text-neural-text-muted text-center">
            💡 Tip: Rotate your device for the best experience
          </p>
        </div>
      </div>
    </div>
  )
}