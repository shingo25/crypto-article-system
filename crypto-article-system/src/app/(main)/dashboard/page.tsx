'use client'

import React from 'react'
import { SystemMonitoringNeural } from '@/components/neural/dashboard/SystemMonitoringNeural'
import { MarketDataNeural } from '@/components/neural/dashboard/MarketDataNeural'
import { GenerationStatusNeural } from '@/components/neural/dashboard/GenerationStatusNeural'
import { APIHealthNeural } from '@/components/neural/dashboard/APIHealthNeural'

export default function DashboardPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold neural-title neural-glow-text mb-2">
          Neural Dashboard
        </h1>
        <p className="text-neural-text-secondary">
          System overview and real-time analytics
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* System Health Monitoring */}
        <div className="xl:col-span-2">
          <SystemMonitoringNeural />
        </div>
        
        {/* API Health Status */}
        <APIHealthNeural />
        
        {/* Generation Status */}
        <GenerationStatusNeural />
        
        {/* Market Data Widget - spans 2 columns on larger screens */}
        <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
          <MarketDataNeural />
        </div>
      </div>
    </div>
  )
}