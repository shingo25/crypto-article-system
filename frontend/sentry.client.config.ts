import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // 本番環境でのサンプリング率を調整
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // デバッグモード（開発環境のみ）
  debug: process.env.NODE_ENV === 'development',
  
  // 環境情報
  environment: process.env.NODE_ENV || 'development',
  
  // リリース情報
  release: process.env.SENTRY_RELEASE || 'unknown',
  
  // エラーフィルタリング
  beforeSend(event) {
    // 開発環境でのノイズを除去
    if (process.env.NODE_ENV === 'development') {
      // HMRやNext.jsの内部エラーをフィルタ
      if (event.exception?.values?.[0]?.value?.includes('HMR') ||
          event.exception?.values?.[0]?.value?.includes('webpackHotUpdate')) {
        return null
      }
    }
    
    // 機密情報をマスク
    if (event.request?.data) {
      const data = event.request.data
      if (typeof data === 'object' && data !== null) {
        // APIキーや秘密情報をマスク
        const sensitiveKeys = ['apiKey', 'password', 'secret', 'token', 'key']
        sensitiveKeys.forEach(key => {
          if ((data as Record<string, any>)[key]) {
            (data as Record<string, any>)[key] = '[REDACTED]'
          }
        })
      }
    }
    
    return event
  },
  
  // パフォーマンス監視の設定
  integrations: [],
  
  // エラーレベルのフィルタリング
  initialScope: {
    tags: {
      component: 'client'
    }
  }
})