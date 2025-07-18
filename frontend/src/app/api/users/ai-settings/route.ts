import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { aiProviderSettingsSchema, createValidationMiddleware } from '@/lib/validation'
import { encrypt, maskApiKey } from '@/lib/encryption'
import { protectCSRF } from '@/lib/csrf-middleware'
import { z } from 'zod'

// Node.js Runtime を明示的に指定（Redis/暗号化のため）
export const runtime = 'nodejs'

// GET /api/users/ai-settings - 現在のユーザーの全AI設定を取得
export async function GET(_request: NextRequest) {
  return requireAuth(async (req, user) => {
  try {
    const settings = await prisma.aIProviderSettings.findMany({
      where: {
        userId: user.userId,
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
        advancedSettings: true,
        isDefault: true,
        isActive: true,
        lastUsed: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // APIキーをマスク化
    const maskedSettings = settings.map(setting => ({
      ...setting,
      apiKey: maskApiKey(setting.apiKey)
    }))

    return NextResponse.json({
      success: true,
      data: maskedSettings
    })
  } catch (error) {
    console.error('Failed to fetch AI settings:', error)
    return NextResponse.json(
      { error: 'AI設定の取得に失敗しました' },
      { status: 500 }
    )
  }
})(_request)
}

// POST /api/users/ai-settings - 新しいAI設定を作成/更新
export const POST = async (_request: NextRequest) => {
  return requireAuth(async (req, user) => {
    console.log('=== AI Settings POST Request ===')
    console.log('User authenticated:', user.userId)
  try {
    console.log('=== AI Settings POST Request Start ===')
    const body = await req.json()
    console.log('Request body received:', { 
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey ? `${body.apiKey.substring(0, 10)}... (length: ${body.apiKey.length})` : 'MISSING',
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      topP: body.topP,
      isDefault: body.isDefault,
      isActive: body.isActive
    })
    
    // バリデーション
    console.log('Starting validation...')
    const validator = createValidationMiddleware(aiProviderSettingsSchema)
    const validation = validator(body)
    
    if (!validation.success) {
      console.log('Validation failed:', validation.errors)
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      )
    }
    
    console.log('Validation passed')
    const data = validation.data
    console.log('Validated data:', { ...data, apiKey: data.apiKey ? `${data.apiKey.substring(0, 10)}...` : 'undefined' })
    
    // 既存の設定があるかチェック
    console.log('Checking for existing setting...')
    const existingSetting = await prisma.aIProviderSettings.findUnique({
      where: {
        userId_provider: {
          userId: user.userId,
          provider: data.provider
        }
      }
    })
    
    console.log('Existing setting found:', existingSetting ? 'Yes' : 'No')
    let setting
    
    if (existingSetting) {
      // 更新（APIキーが含まれていない場合は既存のAPIキーを保持）
      const updateData: any = {
        model: data.model,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        topP: data.topP,
        frequencyPenalty: data.frequencyPenalty,
        presencePenalty: data.presencePenalty,
        advancedSettings: data.advancedSettings,
        isDefault: data.isDefault,
        isActive: data.isActive
      }
      
      // APIキーが提供されている場合のみ更新
      if (data.apiKey) {
        console.log('Encrypting API key for update...')
        try {
          updateData.apiKey = encrypt(data.apiKey)
          console.log('API key encrypted successfully')
        } catch (error) {
          console.error('Encryption error:', error)
          throw error
        }
      }
      
      console.log('Updating existing setting...')
      setting = await prisma.aIProviderSettings.update({
        where: { id: existingSetting.id },
        data: updateData
      })
      console.log('Setting updated successfully')
    } else {
      // 新規作成（APIキーは必須）
      console.log('Creating new setting...')
      if (!data.apiKey) {
        console.log('API key is required for new setting')
        return NextResponse.json(
          { error: 'バリデーションエラー', details: [{ field: 'apiKey', message: 'APIキーは必須です', code: 'required' }] },
          { status: 400 }
        )
      }
      
      console.log('Encrypting API key for creation...')
      let encryptedApiKey
      try {
        encryptedApiKey = encrypt(data.apiKey)
        console.log('API key encrypted successfully')
      } catch (error) {
        console.error('Encryption error:', error)
        throw error
      }
      
      setting = await prisma.aIProviderSettings.create({
        data: {
          userId: user.userId,
          provider: data.provider,
          model: data.model,
          apiKey: encryptedApiKey,
          temperature: data.temperature,
          maxTokens: data.maxTokens,
          topP: data.topP,
          frequencyPenalty: data.frequencyPenalty,
          presencePenalty: data.presencePenalty,
          advancedSettings: data.advancedSettings,
          isDefault: data.isDefault,
          isActive: data.isActive
        }
      })
      console.log('Setting created successfully')
    }
    
    // デフォルト設定の場合、他の設定のデフォルトを無効化
    if (data.isDefault) {
      console.log('Updating other settings to non-default...')
      await prisma.aIProviderSettings.updateMany({
        where: {
          userId: user.userId,
          id: { not: setting.id }
        },
        data: {
          isDefault: false
        }
      })
      console.log('Other settings updated to non-default')
    }
    
    // レスポンスでAPIキーをマスク化
    console.log('Masking API key for response...')
    const response = {
      ...setting,
      apiKey: maskApiKey(setting.apiKey)
    }
    
    console.log('=== AI Settings POST Request Success ===')
    return NextResponse.json({
      success: true,
      data: response
    }, { status: existingSetting ? 200 : 201 })
  } catch (error) {
    console.error('=== AI Settings POST Request Error ===')
    console.error('Error details:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // エラーの種類に応じてメッセージを調整
    let errorMessage = 'AI設定の保存に失敗しました'
    
    if (error instanceof Error) {
      if (error.message.includes('ENCRYPTION_KEY')) {
        errorMessage = '暗号化設定が正しくありません'
      } else if (error.message.includes('Prisma') || error.message.includes('database')) {
        errorMessage = 'データベース接続エラーが発生しました'
      } else if (error.message.includes('validation')) {
        errorMessage = 'データの検証でエラーが発生しました'
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
      },
      { status: 500 }
    )
  }
  })(_request)
}