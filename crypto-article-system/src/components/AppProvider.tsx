'use client'

import { useState, useEffect } from 'react'
import { QueryProvider } from '@/lib/query-provider'
// AuthProviderは上位のlayout.tsxで既に適用済みのため削除
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { CommandPalette } from '@/components/CommandPalette'
import { AuroraBackground, useAuroraSettings } from '@/components/ui/aurora-background'
import { Toaster } from 'react-hot-toast'

export function AppProvider({ children }: { children: React.ReactNode }) {
  // useCommandPaletteフックをここで呼び出す
  const { isOpen, close } = useCommandPalette()
  
  // オーロラ背景の設定を取得
  const auroraSettings = useAuroraSettings()

  // Next.jsでは、マウント後にクライアント専用コンポーネントをレンダリングすることが推奨される
  // これによりハイドレーションエラーを回避できる
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <QueryProvider>
      {isMounted && (
        <AuroraBackground 
          intensity={auroraSettings.intensity}
          showParticles={auroraSettings.showParticles}
        />
      )}
      {children}
      {isMounted && (
        <>
          <CommandPalette isOpen={isOpen} onClose={close} />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--neural-surface))',
                color: 'hsl(var(--neural-text-primary))',
                border: '1px solid hsl(var(--neural-elevated))',
                borderRadius: '1rem',
                backdropFilter: 'blur(8px)',
              },
            }}
          />
        </>
      )}
    </QueryProvider>
  )
}