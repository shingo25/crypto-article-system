import { z } from 'zod'

// 環境変数のスキーマ定義
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // API Keys (オプション、設定時のみ検証)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  
  // Redis (オプション)
  REDIS_URL: z.string().optional(),
  
  // Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  
  // External APIs
  COINGECKO_API_KEY: z.string().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Next.js
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters').optional(),
  NEXTAUTH_URL: z.string().url().optional(),
})

// 環境変数を検証する関数
export function validateEnv() {
  try {
    const env = envSchema.parse(process.env)
    return { success: true, data: env, errors: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      
      return { 
        success: false, 
        data: null, 
        errors 
      }
    }
    
    return { 
      success: false, 
      data: null, 
      errors: [{ field: 'unknown', message: 'Unknown validation error' }] 
    }
  }
}

// 機密情報を含む環境変数のリスト
export const SENSITIVE_ENV_VARS = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_AI_API_KEY',
  'JWT_SECRET',
  'NEXTAUTH_SECRET',
  'REDIS_URL',
  'COINGECKO_API_KEY',
]

// 環境変数の安全性チェック
export function checkEnvSecurity() {
  const issues: Array<{
    type: 'warning' | 'error'
    variable: string
    message: string
  }> = []

  // 本番環境での必須チェック
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      issues.push({
        type: 'error',
        variable: 'JWT_SECRET',
        message: 'Production requires JWT_SECRET with at least 32 characters'
      })
    }
    
    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
      issues.push({
        type: 'error',
        variable: 'NEXTAUTH_SECRET',
        message: 'Production requires NEXTAUTH_SECRET with at least 32 characters'
      })
    }
  }

  // 開発環境での警告
  if (process.env.NODE_ENV === 'development') {
    SENSITIVE_ENV_VARS.forEach(varName => {
      const value = process.env[varName]
      if (value) {
        // 短すぎるAPIキーの警告
        if (varName.includes('API_KEY') && value.length < 20) {
          issues.push({
            type: 'warning',
            variable: varName,
            message: 'API key seems too short, please verify'
          })
        }
        
        // プレースホルダーや明らかに不正な値の警告
        if (['your_api_key', 'placeholder', 'changeme', '123456'].includes(value.toLowerCase())) {
          issues.push({
            type: 'warning',
            variable: varName,
            message: 'Environment variable contains placeholder value'
          })
        }
      }
    })
  }

  return issues
}

// Git commit時の環境変数チェック（CI/CD用）
export function scanForLeakedSecrets(content: string): Array<{
  line: number
  type: string
  message: string
}> {
  const issues: Array<{ line: number; type: string; message: string }> = []
  const lines = content.split('\n')
  
  const patterns = [
    { pattern: /(?:api[_-]?key|secret|token|password)\s*[=:]\s*['"][^'"]{20,}['"]/gi, type: 'API Key' },
    { pattern: /sk-[a-zA-Z0-9]{48}/g, type: 'OpenAI API Key' },
    { pattern: /(?:postgres|mysql):\/\/[^\s]+/g, type: 'Database URL' },
    { pattern: /(?:redis):\/\/[^\s]+/g, type: 'Redis URL' },
    { pattern: /-----BEGIN [A-Z ]+-----[\s\S]+-----END [A-Z ]+-----/g, type: 'Private Key' },
  ]
  
  lines.forEach((line, index) => {
    patterns.forEach(({ pattern, type }) => {
      if (pattern.test(line)) {
        issues.push({
          line: index + 1,
          type,
          message: `Potential ${type} found in code`
        })
      }
    })
  })
  
  return issues
}

// 実行時の環境変数検証
const validationResult = validateEnv()
if (!validationResult.success) {
  console.warn('Environment validation warnings:', validationResult.errors)
}

const securityIssues = checkEnvSecurity()
if (securityIssues.length > 0) {
  securityIssues.forEach(issue => {
    if (issue.type === 'error') {
      console.error(`ENV SECURITY ERROR - ${issue.variable}: ${issue.message}`)
    } else {
      console.warn(`ENV SECURITY WARNING - ${issue.variable}: ${issue.message}`)
    }
  })
}