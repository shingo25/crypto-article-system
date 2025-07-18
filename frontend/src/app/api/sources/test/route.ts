import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import Parser from 'rss-parser'

const logger = createLogger('TestSourceAPI')

export async function POST(_request: NextRequest) {
  try {

    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    logger.info('RSSフィードのテストを開始', { url })

    try {
      const parser = new Parser({ timeout: 10000 })
      const feed = await parser.parseURL(url)

      return NextResponse.json({
        success: true,
        valid: true,
        feedInfo: {
          title: feed.title,
          description: feed.description,
          link: feed.link,
          itemCount: feed.items.length,
          lastBuildDate: feed.lastBuildDate
        }
      })
    } catch (error) {
      logger.warn('RSSフィードのテストに失敗', { url, error })
      return NextResponse.json({
        success: true,
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid RSS feed'
      })
    }
  } catch (error) {
    logger.error('RSSテストエラー', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to test RSS feed' },
      { status: 500 }
    )
  }
}