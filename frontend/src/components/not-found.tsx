'use client'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neural-void flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold neural-title mb-4">404</h1>
        <p className="text-neural-text-secondary mb-6">ページが見つかりません</p>
        <a 
          href="/market" 
          className="inline-block px-6 py-3 bg-neural-cyan text-white rounded-lg neural-transition hover:bg-neural-cyan/80"
        >
          ホームに戻る
        </a>
      </div>
    </div>
  )
}