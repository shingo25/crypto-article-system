import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  console.log('=== Debug All Settings API Called ===')
  
  try {
    // すべてのユーザーとその設定を取得
    const allSettings = await prisma.aIProviderSettings.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
    
    console.log('Total settings found:', allSettings.length)
    
    return NextResponse.json({
      totalSettings: allSettings.length,
      settings: allSettings.map(setting => ({
        id: setting.id,
        user: setting.user,
        provider: setting.provider,
        model: setting.model,
        apiKeyLength: setting.apiKey ? setting.apiKey.length : 0,
        isActive: setting.isActive,
        isDefault: setting.isDefault,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt
      }))
    })
    
  } catch (error) {
    console.error('Debug all settings failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}