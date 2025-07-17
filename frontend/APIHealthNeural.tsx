'use client'

import React from 'react'
import { NeuralCard, CardContent, CardHeader, CardTitle } from '@/components/neural/NeuralCard'
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// モックデータ - 実際のAPIに置き換え予定
const mockAPIHealth = {
  overall: 'healthy',
  lastCheck: new Date().toISOString(),
  endpoints: [
    { name: 'Health Check', url: '/api/health', status: 'healthy', response: 45, uptime: 99.9 },
    { name: 'Topic Analysis', url: '/api/topics/analyze', status: 'healthy', response: 120, uptime: 99.5 },
    { name: 'Article Generation', url: '/api/generate', status: 'warning', response: 2500, uptime: 98.2 },
    { name: 'Content Export', url: '/api/content/export', status: 'healthy', response: 340, uptime: 99.8 }
  ]
}

export function APIHealthNeural() {
  const { overall, lastCheck, endpoints } = mockAPIHealth

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-neural-success" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-neural-warning" />
      case 'error':
        return <XCircle className="h-4 w-4 text-neural-error" />
      default:
        return <Clock className="h-4 w-4 text-neural-text-muted" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-neural-success'
      case 'warning':
        return 'text-neural-warning'
      case 'error':
        return 'text-neural-error'
      default:
        return 'text-neural-text-secondary'
    }
  }

  const getResponseColor = (response: number) => {
    if (response < 100) return 'text-neural-success'
    if (response < 500) return 'text-neural-warning'
    return 'text-neural-error'
  }

  return (
    <NeuralCard className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon(overall)}
          API Health
        </CardTitle>
        <p className="text-xs text-neural-text-muted">
          Last checked: {new Date(lastCheck).toLocaleTimeString('ja-JP')}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Overall Status */}
        <div className="text-center p-4 neural-neumorphic-inset rounded-lg">
          <div className={cn("text-2xl font-bold neural-title mb-1", getStatusColor(overall))}>
            {overall.toUpperCase()}
          </div>
          <div className="text-sm text-neural-text-secondary">
            {endpoints.filter(e => e.status === 'healthy').length}/{endpoints.length} Endpoints
          </div>
        </div>

        {/* Endpoints List */}
        <div className="space-y-2">
          {endpoints.map((endpoint) => (
            <div 
              key={endpoint.name}
              className="flex items-center justify-between p-3 neural-neumorphic-inset rounded-lg"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(endpoint.status)}
                <div>
                  <div className="text-sm font-medium neural-title">{endpoint.name}</div>
                  <div className="text-xs text-neural-text-muted">{endpoint.url}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={cn("text-xs font-medium", getResponseColor(endpoint.response))}>
                  {endpoint.response}ms
                </div>
                <div className="text-xs text-neural-text-muted">
                  {endpoint.uptime}% uptime
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </NeuralCard>
  )
}