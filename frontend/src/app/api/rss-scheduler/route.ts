import { NextRequest, NextResponse } from 'next/server'

// モックスケジューラー状態
const schedulerState = {
  isRunning: false,
  lastRun: null as string | null,
  nextRun: null as string | null,
  itemsCollected: 0,
  errorCount: 0
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: schedulerState
    })
  } catch (error) {
    console.error('Scheduler status error:', error)
    return NextResponse.json(
      { success: false, error: 'スケジューラー状態の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'start') {
      schedulerState.isRunning = true
      schedulerState.lastRun = new Date().toISOString()
      schedulerState.nextRun = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5分後

      return NextResponse.json({
        success: true,
        message: 'RSSスケジューラーを開始しました',
        data: schedulerState
      })
    } else if (action === 'stop') {
      schedulerState.isRunning = false
      schedulerState.nextRun = null

      return NextResponse.json({
        success: true,
        message: 'RSSスケジューラーを停止しました',
        data: schedulerState
      })
    } else {
      return NextResponse.json(
        { success: false, error: '不正なアクションです' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Scheduler control error:', error)
    return NextResponse.json(
      { success: false, error: 'スケジューラー制御に失敗しました' },
      { status: 500 }
    )
  }
}