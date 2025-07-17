import { NextRequest, NextResponse } from 'next/server'
import { MarketDataAPI } from '@/lib/market-data'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('MarketPricesAPI')

// 暗号通貨価格データ取得
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const symbols = searchParams.get('symbols')?.split(',')

    componentLogger.info('暗号通貨価格データを取得中', { limit, symbols })

    let cryptoData
    
    if (symbols && symbols.length > 0) {
      // 特定のシンボルのデータを取得
      const allData = await MarketDataAPI.getTopCryptocurrencies(200)
      cryptoData = allData.filter(crypto => 
        symbols.some(symbol => 
          crypto.symbol.toLowerCase() === symbol.toLowerCase() ||
          crypto.id.toLowerCase() === symbol.toLowerCase()
        )
      )
    } else {
      // トップ暗号通貨を取得
      cryptoData = await MarketDataAPI.getTopCryptocurrencies(limit)
    }

    componentLogger.performance('暗号通貨価格データ取得', Date.now() - startTime, {
      count: cryptoData.length,
      limit,
      symbols: symbols?.length || 0
    })

    return NextResponse.json({
      success: true,
      data: cryptoData,
      meta: {
        count: cryptoData.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    componentLogger.error('暗号通貨価格データの取得に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to fetch cryptocurrency prices', {
      type: ErrorType.EXTERNAL_SERVICE_ERROR,
      statusCode: 500,
      userMessage: '暗号通貨価格データの取得に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}