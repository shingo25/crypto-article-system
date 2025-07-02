import { z } from 'zod';

// コンテンツタイプの定義
export const ContentTypeSchema = z.enum(['article', 'topic', 'analysis']);

// 配信チャンネルの定義
export const DistributionChannelSchema = z.enum(['wordpress', 'twitter', 'facebook', 'linkedin', 'email']);

// メタデータのスキーマ
export const ContentMetadataSchema = z.object({
  tags: z.array(z.string()).optional().default([]),
  categories: z.array(z.string()).optional().default([]),
  publishedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional().default('published'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  language: z.string().min(2).max(5).optional().default('ja'),
  readingTime: z.number().min(0).optional(),
  wordCount: z.number().min(0).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  confidence: z.number().min(0).max(1).optional(),
}).strict();

// 配信設定のスキーマ
export const DistributionConfigSchema = z.object({
  channels: z.array(DistributionChannelSchema).optional().default([]),
  publishedChannels: z.array(DistributionChannelSchema).optional().default([]),
  failedChannels: z.array(z.object({
    channel: DistributionChannelSchema,
    error: z.string(),
    timestamp: z.string().datetime()
  })).optional().default([]),
  scheduledAt: z.string().datetime().optional(),
}).strict();

// コンテンツ作成のスキーマ
export const CreateContentSchema = z.object({
  tenantId: z.string().min(1, 'テナントIDは必須です'),
  type: ContentTypeSchema,
  title: z.string()
    .min(1, 'タイトルは必須です')
    .max(500, 'タイトルは500文字以内で入力してください')
    .trim(),
  content: z.string()
    .min(1, 'コンテンツは必須です')
    .max(50000, 'コンテンツは50,000文字以内で入力してください')
    .trim(),
  summary: z.string()
    .max(1000, '要約は1,000文字以内で入力してください')
    .trim()
    .optional(),
  metadata: ContentMetadataSchema.optional(),
  distribution: DistributionConfigSchema.optional(),
}).strict();

// コンテンツ検索のスキーマ
export const ContentSearchSchema = z.object({
  tenantId: z.string().min(1),
  page: z.coerce.number().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  categories: z.string().optional().transform(val => val?.split(',').filter(Boolean)),
  tags: z.string().optional().transform(val => val?.split(',').filter(Boolean)),
  status: z.string().optional().transform(val => val?.split(',').filter(Boolean)),
  priority: z.string().optional().transform(val => val?.split(',').filter(Boolean)),
  language: z.string().optional().transform(val => val?.split(',').filter(Boolean)),
  sentiment: z.string().optional().transform(val => val?.split(',').filter(Boolean)),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).strict();

// 入力サニタイゼーション関数
export function sanitizeContent(content: string): string {
  return content
    .trim()
    // 危険なHTMLタグを除去
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<link\b[^<]*>/gi, '')
    .replace(/<meta\b[^<]*>/gi, '')
    // JavaScriptイベントハンドラを除去
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*javascript\s*:/gi, '')
    // 連続する空白文字を正規化
    .replace(/\s+/g, ' ');
}

export function sanitizeTitle(title: string): string {
  return title
    .trim()
    // HTMLタグを完全除去
    .replace(/<[^>]*>/g, '')
    // 改行文字を空白に置換
    .replace(/[\r\n\t]/g, ' ')
    // 連続する空白文字を正規化
    .replace(/\s+/g, ' ');
}

// セキュリティチェック関数
export function containsSuspiciousContent(content: string): boolean {
  const suspiciousPatterns = [
    /javascript:/i,
    /data:.*script/i,
    /vbscript:/i,
    /<script/i,
    /<iframe/i,
    /eval\s*\(/i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i,
    /document\.cookie/i,
    /window\.location/i,
    /\.innerHTML/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(content));
}