import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { createLogger } from '@/lib/logger'
import { RSSParserService } from '@/lib/rss-parser-service'

const prisma = new PrismaClient()

const logger = createLogger('CollectAPI')

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {

    const source = await prisma.rSSSource.findUnique({
      where: { id: params.id }
    })

    if (!source) {
      return NextResponse.json(
        { success: false, error: 'Source not found' },
        { status: 404 }
      )
    }

    if (!source.enabled) {
      return NextResponse.json(
        { success: false, error: 'Source is disabled' },
        { status: 400 }
      )
    }

    logger.info('単一ソースからの収集を開始', { sourceId: params.id, url: source.url })

    const rssService = new RSSParserService()

    // 非同期で収集を実行
    rssService.fetchAndParseFeed(source.url)
      .then(async (items) => {
        const savedCount = await rssService.saveNewsItems(items)
        
        // ソースの統計を更新
        await prisma.rSSSource.update({
          where: { id: params.id },
          data: {
            lastCollected: new Date(),
            totalCollected: {
              increment: savedCount
            },
            status: 'active'
          }
        })

        logger.info('単一ソースからの収集が完了', {
          sourceId: params.id,
          itemsFound: items.length,
          itemsSaved: savedCount
        })
      })
      .catch(async (error) => {
        logger.error('単一ソースからの収集エラー', error as Error, { sourceId: params.id })
        
        // エラーステータスを更新
        await prisma.rSSSource.update({
          where: { id: params.id },
          data: { status: 'error' }
        })
      })

    return NextResponse.json({
      success: true,
      message: 'Collection started'
    })
  } catch (error) {
    logger.error('収集開始エラー', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to start collection' },
      { status: 500 }
    )
  }
}