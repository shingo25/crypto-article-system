import { NextRequest, NextResponse } from 'next/server'
import { MarketDataAPI } from '@/lib/market-data'
import { createComponentLogger } from '@/lib/simple-logger'
import { formatApiError, AppError, ErrorType } from '@/lib/error-handler'

const componentLogger = createComponentLogger('MarketTrendsAPI')

// 市場トレンド分析データ取得
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const symbolsParam = searchParams.get('symbols')
    
    // デフォルトの分析対象
    const defaultSymbols = ['bitcoin', 'ethereum', 'cardano', 'polkadot', 'chainlink', 'solana', 'avalanche-2', 'polygon']
    
    const symbols = symbolsParam 
      ? symbolsParam.split(',').map(s => s.trim().toLowerCase())
      : defaultSymbols

    if (symbols.length > 20) {
      throw new AppError('Too many symbols requested', {
        type: ErrorType.VALIDATION_ERROR,
        code: 'TOO_MANY_SYMBOLS',
        statusCode: 400,
        userMessage: '一度に分析できるシンボルは20個までです'
      })
    }

    componentLogger.info('市場トレンド分析を開始', { symbols, count: symbols.length })

    const trends = await MarketDataAPI.analyzeMarketTrends(symbols)

    // トレンド統計を計算
    const trendStats = {
      total: trends.length,
      bullish: trends.filter(t => t.direction === 'up').length,
      bearish: trends.filter(t => t.direction === 'down').length,
      neutral: trends.filter(t => t.direction === 'stable').length,
      averageStrength: trends.length > 0 
        ? trends.reduce((sum, t) => sum + t.strength, 0) / trends.length 
        : 0,
      strongTrends: trends.filter(t => t.strength > 70).length,
      weakTrends: trends.filter(t => t.strength < 30).length
    }

    // RSI統計
    const rsiStats = {
      overbought: trends.filter(t => t.indicators.rsi > 70).length, // 買われすぎ
      oversold: trends.filter(t => t.indicators.rsi < 30).length,   // 売られすぎ
      average: trends.length > 0 
        ? trends.reduce((sum, t) => sum + t.indicators.rsi, 0) / trends.length 
        : 50
    }

    componentLogger.performance('市場トレンド分析完了', Date.now() - startTime, {
      symbolsAnalyzed: trends.length,
      bullishCount: trendStats.bullish,
      bearishCount: trendStats.bearish
    })

    return NextResponse.json({
      success: true,
      data: {
        trends,
        statistics: {
          trend: trendStats,
          rsi: rsiStats,
          marketSentiment: trendStats.bullish > trendStats.bearish ? 'bullish' : 
                          trendStats.bearish > trendStats.bullish ? 'bearish' : 'neutral'
        }
      },
      meta: {
        symbolsRequested: symbols,
        symbolsAnalyzed: trends.length,
        timestamp: new Date().toISOString(),
        analysisTimeframe: '24h'
      }
    })

  } catch (error) {
    componentLogger.error('市場トレンド分析に失敗', error as Error, {
      duration: Date.now() - startTime
    })

    if (error instanceof AppError) {
      return NextResponse.json(formatApiError(error), { status: error.statusCode })
    }

    const appError = new AppError('Failed to analyze market trends', {
      type: ErrorType.EXTERNAL_SERVICE_ERROR,
      statusCode: 500,
      userMessage: '市場トレンド分析に失敗しました'
    })

    return NextResponse.json(formatApiError(appError), { status: 500 })
  }
}