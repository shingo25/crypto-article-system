import React from 'react'
import { LucideIcon } from 'lucide-react'

interface OptimizedStatCardProps {
  icon: LucideIcon
  title: string
  value: string | number
  subtitle: string
  gradient: string
  textColor?: string
  iconBg: string
  isLoading?: boolean
}

export const OptimizedStatCard = React.memo<OptimizedStatCardProps>(({
  icon: Icon,
  title,
  value,
  subtitle,
  gradient,
  textColor = "text-white",
  iconBg,
  isLoading = false
}) => (
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
          {isLoading ? (
            <div className="h-8 w-16 bg-white/20 rounded-lg animate-pulse mt-1"></div>
          ) : (
            <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
          )}
        </div>
      </div>
      <div className={`text-sm ${textColor} opacity-70 font-medium`}>{subtitle}</div>
    </div>
    
    {/* Shine effect */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-1000"></div>
    </div>
  </div>
))

OptimizedStatCard.displayName = 'OptimizedStatCard'