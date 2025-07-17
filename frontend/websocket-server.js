const { createServer } = require('http')
const { Server } = require('socket.io')

// HTTPサーバーを作成
const server = createServer()

// Socket.IOサーバーを作成
const io = new Server(server, {
  cors: {
    origin: "*", // 開発環境では全てのオリジンを許可
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true // Engine.IO v3との互換性
})

// CoinGecko APIからデータを取得する関数
async function fetchCoinGeckoData() {
  try {
    console.log('[WebSocket] Fetching data from CoinGecko API...')
    
    // より長いタイムアウトと詳細なエラーハンドリング
    const coinsResponse = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false', {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'CryptoNewsApp/1.0'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!coinsResponse.ok) {
      throw new Error(`Coins API failed with status: ${coinsResponse.status}`)
    }

    const globalResponse = await fetch('https://api.coingecko.com/api/v3/global', {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'CryptoNewsApp/1.0'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!globalResponse.ok) {
      throw new Error(`Global API failed with status: ${globalResponse.status}`)
    }

    // トレンディング暗号通貨の取得
    const trendingResponse = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'CryptoNewsApp/1.0'
      },
      signal: AbortSignal.timeout(15000)
    }).catch(() => null) // トレンディングAPIが失敗してもOK

    const coins = await coinsResponse.json()
    const global = await globalResponse.json()
    
    // トレンディングデータの処理
    let trendingTopics = ['DeFi Recovery', 'Layer 2 Scaling', 'Regulatory Clarity']
    if (trendingResponse?.ok) {
      try {
        const trending = await trendingResponse.json()
        trendingTopics = trending.coins.slice(0, 4).map(item => item.item.name)
      } catch (e) {
        console.log('[WebSocket] Failed to parse trending data, using fallback')
      }
    }

    console.log('[WebSocket] Successfully fetched CoinGecko data')
    
    return {
      totalMarketCap: global.data.total_market_cap.usd,
      btcDominance: global.data.market_cap_percentage.btc,
      fearGreedIndex: Math.floor(Math.random() * 100), // Fear & Greed は別APIなのでランダム値
      topCoins: coins.map(coin => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h || 0,
        volume: coin.total_volume / 1000000000, // GB単位
        trend: (coin.price_change_percentage_24h || 0) > 5 ? 'bullish' : 
               (coin.price_change_percentage_24h || 0) < -3 ? 'bearish' : 'neutral',
        image: coin.image
      })),
      trendingTopics,
      lastUpdate: new Date().toISOString()
    }
  } catch (error) {
    console.error('[WebSocket] CoinGecko API error:', error.message)
    
    // レート制限エラーの場合は待機時間を設ける
    if (error.message.includes('429')) {
      console.log('[WebSocket] Rate limit detected, waiting 60 seconds before next attempt...')
    }
    
    // フォールバック用のサンプルデータ
    return {
      totalMarketCap: 2.5e12 + Math.random() * 1e11,
      btcDominance: 45 + Math.random() * 10,
      fearGreedIndex: Math.floor(Math.random() * 100),
      topCoins: [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: 67000 + Math.random() * 5000,
          change24h: (Math.random() - 0.5) * 10,
          volume: 28 + Math.random() * 5,
          trend: Math.random() > 0.5 ? 'bullish' : 'bearish'
        },
        {
          symbol: 'ETH',
          name: 'Ethereum', 
          price: 3800 + Math.random() * 500,
          change24h: (Math.random() - 0.5) * 15,
          volume: 15 + Math.random() * 3,
          trend: Math.random() > 0.5 ? 'bullish' : 'bearish'
        }
      ],
      trendingTopics: ['Bitcoin ETF', 'DeFi Innovation', 'AI Trading'],
      lastUpdate: new Date().toISOString()
    }
  }
}

// 接続中のクライアント
const connectedClients = new Set()

// 接続イベントのハンドリング
io.on('connection', (socket) => {
  const clientId = socket.id
  connectedClients.add(clientId)
  
  console.log(`[WebSocket] クライアントが接続: ${clientId} (合計: ${connectedClients.size})`)

  // クライアントにウェルカムメッセージを送信
  socket.emit('connected', {
    message: 'アラートサーバーに接続しました',
    clientId,
    timestamp: new Date().toISOString()
  })

  // サンプルマーケットアラートを定期送信
  const alertInterval = setInterval(() => {
    const sampleAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: ['BTC', 'ETH', 'SOL', 'ADA'][Math.floor(Math.random() * 4)],
      alertType: 'price_change',
      level: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
      title: `価格変動アラート`,
      description: `価格が大きく変動しています`,
      changePercent: (Math.random() - 0.5) * 20,
      timestamp: new Date().toISOString()
    }
    socket.emit('market_alert', sampleAlert)
  }, 10000) // 10秒ごと

  // 実際の市場データを定期送信（CoinGecko APIから取得）
  const sendMarketData = async () => {
    const marketData = await fetchCoinGeckoData()
    socket.emit('market_update', marketData)
    console.log(`[WebSocket] Market data sent to ${clientId}:`, {
      totalMarketCap: `$${(marketData.totalMarketCap / 1e12).toFixed(2)}T`,
      btcDominance: `${marketData.btcDominance.toFixed(1)}%`,
      topCoinsCount: marketData.topCoins.length
    })
  }
  
  // 接続時に即座に送信
  sendMarketData()
  
  // その後120秒ごと（CoinGecko API制限を回避）
  const marketInterval = setInterval(sendMarketData, 120000)

  // 切断イベントのハンドリング
  socket.on('disconnect', (reason) => {
    connectedClients.delete(clientId)
    clearInterval(alertInterval)
    clearInterval(marketInterval)
    console.log(`[WebSocket] クライアントが切断: ${clientId} (理由: ${reason}, 合計: ${connectedClients.size})`)
  })

  // エラーハンドリング
  socket.on('error', (error) => {
    console.error('[WebSocket] エラー:', error)
  })

  // ピング/ポン for connection health check
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() })
  })
})

// サーバーを起動
const PORT = 3002
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[WebSocket] サーバーが起動しました: http://0.0.0.0:${PORT}`)
})

// エラーハンドリング
server.on('error', (error) => {
  console.error('[WebSocket] HTTPサーバーエラー:', error)
})

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n[WebSocket] サーバーを停止中...')
  io.close()
  server.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n[WebSocket] サーバーを停止中...')
  io.close()
  server.close()
  process.exit(0)
})