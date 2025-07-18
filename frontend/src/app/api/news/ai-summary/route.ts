import { NextRequest, NextResponse } from 'next/server'

interface SummaryRequest {
  title: string
  content: string
  ai_provider?: 'openai' | 'anthropic' | 'gemini'
  ai_model?: string
  temperature?: number
  max_tokens?: number
}

// AI設定をlocalStorageから取得する代わりに、デフォルト設定を使用
function getDefaultAIConfig() {
  return {
    ai_provider: 'gemini' as const,
    ai_model: 'gemini-1.5-pro',
    temperature: 0.3,
    max_tokens: 150
  }
}

// AI要約生成のモック関数
function generateMockAISummary(title: string, content: string, config: any): string {
  const { ai_provider, ai_model, temperature } = config
  
  // タイトルとコンテンツから重要なキーワードを抽出
  const keywords = extractKeywords(title, content)
  
  // 要約パターンをいくつか用意
  const summaryPatterns = [
    `${keywords.main}に関する重要な動向。${keywords.action}が${keywords.effect}に影響を与えている。`,
    `${keywords.main}の最新情報。${keywords.trend}により${keywords.impact}が期待される。`,
    `${keywords.main}について：${keywords.detail}。市場への影響と今後の展望を分析。`,
    `${keywords.main}の動向分析。${keywords.factor}が重要な要因として注目されている。`
  ]
  
  // ランダムにパターンを選択（temperatureに基づいて）
  const patternIndex = Math.floor(temperature * summaryPatterns.length)
  let summary = summaryPatterns[patternIndex] || summaryPatterns[0]
  
  // AI プロバイダーに応じた調整
  if (ai_provider === 'anthropic') {
    summary += ' 詳細な分析と洞察を提供。'
  } else if (ai_provider === 'openai') {
    summary += ' 実践的な視点から解説。'
  } else {
    summary += ' 包括的な情報でお届け。'
  }
  
  return summary
}

// キーワード抽出のヘルパー関数
function extractKeywords(title: string, content: string) {
  const text = (title + ' ' + content).toLowerCase()
  
  // 仮想通貨関連のキーワードマッピング
  const cryptoKeywords = {
    'bitcoin': 'ビットコイン',
    'btc': 'ビットコイン', 
    'ethereum': 'イーサリアム',
    'eth': 'イーサリアム',
    'solana': 'Solana',
    'sol': 'Solana',
    'defi': 'DeFi',
    'nft': 'NFT',
    'etf': 'ETF',
    'staking': 'ステーキング'
  }
  
  const actionKeywords = {
    'price': '価格変動',
    'inflow': '資金流入',
    'investment': '投資',
    'launch': '新規ローンチ',
    'security': 'セキュリティ対策',
    'vulnerability': '脆弱性発見',
    'upgrade': 'アップグレード'
  }
  
  // キーワードを検出
  let main = 'cryptocurrency'
  let action = '市場動向'
  
  for (const [en, jp] of Object.entries(cryptoKeywords)) {
    if (text.includes(en)) {
      main = jp
      break
    }
  }
  
  for (const [en, jp] of Object.entries(actionKeywords)) {
    if (text.includes(en)) {
      action = jp
      break
    }
  }
  
  return {
    main,
    action,
    effect: '市場',
    trend: '最新の動向',
    impact: '注目',
    detail: '重要な発表',
    factor: '技術的要因'
  }
}

export async function POST(_request: NextRequest) {
  try {
    const body = await request.json() as SummaryRequest
    
    // 必須フィールドの検証
    if (!body.title || !body.content) {
      return NextResponse.json({
        success: false,
        error: 'title and content are required'
      }, { status: 400 })
    }
    
    // AI設定の取得（デフォルト値使用）
    const aiConfig = {
      ...getDefaultAIConfig(),
      ...body // リクエストで指定された設定で上書き
    }
    
    // AI処理時間をシミュレート
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
    
    // AI要約の生成
    const aiSummary = generateMockAISummary(body.title, body.content, aiConfig)
    
    return NextResponse.json({
      success: true,
      data: {
        aiSummary,
        config: aiConfig,
        processingTime: `${(1000 + Math.random() * 1000).toFixed(0)}ms`,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('AI Summary generation error:', error)
    return NextResponse.json({
      success: false,
      error: 'AI要約の生成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}