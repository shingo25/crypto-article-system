import { NextRequest, NextResponse } from 'next/server'
import { MarketDataAPI } from '@/lib/market-data'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('MarketHistoryAPI')

// 価格履歴データ取得
export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const coinId = searchParams.get('coinId')
    const days = parseInt(searchParams.get('days') || '7')

    if (!coinId) {
      throw new AppError('Coin ID is required', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'MISSING_COIN_ID',
        statusCode: 400,
        userMessage: 'コインIDが必要です'
      })
    }

    if (days < 1 || days > 365) {
      throw new AppError('Days must be between 1 and 365', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'INVALID_DAYS_RANGE',
        statusCode: 400,
        userMessage: '日数は1から365の間で指定してください'
      })
    }

    componentLogger.info('価格履歴データを取得中', { coinId, days })

    const priceHistory = await MarketDataAPI.getPriceHistory(coinId, days)

    componentLogger.performance('価格履歴データ取得', Date.now() - startTime, {
      coinId,
      days,
      dataPoints: priceHistory.length
    })

    return NextResponse.json({
      success: true,
      data: {
        coinId,
        days,
        history: priceHistory
      },
      meta: {
        dataPoints: priceHistory.length,
        startDate: priceHistory.length > 0 ? new Date(priceHistory[0].timestamp).toISOString() : null,
        endDate: priceHistory.length > 0 ? new Date(priceHistory[priceHistory.length - 1].timestamp).toISOString() : null,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    componentLogger.error('価格履歴データの取得に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to fetch price history', {
      type: ErrorType.EXTERNAL_SERVICE_ERROR,
      statusCode: 500,
      userMessage: '価格履歴データの取得に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}