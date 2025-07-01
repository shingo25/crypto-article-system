'use client'

import { useState, useEffect } from 'react'
import { QueryProvider } from '@/lib/query-provider'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { CommandPalette } from '@/components/CommandPalette'
import { Toaster } from 'react-hot-toast'

export function AppProvider({ children }: { children: React.ReactNode }) {
  // useCommandPaletteフックをここで呼び出す
  const { isOpen, close } = useCommandPalette()

  // Next.jsでは、マウント後にクライアント専用コンポーネントをレンダリングすることが推奨される
  // これによりハイドレーションエラーを回避できる
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <QueryProvider>
      {children}
      {isMounted && (
        <>
          <CommandPalette isOpen={isOpen} onClose={close} />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#fff',
                border: '1px solid #334155',
              },
            }}
          />
        </>
      )}
    </QueryProvider>
  )
}