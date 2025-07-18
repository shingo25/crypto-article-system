'use client'

import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
  count?: number
}

export function LoadingSkeleton({ className, count = 1 }: LoadingSkeletonProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index}
          className="animate-pulse bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 rounded-md h-24"
          style={{ animationDelay: `${index * 100}ms` }}
        />
      ))}
    </div>
  )
}