'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface AuroraBackgroundProps {
  className?: string
  intensity?: 'low' | 'medium' | 'high'
  showParticles?: boolean
}

export function AuroraBackground({ 
  className, 
  intensity = 'low',
  showParticles = true 
}: AuroraBackgroundProps) {
  const intensityConfig = {
    low: {
      opacity: 'opacity-20',
      scale: 'scale-75',
      blur: 'blur-xl',
    },
    medium: {
      opacity: 'opacity-30',
      scale: 'scale-100',
      blur: 'blur-2xl',
    },
    high: {
      opacity: 'opacity-40',
      scale: 'scale-125',
      blur: 'blur-3xl',
    },
  }

  const config = intensityConfig[intensity]

  return (
    <div 
      className={cn(
        "fixed inset-0 pointer-events-none z-0 overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      {/* Primary Aurora Orb */}
      <div 
        className={cn(
          "absolute w-96 h-96 rounded-full animate-aurora",
          "bg-gradient-radial from-neural-cyan/30 via-neural-cyan/10 to-transparent",
          config.blur,
          config.opacity,
          config.scale
        )}
        style={{
          background: `radial-gradient(ellipse at center, 
            hsla(var(--neural-cyan), 0.3) 0%, 
            hsla(var(--neural-cyan), 0.1) 40%, 
            transparent 70%)`
        }}
      />
      
      {/* Secondary Aurora Orb */}
      <div 
        className={cn(
          "absolute w-80 h-80 rounded-full animate-aurora-alt",
          "right-0 top-1/4",
          config.blur,
          config.opacity,
          config.scale
        )}
        style={{
          background: `radial-gradient(ellipse at center, 
            hsla(var(--neural-orchid), 0.25) 0%, 
            hsla(var(--neural-orchid), 0.08) 45%, 
            transparent 75%)`
        }}
      />

      {/* Tertiary Aurora Orb */}
      <div 
        className={cn(
          "absolute w-72 h-72 rounded-full",
          "bottom-1/4 left-1/3",
          config.blur,
          config.opacity,
          config.scale
        )}
        style={{
          background: `radial-gradient(ellipse at center, 
            hsla(var(--neural-amber), 0.2) 0%, 
            hsla(var(--neural-amber), 0.05) 50%, 
            transparent 80%)`,
          animation: 'aurora 90s linear infinite reverse'
        }}
      />

      {/* Floating Particles */}
      {showParticles && (
        <>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute w-1 h-1 bg-neural-cyan/20 rounded-full animate-neural-float",
                config.opacity
              )}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
                animationDuration: `${4 + Math.random() * 4}s`,
              }}
            />
          ))}
          
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`orchid-${i}`}
              className={cn(
                "absolute w-1 h-1 bg-neural-orchid/15 rounded-full animate-neural-float",
                config.opacity
              )}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${5 + Math.random() * 3}s`,
              }}
            />
          ))}
        </>
      )}

      {/* Ambient Light Layer */}
      <div 
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-br from-neural-void via-neural-surface/50 to-neural-elevated/30",
          "mix-blend-overlay",
          config.opacity
        )}
      />
    </div>
  )
}

// デバイス性能に基づく動的調整用フック
export function useAuroraSettings() {
  const [settings, setSettings] = React.useState<{
    intensity: 'low' | 'medium' | 'high'
    showParticles: boolean
  }>({
    intensity: 'medium',
    showParticles: true
  })

  React.useEffect(() => {
    // パフォーマンステスト
    const testPerformance = () => {
      const isLowEnd = navigator.hardwareConcurrency <= 2 || 
                      (window.performance?.memory as any)?.usedJSHeapSize > 50000000 ||
                      /Android.*Chrome\/\d{2}\./i.test(navigator.userAgent)

      if (isLowEnd) {
        setSettings({
          intensity: 'low',
          showParticles: false
        })
      } else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setSettings({
          intensity: 'low',
          showParticles: false
        })
      }
    }

    testPerformance()
  }, [])

  return settings
}