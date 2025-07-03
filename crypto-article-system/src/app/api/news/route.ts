import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'

const logger = createLogger('NewsAPI')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search')
    const source = searchParams.get('source')
    const importance = searchParams.get('importance')

    // ページネーションのオフセット計算
    const skip = (page - 1) * limit

    // フィルター条件の構築
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (source && source !== 'all') {
      where.source = source
    }

    if (importance && importance !== 'all') {
      if (importance === 'high') {
        where.importance = { gte: 8 }
      } else if (importance === 'medium') {
        where.AND = [
          { importance: { gte: 6 } },
          { importance: { lt: 8 } }
        ]
      } else if (importance === 'low') {
        where.importance = { lt: 6 }
      }
    }

    // ニュースアイテムを取得
    const [items, total] = await Promise.all([
      prisma.newsItem.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.newsItem.count({ where })
    ])

    // ソース一覧を取得
    const sources = await prisma.newsItem.findMany({
      select: { source: true },
      distinct: ['source']
    })

    return NextResponse.json({
      success: true,
      data: {
        items: items.map(item => ({
          id: item.id,
          title: item.title,
          summary: item.summary || '',
          content: item.content,
          url: item.url,
          imageUrl: item.imageUrl,
          source: item.source,
          author: item.author,
          sentiment: item.sentiment || 0,
          importance: item.importance,
          aiSummary: item.aiSummary,
          topics: item.topics || [],
          coins: item.coins || [],
          hasGeneratedArticle: item.hasGeneratedArticle,
          publishedAt: item.publishedAt.toISOString(),
          createdAt: item.createdAt.toISOString()
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        sources: sources.map(s => s.source)
      }
    })
  } catch (error) {
    logger.error('ニュース取得エラー', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news' },
      { status: 500 }
    )
  }
}

// 全ソースから収集を実行
export async function POST(request: NextRequest) {
  try {
    const { rssParser } = await import('@/lib/rss-parser-service')

    logger.info('全ソースからのニュース収集を開始')

    // 同期的に実行してエラーを捕捉
    try {
      const result = await rssParser.collectFromAllSources()
      logger.info('全ソースからのニュース収集が完了', result)
      
      return NextResponse.json({
        success: true,
        message: 'News collection completed',
        result
      })
    } catch (collectionError) {
      logger.error('全ソースからのニュース収集エラー', collectionError as Error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'News collection failed',
          details: collectionError instanceof Error ? collectionError.message : String(collectionError)
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('ニュース収集開始エラー', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to start news collection' },
      { status: 500 }
    )
  }
}