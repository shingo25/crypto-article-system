'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Target, 
  Database, 
  Layout, 
  Cpu, 
  Shield,
  TrendingUp,
  Activity,
  Zap,
  BarChart3,
  Clock,
  ArrowUpRight
} from 'lucide-react'

interface NeuralStatCardProps {
  icon: React.ElementType
  title: string
  value: string | number
  subtitle: string
  trend?: {
    value: number
    isPositive: boolean
  }
  gradient: 'primary' | 'success' | 'warning' | 'error' | 'secondary'
  size?: 'small' | 'medium' | 'large'
}

const NeuralStatCard: React.FC<NeuralStatCardProps> = ({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  gradient,
  size = 'medium'
}) => {
  const gradientClasses = {
    primary: 'neural-gradient-primary',
    success: 'neural-gradient-success',
    warning: 'neural-gradient-warning',
    error: 'neural-gradient-error',
    secondary: 'neural-gradient-secondary'
  }

  const sizeClasses = {
    small: 'col-span-1 row-span-1',
    medium: 'col-span-1 md:col-span-2 row-span-1',
    large: 'col-span-1 md:col-span-2 lg:col-span-3 row-span-2'
  }

  return (
    <Card className={cn(
      "neural-neumorphic border-0 overflow-hidden group cursor-pointer",
      sizeClasses[size]
    )}>
      <div className={cn("absolute inset-0 opacity-10", gradientClasses[gradient])} />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            "neural-neumorphic-inset group-hover:scale-110 neural-transition"
          )}>
            <Icon className="h-6 w-6 text-neural-cyan" />
          </div>
          
          {trend && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              trend.isPositive ? "bg-neural-success/20 text-neural-success" : "bg-neural-error/20 text-neural-error"
            )}>
              <TrendingUp className={cn("h-3 w-3", !trend.isPositive && "rotate-180")} />
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-2xl font-bold neural-title">{value}</div>
          <div className="text-sm font-medium neural-title">{title}</div>
          <div className="text-xs text-neural-text-secondary">{subtitle}</div>
        </div>

        {size === 'large' && (
          <div className="mt-6">
            <div className="h-20 bg-neural-elevated/30 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-neural-text-muted" />
              <span className="ml-2 text-neural-text-muted">Chart Placeholder</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface WorkflowStepProps {
  icon: React.ElementType
  title: string
  description: string
  status: 'completed' | 'active' | 'pending'
  onClick?: () => void
}

const WorkflowStep: React.FC<WorkflowStepProps> = ({
  icon: Icon,
  title,
  description,
  status,
  onClick
}) => {
  const statusStyles = {
    completed: 'neural-gradient-success',
    active: 'neural-gradient-primary',
    pending: 'bg-neural-surface border border-neural-elevated'
  }

  return (
    <Card 
      className={cn(
        "neural-neumorphic border-0 group cursor-pointer neural-transition hover:scale-105",
        onClick && "hover:shadow-xl"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            statusStyles[status]
          )}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold neural-title">{title}</h3>
            <p className="text-sm text-neural-text-secondary">{description}</p>
          </div>

          <ArrowUpRight className="h-5 w-5 text-neural-text-muted group-hover:text-neural-cyan neural-transition" />
        </div>
      </CardContent>
    </Card>
  )
}

interface NeuralDashboardProps {
  stats?: {
    articlesGenerated: number
    topicsCollected: number
    templatesCount: number
    systemStatus: string
    dailyQuota: { used: number; total: number }
    lastRun?: Date
  }
}

export function NeuralDashboard({ stats }: NeuralDashboardProps) {
  const workflowSteps = [
    {
      icon: Database,
      title: 'Collect Topics',
      description: 'Gather trending cryptocurrency topics',
      status: 'completed' as const
    },
    {
      icon: Zap,
      title: 'Generate Articles',
      description: 'AI-powered content creation',
      status: 'active' as const
    },
    {
      icon: Activity,
      title: 'Analyze Performance',
      description: 'Review metrics and insights',
      status: 'pending' as const
    }
  ]

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold neural-title neural-glow-text">
            Neural Genesis Dashboard
          </h1>
          <p className="text-neural-text-secondary mt-2">
            AI-powered content creation workspace
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-neural-text-secondary">
          <Clock className="h-4 w-4" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Grid - Bento Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 auto-rows-[120px]">
        <NeuralStatCard
          icon={Target}
          title="Articles Generated"
          value={stats?.articlesGenerated || 0}
          subtitle="This month"
          trend={{ value: 12, isPositive: true }}
          gradient="success"
          size="medium"
        />
        
        <NeuralStatCard
          icon={Database}
          title="Topics Collected"
          value={stats?.topicsCollected || 0}
          subtitle="Analyzed topics"
          trend={{ value: 8, isPositive: true }}
          gradient="primary"
          size="medium"
        />

        <NeuralStatCard
          icon={Layout}
          title="Templates"
          value={stats?.templatesCount || 4}
          subtitle="Active templates"
          gradient="secondary"
          size="small"
        />

        <NeuralStatCard
          icon={Cpu}
          title="System Status"
          value={stats?.systemStatus === 'running' ? 'Active' : 'Idle'}
          subtitle={`Last run: ${stats?.lastRun ? stats.lastRun.toLocaleTimeString() : 'Never'}`}
          gradient="primary"
          size="small"
        />

        <NeuralStatCard
          icon={Shield}
          title="Daily Quota"
          value={stats?.dailyQuota ? `${stats.dailyQuota.used}/${stats.dailyQuota.total}` : 'N/A'}
          subtitle={stats?.dailyQuota ? `${stats.dailyQuota.total - stats.dailyQuota.used} remaining` : 'No limit'}
          gradient="warning"
          size="large"
        />
      </div>

      {/* Workflow Steps */}
      <div>
        <h2 className="text-xl font-semibold neural-title mb-4">Content Workflow</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workflowSteps.map((step, index) => (
            <WorkflowStep
              key={index}
              {...step}
              onClick={() => console.log(`Navigate to ${step.title}`)}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold neural-title mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button className="neural-button">
            <Zap className="h-4 w-4 mr-2" />
            Generate Article
          </Button>
          <Button variant="outline" className="neural-button">
            <Database className="h-4 w-4 mr-2" />
            Collect Topics
          </Button>
          <Button variant="outline" className="neural-button">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </div>
      </div>
    </div>
  )
}