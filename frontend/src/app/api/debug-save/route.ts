import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'

export const runtime = 'nodejs'

export async function POST(_request: NextRequest) {
  console.log('=== Debug Save API Called ===')
  
  try {
    const body = await request.json()
    const { apiKey } = body
    
    console.log('Received API key length:', apiKey ? apiKey.length : 0)
    
    if (!apiKey || apiKey.length === 0) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }
    
    // 暗号化テスト
    console.log('Testing encryption...')
    const encrypted = encrypt(apiKey)
    console.log('Encryption successful, length:', encrypted.length)
    
    // 直接ユーザーIDを使用（テストAPIと同じ）
    const userId = 'cmcx75k240000szwr35lbgofu'
    console.log('Using user ID:', userId)
    
    // 既存設定削除
    await prisma.aIProviderSettings.deleteMany({
      where: {
        userId: userId,
        provider: 'GEMINI'
      }
    })
    
    console.log('Existing GEMINI settings deleted')
    
    // 新規作成
    const newSetting = await prisma.aIProviderSettings.create({
      data: {
        userId: userId,
        provider: 'GEMINI',
        model: 'gemini-2.5-pro',
        apiKey: encrypted,
        temperature: 0.6,
        maxTokens: 2500,
        topP: 0.85,
        frequencyPenalty: 0,
        presencePenalty: 0,
        isDefault: false,
        isActive: true
      }
    })
    
    console.log('New GEMINI setting created:', newSetting.id)
    
    return NextResponse.json({
      success: true,
      message: 'GEMINI API key saved successfully',
      encryptedLength: encrypted.length,
      settingId: newSetting.id
    })
    
  } catch (error) {
    console.error('Debug save failed:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}