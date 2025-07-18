const { createServer } = require('http')
const { Server } = require('socket.io')

// 簡単なテスト用WebSocketサーバー
const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

io.on('connection', (socket) => {
  console.log('🎉 クライアントが接続しました:', socket.id)
  
  socket.emit('connected', {
    message: 'テストサーバーに接続成功',
    timestamp: new Date().toISOString()
  })
  
  socket.on('disconnect', () => {
    console.log('👋 クライアントが切断しました:', socket.id)
  })
  
  // テスト用のアラート送信
  setTimeout(() => {
    socket.emit('market_alert', {
      id: 'test-alert-1',
      symbol: 'BTC',
      alertType: 'price_change',
      level: 'high',
      title: 'テストアラート: ビットコインが急騰',
      description: 'これはWebSocket接続テスト用のアラートです',
      changePercent: 5.2,
      timeframe: '1h',
      details: { test: true },
      timestamp: new Date().toISOString()
    })
    console.log('📨 テストアラートを送信しました')
  }, 2000)
})

const PORT = 3002
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 テスト用WebSocketサーバーが起動: http://0.0.0.0:${PORT}`)
})

httpServer.on('error', (error) => {
  console.error('❌ サーバーエラー:', error)
})