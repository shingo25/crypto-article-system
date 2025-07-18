import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
  console.log('=== Debug Fresh Prisma Client ===')
  
  try {
    // 新しいPrismaクライアントインスタンスを作成
    const freshPrisma = new PrismaClient()
    
    // GEMINI設定を検索
    const geminiSetting = await freshPrisma.aIProviderSettings.findFirst({
      where: {
        provider: 'GEMINI',
        isActive: true,
        user: {
          email: 'admin@test.com'
        }
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
    
    await freshPrisma.$disconnect()
    
    return NextResponse.json({
      geminiSetting: geminiSetting ? {
        id: geminiSetting.id,
        provider: geminiSetting.provider,
        model: geminiSetting.model,
        apiKeyLength: geminiSetting.apiKey ? geminiSetting.apiKey.length : 0,
        apiKeyPreview: geminiSetting.apiKey ? geminiSetting.apiKey.substring(0, 20) + '...' : 'null',
        isActive: geminiSetting.isActive,
        user: geminiSetting.user
      } : null
    })
    
  } catch (error) {
    console.error('Debug fresh failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}