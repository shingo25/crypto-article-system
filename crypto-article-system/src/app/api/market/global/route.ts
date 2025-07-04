import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // CoinGecko API から市場データを取得
    const globalResponse = await fetch('https://api.coingecko.com/api/v3/global', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      next: { revalidate: 300 } // 5分キャッシュ
    })

    if (!globalResponse.ok) {
      throw new Error(`CoinGecko API error: ${globalResponse.status}`)
    }

    const globalData = await globalResponse.json()

    // Fear & Greed Index も取得（オプション）
    let fearGreedIndex = 68 // デフォルト値
    try {
      const fearGreedResponse = await fetch('https://api.alternative.me/fng/', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        next: { revalidate: 3600 } // 1時間キャッシュ
      })

      if (fearGreedResponse.ok) {
        const fearGreedData = await fearGreedResponse.json()
        fearGreedIndex = parseInt(fearGreedData.data[0]?.value || fearGreedIndex)
      }
    } catch (error) {
      console.warn('Fear & Greed指数の取得に失敗:', error)
    }

    const result = {
      totalMarketCap: globalData.data.total_market_cap.usd / 1e12, // 兆ドル単位
      btcDominance: globalData.data.market_cap_percentage.btc,
      fearGreedIndex,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('グローバル市場データの取得に失敗:', error)
    
    // フォールバック値を返す
    const fallbackData = {
      totalMarketCap: 2.89,
      btcDominance: 52.3,
      fearGreedIndex: 68,
      lastUpdated: new Date().toISOString(),
      error: 'Using fallback data'
    }
    
    return NextResponse.json(fallbackData, { status: 200 }) // エラーでも200を返す
  }
}