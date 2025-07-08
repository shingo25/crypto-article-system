import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { aiProviderSettingsSchema, createValidationMiddleware } from '@/lib/validation'
import { maskApiKey } from '@/lib/encryption'
import { protectCSRF } from '@/lib/csrf-middleware'
import { z } from 'zod'

// Node.js Runtime を明示的に指定（Redis/暗号化のため）
export const runtime = 'nodejs'

// GET /api/users/ai-settings - 現在のユーザーの全AI設定を取得
export async function GET(request: NextRequest) {
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
})(request)
}

// POST /api/users/ai-settings - 新しいAI設定を作成/更新
export const POST = protectCSRF(async (request: NextRequest) => {
  return requireAuth(async (req, user) => {
  try {
    const body = await request.json()
    
    // バリデーション
    const validator = createValidationMiddleware(aiProviderSettingsSchema)
    const validation = validator(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      )
    }
    
    const data = validation.data
    
    // 既存の設定があるかチェック
    const existingSetting = await prisma.aIProviderSettings.findUnique({
      where: {
        userId_provider: {
          userId: user.userId,
          provider: data.provider
        }
      }
    })
    
    let setting
    
    if (existingSetting) {
      // 更新
      setting = await prisma.aIProviderSettings.update({
        where: { id: existingSetting.id },
        data: {
          model: data.model,
          apiKey: data.apiKey,
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
    } else {
      // 新規作成
      setting = await prisma.aIProviderSettings.create({
        data: {
          userId: user.userId,
          provider: data.provider,
          model: data.model,
          apiKey: data.apiKey,
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
    }
    
    // デフォルト設定の場合、他の設定のデフォルトを無効化
    if (data.isDefault) {
      await prisma.aIProviderSettings.updateMany({
        where: {
          userId: user.userId,
          id: { not: setting.id }
        },
        data: {
          isDefault: false
        }
      })
    }
    
    // レスポンスでAPIキーをマスク化
    const response = {
      ...setting,
      apiKey: maskApiKey(setting.apiKey)
    }
    
    return NextResponse.json({
      success: true,
      data: response
    }, { status: existingSetting ? 200 : 201 })
  } catch (error) {
    console.error('Failed to save AI settings:', error)
    return NextResponse.json(
      { error: 'AI設定の保存に失敗しました' },
      { status: 500 }
    )
  }
  })(request)
})