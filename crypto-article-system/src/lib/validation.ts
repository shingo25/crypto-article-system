import { z } from 'zod'

// 共通的な検証スキーマ
export const commonSchemas = {
  // ID検証 (UUID形式)
  id: z.string().uuid('Invalid ID format'),
  
  // URL検証
  url: z.string().url('Invalid URL format').max(2048, 'URL too long'),
  
  // メール検証
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  
  // パスワード検証
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  // タイトル検証
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title too long')
    .regex(/^[^<>]*$/, 'Title cannot contain HTML tags'),
  
  // コンテンツ検証
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content too long'),
  
  // ページネーション
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  
  // 重要度
  importance: z.coerce.number().int().min(1).max(10).default(5),
}

// RSS ソーススキーマ
export const rssSourceSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[^<>]*$/, 'Name cannot contain HTML tags'),
  url: commonSchemas.url,
  enabled: z.boolean().default(true),
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
  category: z.string()
    .max(50, 'Category too long')
    .regex(/^[a-zA-Z0-9_-]*$/, 'Category can only contain letters, numbers, hyphens, and underscores')
    .optional(),
})

// ニュース記事スキーマ
export const newsArticleSchema = z.object({
  title: commonSchemas.title,
  summary: z.string()
    .max(1000, 'Summary too long')
    .optional(),
  content: commonSchemas.content.optional(),
  url: commonSchemas.url,
  publishedAt: z.string().datetime('Invalid date format'),
  source: z.string().min(1, 'Source is required').max(100, 'Source name too long'),
  importance: commonSchemas.importance,
  tags: z.array(z.string().max(50, 'Tag too long')).max(20, 'Too many tags').default([]),
  coins: z.array(z.string().max(10, 'Coin symbol too long')).max(10, 'Too many coins').default([]),
})

// AI モデル設定スキーマ
export const aiModelSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google'], {
    errorMap: () => ({ message: 'Invalid AI provider' })
  }),
  model: z.string()
    .min(1, 'Model is required')
    .max(100, 'Model name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid model name format'),
  apiKey: z.string()
    .min(20, 'API key too short')
    .max(255, 'API key too long')
    .regex(/^[A-Za-z0-9._-]+$/, 'Invalid API key format'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(1).max(8192).default(2048),
})

// ユーザー登録スキーマ
export const userRegistrationSchema = z.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[^<>]*$/, 'Name cannot contain HTML tags'),
})

// ユーザーログインスキーマ
export const userLoginSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1, 'Password is required'),
})

// クエリパラメータ検証スキーマ
export const queryParamsSchema = z.object({
  page: commonSchemas.page,
  limit: commonSchemas.limit,
  search: z.string().max(100, 'Search query too long').optional(),
  sort: z.enum(['asc', 'desc']).default('desc'),
  sortBy: z.string().max(50, 'Sort field too long').optional(),
})

// ファイルアップロード検証
export const fileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .regex(/^[^<>:"/\\|?*]+$/, 'Invalid filename'),
  mimetype: z.string()
    .regex(/^[a-z]+\/[a-z0-9.-]+$/i, 'Invalid MIME type'),
  size: z.number().int().min(1).max(10 * 1024 * 1024), // 10MB max
})

// 検証エラーのフォーマッター
export function formatValidationErrors(error: z.ZodError) {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }))
}

// 安全な文字列サニタイズ
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // HTMLタグの除去
    .replace(/['"]/g, '') // クォートの除去
    .trim()
}

// SQLインジェクション対策の文字列チェック
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(--|\/\*|\*\/|;|'|")/,
    /(\bOR\b.*=.*|\bAND\b.*=.*)/i,
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

// XSS対策の文字列チェック
export function containsXSS(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ]
  
  return xssPatterns.some(pattern => pattern.test(input))
}

// 入力検証ミドルウェア用のヘルパー
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    try {
      const validated = schema.parse(data)
      return { success: true, data: validated, errors: null }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          data: null,
          errors: formatValidationErrors(error)
        }
      }
      return {
        success: false,
        data: null,
        errors: [{ field: 'unknown', message: 'Validation failed', code: 'unknown' }]
      }
    }
  }
}