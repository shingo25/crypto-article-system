# AI テンプレートシステム Documentation

## 概要

暗号通貨記事自動生成システムのAIテンプレートシステムについて詳しく説明します。このシステムは、柔軟性とセキュリティを重視したエンタープライズグレードのAI記事生成機能を提供します。

## 1. システムアーキテクチャ

### 1.1 全体構成
```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Template System                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Template API   │  │  Provider API   │  │  Security API   │  │
│  │    (CRUD)       │  │   (Multi-AI)    │  │   (Audit)       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Template       │  │  Variable       │  │  Few-Shot       │  │
│  │  Management     │  │  Replacement    │  │  Learning       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    OpenAI       │  │    Anthropic    │  │    Gemini       │  │
│  │   Provider      │  │    Provider     │  │   Provider      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 データベース設計
```sql
-- AIテンプレートテーブル
CREATE TABLE AITemplate (
  id                    String   @id @default(cuid())
  organizationId        String   -- マルチテナント対応
  name                  String   
  description           String?
  category              String?
  systemPrompt          String   -- AI の役割定義
  userPrompt            String   -- 実際のプロンプト
  fewShotExamples       Json[]   -- 学習用例文
  variables             Json     -- 変数定義
  aiProvider            AIProvider
  model                 String
  temperature           Float
  maxTokens             Int
  usageCount            Int      @default(0)
  successRate           Float    @default(0)
  avgTokenUsage         Float    @default(0)
  avgResponseTime       Float    @default(0)
  lastUsed              DateTime?
  isActive              Boolean  @default(true)
  isPublic              Boolean  @default(false)
  contentFilter         Json     @default("{}")
  rateLimit             Int?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  -- リレーション
  organization          Organization @relation(fields: [organizationId], references: [id])
  jobs                  ArticleGenerationJob[]
  
  @@map("ai_templates")
)
```

## 2. テンプレートの構造

### 2.1 基本データ構造
```typescript
interface AITemplate {
  // 基本情報
  id: string
  organizationId: string
  name: string
  description?: string
  category?: string
  
  // プロンプト設定
  systemPrompt: string
  userPrompt: string
  fewShotExamples?: FewShotExample[]
  variables?: Record<string, VariableConfig>
  
  // AI設定
  aiProvider: AIProvider
  model: string
  temperature: number
  maxTokens: number
  
  // 統計情報
  usageCount: number
  successRate: number
  avgTokenUsage: number
  avgResponseTime: number
  lastUsed?: Date
  
  // 状態管理
  isActive: boolean
  isPublic: boolean
  
  // セキュリティ
  contentFilter: Record<string, any>
  rateLimit?: number
  
  // タイムスタンプ
  createdAt: Date
  updatedAt: Date
}
```

### 2.2 Few-Shot学習の例
```typescript
interface FewShotExample {
  input: string
  output: string
}

// 実際の例
const cryptoNewsExamples: FewShotExample[] = [
  {
    input: "ビットコインが65000ドルを突破、機関投資家の参入が加速",
    output: `
# ビットコイン65,000ドル突破：機関投資家参入の新たな波

## 概要
ビットコイン（BTC）が本日、65,000ドルの重要な抵抗線を突破し、市場に新たな楽観的な雰囲気をもたらしています。この上昇は、機関投資家の継続的な参入によって支えられています。

## 市場分析
今回の価格上昇の主な要因：
1. 大手投資会社のBTCポートフォリオ追加
2. 規制環境の改善期待
3. インフレヘッジとしての需要増加

## 今後の展望
テクニカル分析では、次の抵抗線は70,000ドル付近となる見込みです。ただし、市場のボラティリティには注意が必要です。
    `
  }
]
```

### 2.3 変数設定システム
```typescript
interface VariableConfig {
  label: string
  type: 'string' | 'number' | 'boolean' | 'array'
  required: boolean
  placeholder?: string
  description?: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

// 実際の設定例
const variables: Record<string, VariableConfig> = {
  title: {
    label: "ニュースタイトル",
    type: "string",
    required: true,
    placeholder: "例: ビットコインが新高値を更新",
    description: "記事のベースとなるニュースタイトル"
  },
  coins: {
    label: "関連通貨",
    type: "array",
    required: false,
    description: "記事に関連する暗号通貨のリスト"
  },
  importance: {
    label: "重要度",
    type: "number",
    required: true,
    validation: { min: 1, max: 10 },
    description: "ニュースの重要度（1-10）"
  }
}
```

## 3. AIプロバイダー統合

### 3.1 プロバイダー抽象化
```typescript
abstract class BaseAIProvider {
  abstract getProviderName(): string
  abstract generateArticle(prompt: string, options: GenerationOptions): Promise<GenerationResult>
  abstract testConnection(): Promise<boolean>
  abstract getAvailableModels(): string[]
}

interface GenerationOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

interface GenerationResult {
  content: string
  tokensUsed: number
  finishReason: string
  model: string
  processingTime: number
}
```

### 3.2 Gemini プロバイダー
```typescript
export class GeminiProvider extends BaseAIProvider {
  private apiKey: string
  private model: string
  
  constructor(apiKey: string, model: string = 'gemini-1.5-pro') {
    super()
    this.apiKey = apiKey
    this.model = model
  }
  
  async generateArticle(prompt: string, options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 2000,
            topP: options.topP || 0.95
          }
        })
      })
      
      const data = await response.json()
      const processingTime = Date.now() - startTime
      
      return {
        content: data.candidates[0].content.parts[0].text,
        tokensUsed: data.usageMetadata.totalTokenCount,
        finishReason: data.candidates[0].finishReason,
        model: this.model,
        processingTime
      }
    } catch (error) {
      throw new Error(`Gemini API error: ${error.message}`)
    }
  }
  
  getProviderName(): string {
    return 'Gemini'
  }
  
  async testConnection(): Promise<boolean> {
    try {
      await this.generateArticle('Test', { maxTokens: 10 })
      return true
    } catch {
      return false
    }
  }
  
  getAvailableModels(): string[] {
    return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp']
  }
}
```

### 3.3 プロバイダーファクトリー
```typescript
export class AIProviderFactory {
  static createProvider(provider: AIProvider, config: AIProviderConfig): BaseAIProvider {
    switch (provider) {
      case 'GEMINI':
        return new GeminiProvider(config.apiKey, config.model)
      case 'OPENAI':
        return new OpenAIProvider(config.apiKey, config.model)
      case 'CLAUDE':
        return new ClaudeProvider(config.apiKey, config.model)
      default:
        throw new Error(`Unsupported AI provider: ${provider}`)
    }
  }
  
  static async createFromCurrentConfig(): Promise<BaseAIProvider> {
    const config = await getCurrentProviderConfig()
    return this.createProvider(config.provider, config)
  }
}
```

## 4. テンプレート管理API

### 4.1 テンプレート作成
```typescript
// POST /api/ai/templates
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // CSRF保護
    const csrfValidation = await validateCSRFToken(request)
    if (!csrfValidation.valid) {
      return NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 })
    }
    
    // リクエストデータの検証
    const body = await request.json()
    const validation = CreateTemplateSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid template data',
        details: validation.error.issues
      }, { status: 400 })
    }
    
    // プロンプトインジェクション検出
    const promptText = `${validation.data.systemPrompt} ${validation.data.userPrompt}`
    const suspiciousContent = detectSuspiciousContent(promptText)
    
    if (suspiciousContent) {
      await createSecurityAuditLog({
        organizationId: user.organizationId,
        userId: user.userId,
        eventType: 'SUSPICIOUS_PROMPT',
        severity: 'warning',
        description: 'Suspicious content detected in template creation'
      })
      
      return NextResponse.json({
        error: 'Template content contains suspicious patterns'
      }, { status: 400 })
    }
    
    // テンプレート作成
    const template = await prisma.aITemplate.create({
      data: {
        organizationId: user.organizationId,
        ...validation.data
      }
    })
    
    return NextResponse.json({
      success: true,
      data: { template }
    })
    
  } catch (error) {
    console.error('Template creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 4.2 テンプレート一覧取得
```typescript
// GET /api/ai/templates
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const templates = await prisma.aITemplate.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true
      },
      include: {
        _count: {
          select: { jobs: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: { templates }
    })
    
  } catch (error) {
    console.error('Templates fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## 5. セキュリティ機能

### 5.1 プロンプトインジェクション対策
```typescript
function detectSuspiciousContent(text: string): boolean {
  const suspiciousPatterns = [
    /ignore\s+previous\s+instructions/i,
    /system\s*:\s*you\s+are/i,
    /\[SYSTEM\]/i,
    /\[\/SYSTEM\]/i,
    /forget\s+everything/i,
    /new\s+instructions/i,
    /override\s+previous/i,
    /disregard\s+above/i,
    /pretend\s+to\s+be/i,
    /act\s+as\s+if/i
  ]
  
  return suspiciousPatterns.some(pattern => pattern.test(text))
}
```

### 5.2 入力検証
```typescript
const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string().optional(),
  systemPrompt: z.string().min(10).max(10000),
  userPrompt: z.string().min(10).max(10000),
  fewShotExamples: z.array(z.object({
    input: z.string(),
    output: z.string()
  })).optional(),
  variables: z.record(z.any()).optional(),
  aiProvider: z.nativeEnum(AIProvider).default(AIProvider.OPENAI),
  model: z.string().default('gpt-4o-mini'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(8000).default(2000),
  isPublic: z.boolean().default(false),
  contentFilter: z.record(z.any()).optional(),
  rateLimit: z.number().optional()
})
```

### 5.3 アクセス制御
```typescript
// 組織レベルでのアクセス制御
async function checkTemplateAccess(templateId: string, userId: string): Promise<boolean> {
  const template = await prisma.aITemplate.findFirst({
    where: {
      id: templateId,
      OR: [
        { organizationId: { in: await getUserOrganizations(userId) } },
        { isPublic: true }
      ],
      isActive: true
    }
  })
  
  return template !== null
}
```

## 6. パフォーマンス最適化

### 6.1 テンプレートキャッシュ
```typescript
class TemplateCache {
  private cache = new Map<string, AITemplate>()
  private ttl = 5 * 60 * 1000 // 5分
  
  async getTemplate(id: string): Promise<AITemplate | null> {
    const cached = this.cache.get(id)
    if (cached && this.isValid(cached)) {
      return cached
    }
    
    const template = await this.fetchFromDatabase(id)
    if (template) {
      this.cache.set(id, template)
    }
    
    return template
  }
  
  private isValid(template: AITemplate): boolean {
    return Date.now() - template.updatedAt.getTime() < this.ttl
  }
  
  private async fetchFromDatabase(id: string): Promise<AITemplate | null> {
    return await prisma.aITemplate.findFirst({
      where: { id, isActive: true }
    })
  }
}
```

### 6.2 バッチ処理
```typescript
// 複数テンプレートの並列処理
async function processMultipleTemplates(templateIds: string[]): Promise<ProcessingResult[]> {
  const results = await Promise.allSettled(
    templateIds.map(id => processTemplate(id))
  )
  
  return results.map((result, index) => ({
    templateId: templateIds[index],
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null
  }))
}
```

## 7. 監視とメトリクス

### 7.1 使用統計の収集
```typescript
async function updateTemplateStats(templateId: string, result: GenerationResult): Promise<void> {
  await prisma.aITemplate.update({
    where: { id: templateId },
    data: {
      usageCount: { increment: 1 },
      lastUsed: new Date(),
      avgTokenUsage: {
        // 移動平均の計算
        set: await calculateMovingAverage(templateId, 'avgTokenUsage', result.tokensUsed)
      },
      avgResponseTime: {
        set: await calculateMovingAverage(templateId, 'avgResponseTime', result.processingTime)
      },
      successRate: {
        set: await calculateSuccessRate(templateId)
      }
    }
  })
}
```

### 7.2 アラート設定
```typescript
async function checkTemplateHealth(templateId: string): Promise<void> {
  const template = await prisma.aITemplate.findUnique({
    where: { id: templateId },
    include: {
      jobs: {
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }
    }
  })
  
  if (template) {
    const recentJobs = template.jobs
    const failedJobs = recentJobs.filter(job => job.status === 'FAILED')
    const failureRate = failedJobs.length / recentJobs.length
    
    if (failureRate > 0.1) { // 10%以上の失敗率
      await sendAlert({
        type: 'TEMPLATE_HIGH_FAILURE_RATE',
        templateId,
        failureRate,
        recentJobs: recentJobs.length
      })
    }
  }
}
```

## 8. 初期設定とメンテナンス

### 8.1 デフォルトテンプレート作成
```typescript
// scripts/create-default-ai-templates.ts
async function createDefaultTemplates(): Promise<void> {
  const defaultTemplates = [
    {
      name: "暗号通貨ニュース記事生成",
      category: "cryptocurrency",
      systemPrompt: "あなたは暗号通貨とブロックチェーン技術の専門ライターです...",
      userPrompt: "以下のニュース情報をもとに、暗号通貨記事を作成してください：\n\nタイトル: {{title}}...",
      aiProvider: AIProvider.GEMINI,
      model: "gemini-1.5-pro",
      temperature: 0.3,
      maxTokens: 2000
    },
    // ... 他のテンプレート
  ]
  
  for (const template of defaultTemplates) {
    await prisma.aITemplate.upsert({
      where: { name: template.name },
      update: template,
      create: {
        organizationId: 'default',
        ...template
      }
    })
  }
}
```

### 8.2 テンプレート最適化
```typescript
// 定期的なテンプレート最適化
async function optimizeTemplates(): Promise<void> {
  const templates = await prisma.aITemplate.findMany({
    where: { isActive: true },
    include: {
      jobs: {
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      }
    }
  })
  
  for (const template of templates) {
    // 使用頻度が低いテンプレートを非アクティブ化
    if (template.jobs.length === 0 && template.usageCount < 10) {
      await prisma.aITemplate.update({
        where: { id: template.id },
        data: { isActive: false }
      })
    }
    
    // 高失敗率のテンプレートに警告
    const failedJobs = template.jobs.filter(job => job.status === 'FAILED')
    if (failedJobs.length / template.jobs.length > 0.2) {
      await createAlert({
        type: 'TEMPLATE_NEEDS_REVIEW',
        templateId: template.id,
        reason: 'High failure rate detected'
      })
    }
  }
}
```

## 9. 拡張性とカスタマイズ

### 9.1 カスタムプロバイダー追加
```typescript
// 新しいAIプロバイダーの追加例
export class CustomAIProvider extends BaseAIProvider {
  constructor(private config: CustomConfig) {
    super()
  }
  
  async generateArticle(prompt: string, options: GenerationOptions): Promise<GenerationResult> {
    // カスタムAI APIの実装
    const response = await this.callCustomAPI(prompt, options)
    
    return {
      content: response.text,
      tokensUsed: response.tokens,
      finishReason: response.finish_reason,
      model: this.config.model,
      processingTime: response.processing_time
    }
  }
  
  getProviderName(): string {
    return 'CustomAI'
  }
}
```

### 9.2 プラグインシステム
```typescript
interface TemplatePlugin {
  name: string
  version: string
  preProcess?: (prompt: string) => Promise<string>
  postProcess?: (result: GenerationResult) => Promise<GenerationResult>
  validate?: (template: AITemplate) => Promise<ValidationResult>
}

class TemplatePluginManager {
  private plugins: Map<string, TemplatePlugin> = new Map()
  
  registerPlugin(plugin: TemplatePlugin): void {
    this.plugins.set(plugin.name, plugin)
  }
  
  async executePreProcess(pluginName: string, prompt: string): Promise<string> {
    const plugin = this.plugins.get(pluginName)
    return plugin?.preProcess ? await plugin.preProcess(prompt) : prompt
  }
  
  async executePostProcess(pluginName: string, result: GenerationResult): Promise<GenerationResult> {
    const plugin = this.plugins.get(pluginName)
    return plugin?.postProcess ? await plugin.postProcess(result) : result
  }
}
```

## 10. トラブルシューティング

### 10.1 よくある問題と解決方法

#### テンプレートが見つからない
```typescript
// 問題: Template not found
// 解決: 組織IDとアクセス権限を確認
const template = await prisma.aITemplate.findFirst({
  where: {
    id: templateId,
    organizationId: user.organizationId,
    isActive: true
  }
})
```

#### AI API エラー
```typescript
// 問題: AI API call failed
// 解決: 適切なエラーハンドリングと再試行
async function generateWithRetry(prompt: string, maxRetries: number = 3): Promise<GenerationResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await aiProvider.generateArticle(prompt, options)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

### 10.2 デバッグ情報
```typescript
// デバッグ用のログ出力
if (process.env.NODE_ENV === 'development') {
  console.log('[TEMPLATE DEBUG]', {
    templateId,
    promptLength: finalPrompt.length,
    variableCount: Object.keys(variables).length,
    provider: template.aiProvider,
    model: template.model
  })
}
```

---

**最終更新**: 2025-07-15
**バージョン**: 1.0.0
**作成者**: Claude Code Assistant