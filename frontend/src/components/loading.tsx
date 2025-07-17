'use client'

export const dynamic = 'force-dynamic'

export default function Loading() {
  return (
    <div className="min-h-screen bg-neural-void flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-neural-cyan/30 border-t-neural-cyan rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-neural-text-secondary">読み込み中...</p>
      </div>
    </div>
  )
}