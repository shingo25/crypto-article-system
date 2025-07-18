import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { decrypt } from '@/lib/encryption'
// Prismaの生成されたクライアントから直接インポート
import { AIProvider, PrismaClient } from '@/generated/prisma'

// Node.js Runtime を明示的に指定（暗号化のため）
export const runtime = 'nodejs'

// GET /api/users/ai-settings/test - テスト用にAPIキーを復号化して返す
export async function GET(_request: NextRequest) {
  console.log('=== Environment Check ===')
  console.log('ENCRYPTION_KEY exists:', !!process.env.ENCRYPTION_KEY)
  console.log('ENCRYPTION_KEY length:', process.env.ENCRYPTION_KEY ? process.env.ENCRYPTION_KEY.length : 0)
  
  // JWTトークンから実際のユーザーIDを取得
  const { verifyAuth } = await import('@/lib/auth')
  const authenticatedUser = await verifyAuth(request)
  
  if (!authenticatedUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  
  const user = authenticatedUser
  
  console.log('=== AI Settings Test API Called ===')
  console.log('User:', user.userId, user.email)
  
  const searchParams = request.nextUrl.searchParams
  const providerParam = searchParams.get('provider')
  let provider: AIProvider | undefined
  
  try {
    console.log('Provider param from query:', providerParam)
    
    if (!providerParam) {
    return NextResponse.json(
      { error: 'プロバイダー名が必要です' },
      { status: 400 }
    )
    }

    // プロバイダー名をPrismaのEnum形式に変換（小文字 -> 大文字）
    provider = providerParam.toUpperCase() as AIProvider
    console.log('Converted provider:', provider)
    
    // AIProvider enumの存在確認
    if (!AIProvider) {
    console.error('AIProvider enum is undefined! Prisma client may not be generated correctly.')
    return NextResponse.json(
      { error: 'システムエラー: AIプロバイダーの定義が見つかりません' },
      { status: 500 }
    )
    }
    
    console.log('AIProvider enum:', AIProvider)
    console.log('Available providers:', Object.values(AIProvider))

    // 有効なプロバイダーかチェック（手動で配列定義してフォールバック）
    const validProviders = AIProvider ? Object.values(AIProvider) : ['OPENAI', 'CLAUDE', 'GEMINI']
    if (!validProviders.includes(provider)) {
    console.log('Provider validation failed')
    return NextResponse.json(
      { error: `サポートされていないプロバイダーです: ${providerParam}` },
      { status: 400 }
    )
    }

    console.log('Finding setting with:', {
      userId: user.userId,
      provider: provider,
      isActive: true
    })
    
    // 新しいPrismaクライアントインスタンスを使用
    const freshPrisma = new PrismaClient()
    
    try {
      const setting = await freshPrisma.aIProviderSettings.findFirst({
        where: {
          userId: user.userId,
          provider: provider,
          isActive: true
        },
        select: {
          id: true,
          provider: true,
          model: true,
          apiKey: true,
          temperature: true,
          maxTokens: true,
          topP: true,
          frequencyPenalty: true,
          presencePenalty: true,
          isDefault: true
        }
      })

      console.log('Database query result:', {
        found: setting ? 'Yes' : 'No',
        settingId: setting?.id,
        provider: setting?.provider,
        model: setting?.model,
        hasApiKey: !!setting?.apiKey
      })
      
      if (!setting) {
        console.log('Setting not found for provider:', provider)
        return NextResponse.json(
          { error: `${provider}の設定が見つかりません` },
          { status: 404 }
        )
      }

    console.log('Decrypting API key...')
    let decryptedApiKey: string
    
    try {
      // APIキーを復号化
      decryptedApiKey = decrypt(setting.apiKey)
      console.log('Decryption successful')
    } catch (decryptError) {
      console.error('Decryption failed:', decryptError)
      return NextResponse.json(
        { 
          error: '暗号化されたAPIキーの復号化に失敗しました',
          details: process.env.NODE_ENV === 'development' ? {
            message: decryptError instanceof Error ? decryptError.message : String(decryptError),
            provider: provider
          } : undefined
        },
        { status: 500 }
      )
    }

    // 実際のAI APIに接続テスト
    console.log('Testing actual AI API connection...')
    try {
      let testResult: any
      
      if (provider === 'GEMINI') {
        // Gemini APIテスト
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${decryptedApiKey}`
        const requestBody = {
          contents: [{
            parts: [{
              text: "Hello, test message"
            }]
          }]
        }
        
        console.log('=== Gemini API Request ===')
        console.log('URL:', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=***')
        console.log('Request Body:', JSON.stringify(requestBody, null, 2))
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        })
        
        console.log('Response Status:', response.status)
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()))
        
        testResult = await response.json()
        console.log('Response Body:', JSON.stringify(testResult, null, 2))
        
        if (!response.ok) {
          console.error('Gemini API Error Details:', testResult)
          throw new Error(`Gemini API error: ${testResult.error?.message || 'Unknown error'}`)
        }
        
      } else if (provider === 'OPENAI') {
        // OpenAI APIテスト
        console.log('=== OpenAI API Request ===')
        console.log('Model:', setting.model || 'gpt-3.5-turbo')
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${decryptedApiKey}`
          },
          body: JSON.stringify({
            model: setting.model || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hello, test message' }],
            max_tokens: 10
          })
        })
        
        console.log('Response Status:', response.status)
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()))
        
        testResult = await response.json()
        console.log('Response Body:', JSON.stringify(testResult, null, 2))
        
        if (!response.ok) {
          console.error('OpenAI API Error Details:', testResult)
          throw new Error(`OpenAI API error: ${testResult.error?.message || testResult.error?.type || 'Unknown error'}`)
        }
        
      } else if (provider === 'CLAUDE') {
        // Claude APIテスト
        console.log('=== Claude API Request ===')
        console.log('Model:', setting.model || 'claude-3-haiku-20240307')
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': decryptedApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: setting.model || 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hello, test message' }]
          })
        })
        
        console.log('Response Status:', response.status)
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()))
        
        testResult = await response.json()
        console.log('Response Body:', JSON.stringify(testResult, null, 2))
        
        if (!response.ok) {
          console.error('Claude API Error Details:', testResult)
          throw new Error(`Claude API error: ${testResult.error?.message || testResult.error?.type || 'Unknown error'}`)
        }
      }
      
      console.log('AI API test successful')
      
      return NextResponse.json({
        success: true,
        message: `${provider} APIへの接続テストに成功しました`,
        data: {
          provider: setting.provider,
          model: setting.model,
          tested: true
        }
      })
      
    } catch (apiError) {
      console.error('AI API test failed:', apiError)
      return NextResponse.json(
        { 
          error: `${provider} APIへの接続に失敗しました`,
          details: process.env.NODE_ENV === 'development' ? {
            message: apiError instanceof Error ? apiError.message : String(apiError),
            provider: provider
          } : undefined
        },
        { status: 400 }
      )
    }
    } finally {
      await freshPrisma.$disconnect()
    }
    } catch (error) {
    console.error('Failed to fetch AI setting for test:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      provider: providerParam,
      convertedProvider: provider,
      userId: user?.userId,
      errorType: error?.constructor?.name
    })
    
    // エラーの詳細をレスポンスに含める（開発環境のみ）
    let errorMessage = 'AI設定の取得に失敗しました'
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // 特定のエラーメッセージをより分かりやすく
      if (error.message.includes('Cannot convert undefined or null to object')) {
        errorMessage = 'システムエラー: AIプロバイダーの定義が読み込めません'
      } else if (error.message.includes('ENCRYPTION_KEY')) {
        errorMessage = '暗号化キーが設定されていません'
      }
    }
    
    const errorDetails = process.env.NODE_ENV === 'development' ? {
      message: error instanceof Error ? error.message : String(error),
      provider: providerParam,
      convertedProvider: provider,
      errorType: error?.constructor?.name,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined
    } : undefined
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    )
    }
}