import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // サーバーサイドのサンプリング率
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // デバッグモード
  debug: process.env.NODE_ENV === 'development',
  
  // 環境情報
  environment: process.env.NODE_ENV || 'development',
  
  // リリース情報
  release: process.env.SENTRY_RELEASE || 'unknown',
  
  // サーバーサイドの統合設定
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app: undefined }),
  ],
  
  // エラーフィルタリング
  beforeSend(event) {
    // 機密情報の自動マスキング
    if (event.request?.data) {
      const data = event.request.data
      if (typeof data === 'object') {
        const sensitiveKeys = [
          'apiKey', 'password', 'secret', 'token', 'key',
          'openai_api_key', 'gemini_api_key', 'claude_api_key',
          'jwt_secret', 'encryption_key', 'database_url'
        ]
        
        const maskSensitiveData = (obj: any, path = '') => {
          if (typeof obj !== 'object' || obj === null) return obj
          
          for (const [key, value] of Object.entries(obj)) {
            const fullPath = path ? `${path}.${key}` : key
            
            if (sensitiveKeys.some(sensitive => 
              key.toLowerCase().includes(sensitive.toLowerCase()) ||
              fullPath.toLowerCase().includes(sensitive.toLowerCase())
            )) {
              obj[key] = '[REDACTED]'
            } else if (typeof value === 'object' && value !== null) {
              maskSensitiveData(value, fullPath)
            }
          }
          
          return obj
        }
        
        maskSensitiveData(data)
      }
    }
    
    // URLクエリパラメータからも機密情報を除去
    if (event.request?.query_string) {
      const sensitiveParams = ['api_key', 'token', 'secret', 'password']
      let queryString = event.request.query_string
      
      sensitiveParams.forEach(param => {
        const regex = new RegExp(`${param}=[^&]*`, 'gi')
        queryString = queryString.replace(regex, `${param}=[REDACTED]`)
      })
      
      event.request.query_string = queryString
    }
    
    return event
  },
  
  // 初期スコープの設定
  initialScope: {
    tags: {
      component: 'server'
    }
  }
})