import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { maskApiKey } from '@/lib/encryption'
import { protectCSRF } from '@/lib/csrf-middleware'
import { z } from 'zod'

// Node.js Runtime を明示的に指定（Redis/暗号化のため）
export const runtime = 'nodejs'

const providerSchema = z.enum(['OPENAI', 'CLAUDE', 'GEMINI'])

// GET /api/users/ai-settings/[provider] - 特定のプロバイダーの設定を取得
export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  return requireAuth(async (req, user) => {
    try {
      const provider = providerSchema.parse(params.provider)
      
      const setting = await prisma.aIProviderSettings.findUnique({
        where: {
          userId_provider: {
            userId: user.userId,
            provider: provider
          }
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
        }
      })
      
      if (!setting) {
        return NextResponse.json(
          { error: '設定が見つかりません' },
          { status: 404 }
        )
      }
      
      // APIキーをマスク化
      const maskedSetting = {
        ...setting,
        apiKey: maskApiKey(setting.apiKey)
      }
      
      return NextResponse.json({
        success: true,
        data: maskedSetting
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: '無効なプロバイダーです' },
          { status: 400 }
        )
      }
      
      console.error('Failed to fetch AI setting:', error)
      return NextResponse.json(
        { error: 'AI設定の取得に失敗しました' },
        { status: 500 }
      )
    }
  })(request)
}

// DELETE /api/users/ai-settings/[provider] - 特定のプロバイダーの設定を削除
export const DELETE = protectCSRF(async (request: NextRequest, { params }: { params: { provider: string } }) => {
  return requireAuth(async (req, user) => {
    try {
      const provider = providerSchema.parse(params.provider)
      
      const setting = await prisma.aIProviderSettings.findUnique({
        where: {
          userId_provider: {
            userId: user.userId,
            provider: provider
          }
        }
      })
      
      if (!setting) {
        return NextResponse.json(
          { error: '設定が見つかりません' },
          { status: 404 }
        )
      }
      
      // 設定を削除
      await prisma.aIProviderSettings.delete({
        where: { id: setting.id }
      })
      
      return NextResponse.json({
        success: true,
        message: '設定が削除されました'
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: '無効なプロバイダーです' },
          { status: 400 }
        )
      }
      
      console.error('Failed to delete AI setting:', error)
      return NextResponse.json(
        { error: 'AI設定の削除に失敗しました' },
        { status: 500 }
      )
    }
  })(request)
})