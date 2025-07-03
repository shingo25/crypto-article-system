import { NextResponse } from 'next/server'
import { initializeApplication, getInitializationStatus, checkApplicationHealth } from '@/lib/app-initializer'
import { createLogger } from '@/lib/logger'

const logger = createLogger('InitAPI')

/**
 * アプリケーション初期化状態の取得
 */
export async function GET() {
  try {
    const status = getInitializationStatus()
    const health = checkApplicationHealth()
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        health
      }
    })
  } catch (error) {
    logger.error('初期化状態取得エラー', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to get initialization status' },
      { status: 500 }
    )
  }
}

/**
 * アプリケーションの手動初期化
 */
export async function POST() {
  try {
    logger.info('手動初期化が要求されました')
    await initializeApplication()
    
    const status = getInitializationStatus()
    
    return NextResponse.json({
      success: true,
      message: 'Application initialized successfully',
      data: status
    })
  } catch (error) {
    logger.error('手動初期化エラー', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to initialize application' },
      { status: 500 }
    )
  }
}