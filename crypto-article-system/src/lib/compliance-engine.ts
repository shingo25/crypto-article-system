import { createComponentLogger } from './logger'
import { AppError, ErrorType } from './error-handler'
import { tenantManager } from './tenant'

const componentLogger = createComponentLogger('ComplianceEngine')

// コンプライアンスの型定義
export interface ComplianceRule {
  id: string
  name: string
  description: string
  jurisdiction: string[] // 適用地域
  category: 'financial' | 'data_privacy' | 'content' | 'advertising' | 'general'
  severity: 'low' | 'medium' | 'high' | 'critical'
  isActive: boolean
  patterns: {
    keywords: string[]
    phrases: string[]
    regex: string[]
    excludePatterns?: string[]
  }
  actions: ComplianceAction[]
  metadata: {
    regulation: string // GDPR, CCPA, FSA等
    lastUpdated: string
    version: string
  }
}

export interface ComplianceAction {
  type: 'flag' | 'block' | 'warn' | 'modify' | 'require_review' | 'auto_disclaimer'
  params?: Record<string, any>
  description: string
}

export interface ComplianceCheck {
  id: string
  contentId: string
  tenantId: string
  checkType: 'content' | 'metadata' | 'distribution' | 'user_data'
  rules: ComplianceRuleResult[]
  overallStatus: 'pass' | 'warn' | 'fail' | 'blocked'
  score: number // 0-100 (100 = fully compliant)
  recommendedActions: string[]
  requiredActions: string[]
  timestamp: string
}

export interface ComplianceRuleResult {
  ruleId: string
  ruleName: string
  status: 'pass' | 'warn' | 'fail'
  violations: ComplianceViolation[]
  suggestions: string[]
  confidence: number
}

export interface ComplianceViolation {
  type: string
  description: string
  location: {
    field: string
    position?: number
    context?: string
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestion: string
}

export interface ComplianceReport {
  tenantId: string
  period: {
    from: string
    to: string
  }
  summary: {
    totalChecks: number
    passRate: number
    violations: {
      critical: number
      high: number
      medium: number
      low: number
    }
    topViolationTypes: Array<{
      type: string
      count: number
      trend: 'increasing' | 'decreasing' | 'stable'
    }>
  }
  rulePerformance: Array<{
    ruleId: string
    ruleName: string
    triggerCount: number
    accuracy: number
  }>
  recommendations: string[]
}

// コンプライアンスエンジンクラス
export class ComplianceEngine {
  private static instance: ComplianceEngine
  private rules: Map<string, ComplianceRule> = new Map()
  private checks: Map<string, ComplianceCheck> = new Map()

  // デフォルトルール定義
  private defaultRules: ComplianceRule[] = [
    {
      id: 'rule_financial_advice',
      name: '金融アドバイス規制',
      description: '投資助言や金融商品の推奨に関する規制',
      jurisdiction: ['JP', 'US', 'EU'],
      category: 'financial',
      severity: 'critical',
      isActive: true,
      patterns: {
        keywords: ['投資すべき', '確実に儲かる', '必ず上がる', '絶対に利益', 'guaranteed profit'],
        phrases: ['投資を推奨', '今すぐ買うべき', 'リスクなし'],
        regex: ['確実.*利益', '絶対.*儲かる', 'guaranteed.*return']
      },
      actions: [
        {
          type: 'flag',
          description: '金融アドバイス規制違反の可能性'
        },
        {
          type: 'require_review',
          description: '法務レビューが必要'
        },
        {
          type: 'auto_disclaimer',
          params: { 
            disclaimer: 'これは投資助言ではありません。投資判断は自己責任で行ってください。' 
          },
          description: '免責事項を自動追加'
        }
      ],
      metadata: {
        regulation: 'FSA_FIEA',
        lastUpdated: '2024-12-01T00:00:00Z',
        version: '1.0'
      }
    },
    {
      id: 'rule_gdpr_privacy',
      name: 'GDPR個人情報保護',
      description: 'EUのGDPR規制に関する個人情報取り扱い',
      jurisdiction: ['EU'],
      category: 'data_privacy',
      severity: 'high',
      isActive: true,
      patterns: {
        keywords: ['個人情報', 'personal data', 'email address', 'IP address'],
        phrases: ['個人を特定', 'personal identification'],
        regex: ['[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'] // email pattern
      },
      actions: [
        {
          type: 'warn',
          description: 'GDPR準拠の確認が必要'
        },
        {
          type: 'require_review',
          description: 'プライバシー担当者のレビューが必要'
        }
      ],
      metadata: {
        regulation: 'GDPR',
        lastUpdated: '2024-12-01T00:00:00Z',
        version: '1.0'
      }
    },
    {
      id: 'rule_misleading_content',
      name: '誤解を招く表現規制',
      description: '誤解を招く可能性のある表現や誇大広告の防止',
      jurisdiction: ['JP', 'US', 'EU'],
      category: 'content',
      severity: 'medium',
      isActive: true,
      patterns: {
        keywords: ['誇大', '大幅', 'massive gains', '一夜で', 'overnight'],
        phrases: ['すぐに大金', '楽して稼げる', 'get rich quick'],
        regex: ['\\d+倍.*上昇', '\\d+%.*確実']
      },
      actions: [
        {
          type: 'warn',
          description: '誤解を招く表現の可能性'
        },
        {
          type: 'modify',
          params: { 
            suggestions: ['「可能性があります」を追加', '「リスクを伴います」を明記'] 
          },
          description: '表現の修正提案'
        }
      ],
      metadata: {
        regulation: 'CONSUMER_PROTECTION',
        lastUpdated: '2024-12-01T00:00:00Z',
        version: '1.0'
      }
    },
    {
      id: 'rule_crypto_regulation',
      name: '暗号資産規制',
      description: '暗号資産に関する規制要件',
      jurisdiction: ['JP'],
      category: 'financial',
      severity: 'high',
      isActive: true,
      patterns: {
        keywords: ['暗号資産', '仮想通貨', '取引所', 'crypto exchange'],
        phrases: ['投資勧誘', '価格予想'],
        regex: ['BTC.*予想', 'ETH.*予測']
      },
      actions: [
        {
          type: 'auto_disclaimer',
          params: { 
            disclaimer: '暗号資産の取引には価格変動リスクが伴います。金融庁の認可を受けた業者をご利用ください。' 
          },
          description: '暗号資産免責事項を自動追加'
        }
      ],
      metadata: {
        regulation: 'PSA_CRYPTO',
        lastUpdated: '2024-12-01T00:00:00Z',
        version: '1.0'
      }
    }
  ]

  public static getInstance(): ComplianceEngine {
    if (!ComplianceEngine.instance) {
      ComplianceEngine.instance = new ComplianceEngine()
    }
    return ComplianceEngine.instance
  }

  constructor() {
    this.initializeDefaultRules()
  }

  // デフォルトルールの初期化
  private initializeDefaultRules(): void {
    this.defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule)
    })
    componentLogger.info('コンプライアンスルールを初期化', { 
      ruleCount: this.defaultRules.length 
    })
  }

  // コンテンツのコンプライアンスチェック
  public async checkContentCompliance(
    contentId: string,
    tenantId: string,
    content: {
      title: string
      content: string
      summary?: string
      metadata?: Record<string, any>
    },
    jurisdiction: string[] = ['JP']
  ): Promise<ComplianceCheck> {
    try {
      const startTime = Date.now()

      // テナントの機能チェック
      const context = await tenantManager.getTenantContext(tenantId)
      if (!tenantManager.hasFeature(context.tenant, 'compliance')) {
        throw new AppError('Compliance feature not available in current plan', {
          type: ErrorType.VALIDATION_ERROR,
          code: 'FEATURE_NOT_AVAILABLE',
          statusCode: 403,
          userMessage: 'コンプライアンス機能は現在のプランでは利用できません'
        })
      }

      const applicableRules = Array.from(this.rules.values()).filter(rule => 
        rule.isActive && 
        rule.jurisdiction.some(j => jurisdiction.includes(j))
      )

      const ruleResults: ComplianceRuleResult[] = []

      // 各ルールをチェック
      for (const rule of applicableRules) {
        const result = await this.evaluateRule(rule, content)
        ruleResults.push(result)
      }

      // 全体スコアとステータスを計算
      const overallResult = this.calculateOverallCompliance(ruleResults)

      const complianceCheck: ComplianceCheck = {
        id: `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contentId,
        tenantId,
        checkType: 'content',
        rules: ruleResults,
        overallStatus: overallResult.status,
        score: overallResult.score,
        recommendedActions: overallResult.recommendedActions,
        requiredActions: overallResult.requiredActions,
        timestamp: new Date().toISOString()
      }

      this.checks.set(complianceCheck.id, complianceCheck)
      await this.saveComplianceCheck(complianceCheck)

      componentLogger.performance('コンプライアンスチェック完了', Date.now() - startTime, {
        contentId,
        tenantId,
        rulesChecked: applicableRules.length,
        overallStatus: overallResult.status,
        score: overallResult.score
      })

      return complianceCheck
    } catch (error) {
      componentLogger.error('コンプライアンスチェックに失敗', error as Error)
      throw error
    }
  }

  // 個別ルールの評価
  private async evaluateRule(
    rule: ComplianceRule,
    content: { title: string; content: string; summary?: string; metadata?: Record<string, any> }
  ): Promise<ComplianceRuleResult> {
    const violations: ComplianceViolation[] = []
    const suggestions: string[] = []
    const fullText = `${content.title} ${content.content} ${content.summary || ''}`

    // キーワードチェック
    for (const keyword of rule.patterns.keywords) {
      const regex = new RegExp(keyword, 'gi')
      const matches = fullText.match(regex)
      if (matches) {
        matches.forEach((match, index) => {
          violations.push({
            type: 'keyword_violation',
            description: `禁止キーワード「${keyword}」が検出されました`,
            location: {
              field: this.findFieldContaining(content, match),
              context: this.getContext(fullText, match)
            },
            severity: rule.severity,
            suggestion: `「${keyword}」の表現を修正してください`
          })
        })
      }
    }

    // フレーズチェック
    for (const phrase of rule.patterns.phrases) {
      const regex = new RegExp(phrase, 'gi')
      if (regex.test(fullText)) {
        violations.push({
          type: 'phrase_violation',
          description: `禁止フレーズ「${phrase}」が検出されました`,
          location: {
            field: this.findFieldContaining(content, phrase),
            context: this.getContext(fullText, phrase)
          },
          severity: rule.severity,
          suggestion: `「${phrase}」の表現を別の言い回しに変更してください`
        })
      }
    }

    // 正規表現チェック
    for (const pattern of rule.patterns.regex) {
      const regex = new RegExp(pattern, 'gi')
      const matches = fullText.match(regex)
      if (matches) {
        matches.forEach(match => {
          violations.push({
            type: 'pattern_violation',
            description: `禁止パターンが検出されました: ${match}`,
            location: {
              field: this.findFieldContaining(content, match),
              context: this.getContext(fullText, match)
            },
            severity: rule.severity,
            suggestion: 'より適切な表現に修正してください'
          })
        })
      }
    }

    // アクションに基づく提案生成
    for (const action of rule.actions) {
      if (action.type === 'auto_disclaimer' && violations.length > 0) {
        suggestions.push(`免責事項を追加: ${action.params?.disclaimer}`)
      } else if (action.type === 'modify' && violations.length > 0) {
        suggestions.push(...(action.params?.suggestions || []))
      }
    }

    const status = violations.length === 0 ? 'pass' : 
                  violations.some(v => v.severity === 'critical') ? 'fail' : 'warn'

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status,
      violations,
      suggestions,
      confidence: 0.85 // 実際の実装では機械学習モデルの信頼度
    }
  }

  // 全体コンプライアンスの計算
  private calculateOverallCompliance(ruleResults: ComplianceRuleResult[]): {
    status: 'pass' | 'warn' | 'fail' | 'blocked'
    score: number
    recommendedActions: string[]
    requiredActions: string[]
  } {
    const totalRules = ruleResults.length
    const passedRules = ruleResults.filter(r => r.status === 'pass').length
    const failedRules = ruleResults.filter(r => r.status === 'fail').length
    const warningRules = ruleResults.filter(r => r.status === 'warn').length

    const score = Math.round((passedRules / totalRules) * 100)

    let status: 'pass' | 'warn' | 'fail' | 'blocked'
    if (failedRules > 0) {
      // クリティカルな違反があるかチェック
      const hasCriticalViolation = ruleResults.some(r => 
        r.violations.some(v => v.severity === 'critical')
      )
      status = hasCriticalViolation ? 'blocked' : 'fail'
    } else if (warningRules > 0) {
      status = 'warn'
    } else {
      status = 'pass'
    }

    const recommendedActions: string[] = []
    const requiredActions: string[] = []

    ruleResults.forEach(result => {
      if (result.status === 'fail') {
        requiredActions.push(...result.suggestions)
      } else if (result.status === 'warn') {
        recommendedActions.push(...result.suggestions)
      }
    })

    return {
      status,
      score,
      recommendedActions: [...new Set(recommendedActions)],
      requiredActions: [...new Set(requiredActions)]
    }
  }

  // コンプライアンスレポート生成
  public async generateComplianceReport(
    tenantId: string,
    period: { from: string; to: string }
  ): Promise<ComplianceReport> {
    try {
      const checks = Array.from(this.checks.values()).filter(
        check => check.tenantId === tenantId &&
                check.timestamp >= period.from &&
                check.timestamp <= period.to
      )

      const totalChecks = checks.length
      const passedChecks = checks.filter(c => c.overallStatus === 'pass').length
      const passRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100

      // 違反統計
      const violations = { critical: 0, high: 0, medium: 0, low: 0 }
      const violationTypes = new Map<string, number>()

      checks.forEach(check => {
        check.rules.forEach(rule => {
          rule.violations.forEach(violation => {
            violations[violation.severity]++
            violationTypes.set(
              violation.type,
              (violationTypes.get(violation.type) || 0) + 1
            )
          })
        })
      })

      const topViolationTypes = Array.from(violationTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ 
          type, 
          count, 
          trend: 'stable' as const // 実際の実装では過去データと比較
        }))

      // ルールパフォーマンス
      const rulePerformance = Array.from(this.rules.values()).map(rule => ({
        ruleId: rule.id,
        ruleName: rule.name,
        triggerCount: checks.reduce((sum, check) => 
          sum + check.rules.filter(r => r.ruleId === rule.id && r.violations.length > 0).length, 0
        ),
        accuracy: 0.85 // 実際の実装では機械学習の精度
      }))

      const recommendations = [
        '定期的なコンプライアンス研修の実施',
        'AIコンテンツ生成時の事前チェック強化',
        '業界ガイドラインの最新版への準拠確認'
      ]

      const report: ComplianceReport = {
        tenantId,
        period,
        summary: {
          totalChecks,
          passRate,
          violations,
          topViolationTypes
        },
        rulePerformance,
        recommendations
      }

      componentLogger.business('コンプライアンスレポート生成', {
        tenantId,
        period,
        totalChecks,
        passRate
      })

      return report
    } catch (error) {
      componentLogger.error('コンプライアンスレポート生成に失敗', error as Error)
      throw error
    }
  }

  // 自動修正提案
  public async generateAutoFix(
    complianceCheck: ComplianceCheck
  ): Promise<{
    originalContent: string
    suggestedContent: string
    changes: Array<{ type: string; description: string; applied: boolean }>
  }> {
    // 実際の実装では、NLPと機械学習を使用して自動修正を提案
    const changes: Array<{ type: string; description: string; applied: boolean }> = []

    // 例: 免責事項の自動追加
    complianceCheck.rules.forEach(rule => {
      rule.violations.forEach(violation => {
        if (violation.type === 'keyword_violation') {
          changes.push({
            type: 'disclaimer_addition',
            description: `${violation.location.field}に免責事項を追加`,
            applied: false
          })
        }
      })
    })

    return {
      originalContent: '', // 元のコンテンツ
      suggestedContent: '', // 修正案
      changes
    }
  }

  // ヘルパーメソッド
  private findFieldContaining(
    content: { title: string; content: string; summary?: string },
    text: string
  ): string {
    if (content.title.includes(text)) return 'title'
    if (content.summary?.includes(text)) return 'summary'
    if (content.content.includes(text)) return 'content'
    return 'unknown'
  }

  private getContext(fullText: string, match: string, contextLength = 50): string {
    const index = fullText.indexOf(match)
    if (index === -1) return match

    const start = Math.max(0, index - contextLength)
    const end = Math.min(fullText.length, index + match.length + contextLength)
    
    return fullText.substring(start, end)
  }

  private async saveComplianceCheck(check: ComplianceCheck): Promise<void> {
    // 実際の実装では、データベースに保存
    componentLogger.debug('コンプライアンスチェックを保存', { checkId: check.id })
  }

  // カスタムルール管理
  public async addCustomRule(tenantId: string, rule: Omit<ComplianceRule, 'id'>): Promise<ComplianceRule> {
    const customRule: ComplianceRule = {
      ...rule,
      id: `custom_${tenantId}_${Date.now()}`
    }

    this.rules.set(customRule.id, customRule)
    
    componentLogger.business('カスタムコンプライアンスルール追加', {
      tenantId,
      ruleId: customRule.id,
      ruleName: customRule.name
    })

    return customRule
  }

  public async updateRule(ruleId: string, updates: Partial<ComplianceRule>): Promise<ComplianceRule> {
    const rule = this.rules.get(ruleId)
    if (!rule) {
      throw new AppError('Rule not found', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'RULE_NOT_FOUND',
        statusCode: 404
      })
    }

    const updatedRule = { ...rule, ...updates }
    this.rules.set(ruleId, updatedRule)

    return updatedRule
  }

  public getRules(jurisdiction?: string[]): ComplianceRule[] {
    const allRules = Array.from(this.rules.values())
    
    if (jurisdiction) {
      return allRules.filter(rule => 
        rule.jurisdiction.some(j => jurisdiction.includes(j))
      )
    }

    return allRules
  }
}

// シングルトンインスタンス
export const complianceEngine = ComplianceEngine.getInstance()