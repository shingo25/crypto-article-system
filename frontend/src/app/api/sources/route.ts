import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { createLogger } from '@/lib/logger'
import { rssSourceSchema, createValidationMiddleware } from '@/lib/validation'

const prisma = new PrismaClient()

const logger = createLogger('SourcesAPI')

export async function GET(request: NextRequest) {
  try {
    logger.info('RSSソース一覧取得開始')
    
    const sources = await prisma.rSSSource.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    logger.info('RSSソース取得成功', { count: sources.length })

    return NextResponse.json({
      success: true,
      sources: sources.map(source => ({
        id: source.id,
        name: source.name,
        url: source.url,
        type: source.category,
        description: source.description,
        active: source.enabled,
        lastUpdate: source.lastCollected?.toISOString(),
        itemsCollected: source.totalCollected,
        status: source.status
      }))
    })
  } catch (error) {
    logger.error('RSSソース取得エラー', error as Error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch RSS sources',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 入力検証
    const validate = createValidationMiddleware(rssSourceSchema)
    const validationResult = validate(body)
    
    if (!validationResult.success) {
      logger.warn('入力検証エラー', { errors: validationResult.errors })
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: validationResult.errors
        },
        { status: 400 }
      )
    }
    
    const { name, url, description, category } = validationResult.data

    // URLの重複チェック
    const existing = await prisma.rSSSource.findUnique({
      where: { url }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'URL already exists' },
        { status: 400 }
      )
    }

    const source = await prisma.rSSSource.create({
      data: {
        name,
        url,
        category: category || 'news',
        description
      }
    })

    logger.info('RSSソースを追加', { sourceId: source.id, name })

    return NextResponse.json({
      success: true,
      source: {
        id: source.id,
        name: source.name,
        url: source.url,
        type: source.category,
        description: source.description,
        active: source.enabled
      }
    })
  } catch (error) {
    logger.error('RSSソース追加エラー', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to add RSS source' },
      { status: 500 }
    )
  }
}