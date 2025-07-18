import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
  console.log('=== Debug Test API Called ===')
  
  try {
    // 認証確認
    const user = await verifyAuth(_request)
    
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    console.log('Authenticated user:', user)
    
    // GEMINI設定を検索（includeを使用してdebug-all-settingsと同じ方法）
    const geminiSetting = await prisma.aIProviderSettings.findFirst({
      where: {
        userId: user.userId,
        provider: 'GEMINI',
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        }
      }
    })
    
    console.log('GEMINI setting found:', geminiSetting ? 'Yes' : 'No')
    if (geminiSetting) {
      console.log('GEMINI setting details:', {
        id: geminiSetting.id,
        provider: geminiSetting.provider,
        model: geminiSetting.model,
        apiKeyRaw: geminiSetting.apiKey,
        apiKeyType: typeof geminiSetting.apiKey,
        apiKeyLength: geminiSetting.apiKey ? geminiSetting.apiKey.length : 0,
        apiKeyTruthy: !!geminiSetting.apiKey,
        isActive: geminiSetting.isActive
      })
    }
    
    // すべての設定も確認
    const allSettings = await prisma.aIProviderSettings.findMany({
      where: {
        userId: user.userId
      },
      select: {
        id: true,
        provider: true,
        apiKey: true,
        isActive: true
      }
    })
    
    return NextResponse.json({
      user: {
        userId: user.userId,
        email: user.email
      },
      geminiSetting: geminiSetting ? {
        id: geminiSetting.id,
        provider: geminiSetting.provider,
        model: geminiSetting.model,
        apiKeyType: typeof geminiSetting.apiKey,
        apiKeyLength: geminiSetting.apiKey ? geminiSetting.apiKey.length : 0,
        apiKeyTruthy: !!geminiSetting.apiKey,
        apiKeyPreview: geminiSetting.apiKey ? geminiSetting.apiKey.substring(0, 10) + '...' : 'null',
        isActive: geminiSetting.isActive
      } : null,
      allSettings: allSettings.map(s => ({
        id: s.id,
        provider: s.provider,
        apiKeyLength: s.apiKey ? s.apiKey.length : 0,
        isActive: s.isActive
      }))
    })
    
  } catch (error) {
    console.error('Debug test failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}