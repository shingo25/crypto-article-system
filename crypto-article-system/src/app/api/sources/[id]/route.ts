import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'

const logger = createLogger('SourceAPI')

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {

    const body = await request.json()
    const { active } = body

    const source = await prisma.rSSSource.update({
      where: { id: params.id },
      data: {
        enabled: active,
        status: active ? 'active' : 'inactive'
      }
    })

    logger.info('RSSソースを更新', { sourceId: params.id, active })

    return NextResponse.json({
      success: true,
      source: {
        id: source.id,
        name: source.name,
        active: source.enabled
      }
    })
  } catch (error) {
    logger.error('RSSソース更新エラー', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to update RSS source' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {

    await prisma.rSSSource.delete({
      where: { id: params.id }
    })

    logger.info('RSSソースを削除', { sourceId: params.id })

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    logger.error('RSSソース削除エラー', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete RSS source' },
      { status: 500 }
    )
  }
}