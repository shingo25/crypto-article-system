import { NextRequest, NextResponse } from 'next/server'

// タイムアウト付きfetch関数
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

export async function GET(_request: NextRequest) {
  try {
    // CoinGecko API から市場データを取得（タイムアウト8秒）
    const globalResponse = await fetchWithTimeout('https://api.coingecko.com/api/v3/global', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'CryptoArticleSystem/1.0'
      },
      cache: 'force-cache',
      next: { revalidate: 300 } // 5分キャッシュ
    }, 8000)

    if (!globalResponse.ok) {
      throw new Error(`CoinGecko API error: ${globalResponse.status} ${globalResponse.statusText}`)
    }

    const globalData = await globalResponse.json()

    // Fear & Greed Index も取得（オプション、タイムアウト5秒）
    let fearGreedIndex = 68 // デフォルト値
    try {
      const fearGreedResponse = await fetchWithTimeout('https://api.alternative.me/fng/', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'CryptoArticleSystem/1.0'
        },
        cache: 'force-cache',
        next: { revalidate: 3600 } // 1時間キャッシュ
      }, 5000)

      if (fearGreedResponse.ok) {
        const fearGreedData = await fearGreedResponse.json()
        fearGreedIndex = parseInt(fearGreedData.data[0]?.value || fearGreedIndex)
      }
    } catch (error) {
      console.warn('Fear & Greed指数の取得に失敗:', error)
      // フォールバック値を維持
    }

    const result = {
      totalMarketCap: globalData.data.total_market_cap.usd / 1e12, // 兆ドル単位
      btcDominance: globalData.data.market_cap_percentage.btc,
      fearGreedIndex,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('グローバル市場データの取得に失敗:', {
      component: 'MarketData',
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // フォールバック値を返す
    const fallbackData = {
      totalMarketCap: 2.89,
      btcDominance: 52.3,
      fearGreedIndex: 68,
      lastUpdated: new Date().toISOString(),
      error: 'Using fallback data',
      errorReason: errorMessage,
      isFallback: true
    }
    
    return NextResponse.json(fallbackData, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0'
      }
    }) // エラーでも200を返すが、キャッシュしない
  }
}