import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { aiProviderSettingsSchema, createValidationMiddleware } from '@/lib/validation'
import { encrypt, maskApiKey } from '@/lib/encryption'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const logs: string[] = []
  
  const log = (message: string) => {
    console.log(message)
    logs.push(`[${new Date().toISOString()}] ${message}`)
  }
  
  return requireAuth(async (req, user) => {
    try {
      log('=== Debug Save Settings API Called ===')
      log(`User authenticated: ${user.userId} (${user.email})`)
      
      const body = await request.json()
      log(`Request body received: ${JSON.stringify({ 
        provider: body.provider,
        model: body.model,
        apiKey: body.apiKey ? `${body.apiKey.substring(0, 10)}... (length: ${body.apiKey.length})` : 'MISSING',
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        isDefault: body.isDefault
      })}`)
      
      // バリデーション
      log('Starting validation...')
      const validator = createValidationMiddleware(aiProviderSettingsSchema)
      const validation = validator(body)
      
      if (!validation.success) {
        log(`Validation failed: ${JSON.stringify(validation.errors)}`)
        return NextResponse.json({
          error: 'バリデーションエラー', 
          details: validation.errors,
          logs
        }, { status: 400 })
      }
      
      log('Validation passed')
      const data = validation.data
      
      // 既存の設定があるかチェック
      log('Checking for existing setting...')
      const existingSetting = await prisma.aIProviderSettings.findUnique({
        where: {
          userId_provider: {
            userId: user.userId,
            provider: data.provider
          }
        }
      })
      
      log(`Existing setting found: ${existingSetting ? 'Yes' : 'No'}`)
      let setting
      
      if (existingSetting) {
        // 更新
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
        
        if (data.apiKey) {
          log('Encrypting API key for update...')
          try {
            updateData.apiKey = encrypt(data.apiKey)
            log('API key encrypted successfully')
          } catch (error) {
            log(`Encryption error: ${error instanceof Error ? error.message : String(error)}`)
            return NextResponse.json({
              error: '暗号化エラー',
              details: error instanceof Error ? error.message : String(error),
              logs
            }, { status: 500 })
          }
        }
        
        log('Updating existing setting...')
        setting = await prisma.aIProviderSettings.update({
          where: { id: existingSetting.id },
          data: updateData
        })
        log('Setting updated successfully')
      } else {
        // 新規作成
        log('Creating new setting...')
        if (!data.apiKey) {
          log('API key is required for new setting')
          return NextResponse.json({
            error: 'APIキーは必須です',
            logs
          }, { status: 400 })
        }
        
        log('Encrypting API key for creation...')
        let encryptedApiKey
        try {
          encryptedApiKey = encrypt(data.apiKey)
          log('API key encrypted successfully')
        } catch (error) {
          log(`Encryption error: ${error instanceof Error ? error.message : String(error)}`)
          return NextResponse.json({
            error: '暗号化エラー',
            details: error instanceof Error ? error.message : String(error),
            logs
          }, { status: 500 })
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
        log('Setting created successfully')
      }
      
      // デフォルト設定の場合、他の設定のデフォルトを無効化
      if (data.isDefault) {
        log('Updating other settings to non-default...')
        await prisma.aIProviderSettings.updateMany({
          where: {
            userId: user.userId,
            id: { not: setting.id }
          },
          data: {
            isDefault: false
          }
        })
        log('Other settings updated to non-default')
      }
      
      log('=== Debug Save Settings Success ===')
      return NextResponse.json({
        success: true,
        data: {
          ...setting,
          apiKey: maskApiKey(setting.apiKey)
        },
        logs
      }, { status: existingSetting ? 200 : 201 })
      
    } catch (error) {
      log(`=== Debug Save Settings Error ===`)
      log(`Error details: ${error instanceof Error ? error.message : String(error)}`)
      log(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`)
      
      return NextResponse.json({
        error: 'AI設定の保存に失敗しました',
        details: error instanceof Error ? error.message : String(error),
        logs
      }, { status: 500 })
    }
  })(request)
}