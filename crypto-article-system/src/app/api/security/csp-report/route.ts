import { NextRequest, NextResponse } from 'next/server'

interface CSPViolationReport {
  'csp-report': {
    'document-uri': string
    'referrer': string
    'violated-directive': string
    'effective-directive': string
    'original-policy': string
    'disposition': string
    'blocked-uri': string
    'status-code': number
    'script-sample': string
  }
}

/**
 * CSP違反レポートを受信するエンドポイント
 * POST /api/security/csp-report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CSPViolationReport
    const report = body['csp-report']
    
    if (!report) {
      return NextResponse.json({ error: 'Invalid CSP report format' }, { status: 400 })
    }
    
    // CSP違反の詳細をログに記録
    const violation = {
      timestamp: new Date().toISOString(),
      documentUri: report['document-uri'],
      referrer: report['referrer'],
      violatedDirective: report['violated-directive'],
      effectiveDirective: report['effective-directive'],
      originalPolicy: report['original-policy'],
      disposition: report['disposition'],
      blockedUri: report['blocked-uri'],
      statusCode: report['status-code'],
      scriptSample: report['script-sample'],
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           request.headers.get('cf-connecting-ip') || 
           'unknown'
    }
    
    // 本番環境では専用のログシステムに送信することを推奨
    console.warn('CSP Violation Report:', JSON.stringify(violation, null, 2))
    
    // 重要な違反（script-src、object-src等）の場合は特別な処理
    if (isCriticalViolation(report['violated-directive'])) {
      console.error('CRITICAL CSP Violation:', violation)
      
      // 本番環境では、アラートシステムに通知
      // await sendSecurityAlert('CSP_VIOLATION', violation)
    }
    
    // 違反統計の更新（本番環境では専用DBに保存）
    await updateViolationStats(violation)
    
    return NextResponse.json({ success: true }, { status: 200 })
    
  } catch (error) {
    console.error('CSP report processing error:', error)
    return NextResponse.json({ error: 'Failed to process CSP report' }, { status: 500 })
  }
}

/**
 * 重要なCSP違反かどうかを判定
 */
function isCriticalViolation(violatedDirective: string): boolean {
  const criticalDirectives = [
    'script-src',
    'object-src',
    'base-uri',
    'form-action'
  ]
  
  return criticalDirectives.some(directive => 
    violatedDirective.startsWith(directive)
  )
}

/**
 * 違反統計を更新（メモリベース、本番では永続化推奨）
 */
const violationStats = new Map<string, number>()

async function updateViolationStats(violation: any) {
  const key = `${violation.violatedDirective}:${violation.blockedUri}`
  const current = violationStats.get(key) || 0
  violationStats.set(key, current + 1)
  
  // 統計ログ出力（24時間ごとなど定期的に出力すると有用）
  if (current === 0) {
    console.info(`New CSP violation pattern detected: ${key}`)
  }
}

/**
 * 違反統計を取得（管理者用）
 * GET /api/security/csp-report
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（管理者のみアクセス可能）
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !isValidAdminAuth(authHeader)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const stats = Array.from(violationStats.entries()).map(([pattern, count]) => ({
      pattern,
      count,
      lastUpdated: new Date().toISOString()
    }))
    
    return NextResponse.json({
      totalViolations: Array.from(violationStats.values()).reduce((a, b) => a + b, 0),
      uniquePatterns: violationStats.size,
      violations: stats.sort((a, b) => b.count - a.count)
    })
    
  } catch (error) {
    console.error('CSP stats retrieval error:', error)
    return NextResponse.json({ error: 'Failed to retrieve CSP stats' }, { status: 500 })
  }
}

/**
 * 管理者認証チェック（簡易実装）
 */
function isValidAdminAuth(authHeader: string): boolean {
  // 本番環境では適切な認証システムを実装
  const token = authHeader.replace('Bearer ', '')
  const adminToken = process.env.CSP_ADMIN_TOKEN
  
  return adminToken && token === adminToken
}