import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'

const logger = createLogger('SourceAPI')

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const body = await request.json()
    const { active } = body

    const source = await prisma.rSSSource.update({
      where: { id: resolvedParams.id },
      data: {
        enabled: active,
        status: active ? 'active' : 'inactive'
      }
    })

    logger.info('RSSソースを更新', { sourceId: resolvedParams.id, active })

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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    await prisma.rSSSource.delete({
      where: { id: resolvedParams.id }
    })

    logger.info('RSSソースを削除', { sourceId: resolvedParams.id })

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