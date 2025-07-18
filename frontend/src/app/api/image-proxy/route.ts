import { NextRequest, NextResponse } from 'next/server'

/**
 * 画像プロキシ API
 * 外部画像を安全に読み込むためのプロキシエンドポイント
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    // URL の検証
    let url: URL
    try {
      url = new URL(imageUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      )
    }

    // 許可されたホストの確認
    const allowedHosts = [
      'images.cointelegraph.com',
      'www.coindesk.com',
      'static.coindesk.com',
      'cloudfront-us-east-1.images.arcpublishing.com',
      'media.cointelegraph.com',
      'pbs.twimg.com',
      'abs.twimg.com',
      'coin-images.coingecko.com'
    ]

    if (!allowedHosts.includes(url.hostname)) {
      return NextResponse.json(
        { error: 'Host not allowed' },
        { status: 403 }
      )
    }

    // 外部画像を取得
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
        'Accept': 'image/*'
      },
      // 5秒でタイムアウト
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: response.status }
      )
    }

    // Content-Type の確認
    const contentType = response.headers.get('content-type')
    if (!contentType?.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      )
    }

    // 画像データを取得
    const imageBuffer = await response.arrayBuffer()

    // レスポンスヘッダーを設定
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=3600') // 1時間キャッシュ
    headers.set('Content-Length', imageBuffer.byteLength.toString())

    return new NextResponse(imageBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Image proxy error:', error)
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}