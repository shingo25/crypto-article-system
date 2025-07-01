'use client'

import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div 
      className={cn(
        "animate-pulse bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 rounded-md",
        className
      )}
    />
  )
}