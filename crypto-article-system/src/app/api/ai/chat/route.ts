import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// AI チャットリクエストのスキーマ
const aiChatRequestSchema = z.object({
  provider: z.enum(['OPENAI', 'CLAUDE', 'GEMINI']),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(100000).optional(),
  stream: z.boolean().optional().default(false)
})

// POST /api/ai/chat - AI APIへのプロキシ
export async function POST(request: NextRequest) {
  return requireAuth(async (req, user) => {
    try {
      const body = await request.json()
      
      // バリデーション
      const validation = aiChatRequestSchema.safeParse(body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'バリデーションエラー', details: validation.error.errors },
          { status: 400 }
        )
      }
      
      const { provider, messages, temperature, maxTokens, stream } = validation.data
      
      // ユーザーのAI設定を取得
      const setting = await prisma.aIProviderSettings.findUnique({
        where: {
          userId_provider: {
            userId: user.userId,
            provider: provider
          }
        }
      })
      
      if (!setting || !setting.isActive) {
        return NextResponse.json(
          { error: `${provider} の設定が見つからないか、無効になっています` },
          { status: 404 }
        )
      }
      
      // プロバイダーごとにAPI呼び出し
      let response
      switch (provider) {
        case 'OPENAI':
          response = await callOpenAI({
            apiKey: setting.apiKey,
            model: setting.model,
            messages,
            temperature: temperature ?? setting.temperature,
            maxTokens: maxTokens ?? setting.maxTokens,
            topP: setting.topP,
            frequencyPenalty: setting.frequencyPenalty,
            presencePenalty: setting.presencePenalty,
            stream
          })
          break
          
        case 'CLAUDE':
          response = await callClaude({
            apiKey: setting.apiKey,
            model: setting.model,
            messages,
            temperature: temperature ?? setting.temperature,
            maxTokens: maxTokens ?? setting.maxTokens,
            topP: setting.topP,
            stream
          })
          break
          
        case 'GEMINI':
          response = await callGemini({
            apiKey: setting.apiKey,
            model: setting.model,
            messages,
            temperature: temperature ?? setting.temperature,
            maxTokens: maxTokens ?? setting.maxTokens,
            topP: setting.topP,
            stream
          })
          break
          
        default:
          return NextResponse.json(
            { error: 'サポートされていないプロバイダーです' },
            { status: 400 }
          )
      }
      
      // 使用状況を更新
      await prisma.aIProviderSettings.update({
        where: { id: setting.id },
        data: { lastUsed: new Date() }
      })
      
      return NextResponse.json({
        success: true,
        data: response
      })
    } catch (error) {
      console.error('AI chat error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'AI API呼び出しに失敗しました' },
        { status: 500 }
      )
    }
  })(request)
}

// OpenAI API呼び出し
async function callOpenAI(params: {
  apiKey: string
  model: string
  messages: Array<{ role: string; content: string }>
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  stream: boolean
}) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      frequency_penalty: params.frequencyPenalty,
      presence_penalty: params.presencePenalty,
      stream: params.stream
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }
  
  return await response.json()
}

// Claude API呼び出し
async function callClaude(params: {
  apiKey: string
  model: string
  messages: Array<{ role: string; content: string }>
  temperature: number
  maxTokens: number
  topP: number
  stream: boolean
}) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      stream: params.stream
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${error}`)
  }
  
  return await response.json()
}

// Gemini API呼び出し
async function callGemini(params: {
  apiKey: string
  model: string
  messages: Array<{ role: string; content: string }>
  temperature: number
  maxTokens: number
  topP: number
  stream: boolean
}) {
  // Gemini APIのフォーマットに変換
  const contents = params.messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : msg.role,
    parts: [{ text: msg.content }]
  }))
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: params.temperature,
        maxOutputTokens: params.maxTokens,
        topP: params.topP
      }
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }
  
  return await response.json()
}