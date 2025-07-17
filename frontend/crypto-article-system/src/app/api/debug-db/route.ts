import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  console.log('=== Debug DB API Called ===')
  
  try {
    // ユーザーの確認
    const user = await prisma.user.findUnique({
      where: { email: 'admin@test.com' }
    })
    
    console.log('User found:', user ? 'Yes' : 'No')
    console.log('User ID:', user?.id)
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found',
        email: 'admin@test.com'
      })
    }
    
    // AI設定の確認
    const settings = await prisma.aIProviderSettings.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        apiKey: true,
        isActive: true
      }
    })
    
    console.log('Settings found:', settings.length)
    settings.forEach((setting, index) => {
      console.log(`Setting ${index + 1}:`, {
        provider: setting.provider,
        apiKeyLength: setting.apiKey ? setting.apiKey.length : 0,
        isActive: setting.isActive
      })
    })
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      settings: settings.map(setting => ({
        provider: setting.provider,
        apiKeyLength: setting.apiKey ? setting.apiKey.length : 0,
        isActive: setting.isActive
      }))
    })
    
  } catch (error) {
    console.error('Debug DB failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}