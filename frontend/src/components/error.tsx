'use client'

import { useEffect } from 'react'

// セキュリティ強化: App Router専用のエラーハンドラー
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // セキュリティ上重要: エラーの詳細情報を本番環境では記録のみ
    if (process.env.NODE_ENV === 'production') {
      // 本番環境では詳細なエラー情報を隠す
      console.error('[Security] Page error:', {
        message: 'Page error occurred',
        digest: error.digest,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      })
    } else {
      // 開発環境では詳細なエラー情報を表示
      console.error('[Development] Page error:', error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-neural-void flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neural-title mb-2">
            ページエラー
          </h1>
          <p className="text-neural-text-secondary mb-6">
            {process.env.NODE_ENV === 'production'
              ? 'ページの読み込み中にエラーが発生しました。'
              : `エラー: ${error.message}`}
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => reset()}
            className="w-full px-6 py-3 bg-neural-cyan text-white rounded-lg neural-transition hover:bg-neural-cyan/80 focus:outline-none focus:ring-2 focus:ring-neural-cyan/50"
          >
            再試行
          </button>
          
          <a
            href="/market"
            className="block w-full px-6 py-3 bg-neural-surface border border-neural-border text-neural-text rounded-lg neural-transition hover:bg-neural-surface/80 focus:outline-none focus:ring-2 focus:ring-neural-border"
          >
            ホームに戻る
          </a>
        </div>
        
        {process.env.NODE_ENV === 'development' && error.digest && (
          <div className="mt-6 p-4 bg-neutral-100 rounded-lg text-left">
            <p className="text-sm text-neutral-600">
              <strong>Error Digest:</strong> {error.digest}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}