'use client'

import { useState, useEffect } from 'react'
import { QueryProvider } from '@/lib/query-provider'
import { Toaster } from 'react-hot-toast'

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <QueryProvider>
      {children}
      {isMounted && (
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
      )}
    </QueryProvider>
  )
}