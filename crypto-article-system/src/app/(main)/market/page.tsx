'use client'

import React from 'react'
import { MarketPulse } from '@/components/neural/market/MarketPulse'
import { ContentPipeline } from '@/components/neural/market/ContentPipeline'
import { SystemStatusBar } from '@/components/neural/market/SystemStatusBar'

export default function MarketOverviewPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold neural-title neural-glow-text mb-2">
          Market Overview
        </h1>
        <p className="text-neural-text-secondary">
          Real-time market intelligence for content creation
        </p>
      </div>
      
      {/* System Status Bar */}
      <SystemStatusBar />
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-6 mt-6">
        {/* Market Pulse - Main Area (70%) */}
        <div className="xl:col-span-7">
          <MarketPulse />
        </div>
        
        {/* Content Pipeline - Sidebar (30%) */}
        <div className="xl:col-span-3 space-y-6">
          <ContentPipeline />
        </div>
      </div>
    </div>
  )
}