import { NextRequest, NextResponse } from 'next/server'
import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { createComponentLogger } from '@/lib/simple-logger'

const componentLogger = createComponentLogger('SocketAPI')

// Socket.IOサーバーの型拡張
interface SocketServer extends NetServer {
  io?: SocketIOServer
}

// WebSocketサーバーの初期化
function initializeWebSocketServer(server: SocketServer) {
  if (!server.io) {
    componentLogger.info('Socket.IOサーバーを初期化')
    
    server.io = new SocketIOServer(server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    })

    server.io.on('connection', (socket) => {
      const clientId = socket.id
      componentLogger.info('クライアントが接続', { clientId })

      // ウェルカムメッセージ
      socket.emit('connected', {
        message: 'Socket.IOサーバーに接続しました',
        clientId,
        timestamp: new Date().toISOString()
      })

      // テストアラートを送信
      setTimeout(() => {
        socket.emit('market_alert', {
          id: `alert_${Date.now()}`,
          symbol: 'BTC',
          alertType: 'price_change',
          level: 'high',
          title: 'テストアラート: ビットコインが急騰',
          description: 'WebSocket統合テスト用のアラートです',
          changePercent: 8.5,
          timeframe: '1h',
          details: { test: true },
          timestamp: new Date().toISOString()
        })
        componentLogger.info('テストアラートを送信', { clientId })
      }, 2000)

      // 市場データ更新を送信
      setTimeout(() => {
        socket.emit('market_update', {
          totalMarketCap: 3.5,
          btcDominance: 62.2,
          fearGreedIndex: 65,
          topCoins: [
            {
              symbol: 'BTC',
              name: 'Bitcoin',
              price: 109558,
              change24h: 3.11,
              volume: 32.3,
              image: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png',
              trend: 'bullish'
            },
            {
              symbol: 'ETH',
              name: 'Ethereum',
              price: 2580,
              change24h: 6.30,
              volume: 17.8,
              image: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png',
              trend: 'bullish'
            }
          ],
          lastUpdate: new Date().toISOString()
        })
        componentLogger.info('市場データを送信', { clientId })
      }, 4000)

      // 切断処理
      socket.on('disconnect', (reason) => {
        componentLogger.info('クライアントが切断', { clientId, reason })
      })

      // Ping/Pong
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() })
      })
    })

    componentLogger.info('Socket.IOサーバーが初期化されました')
  }
}

// Socket.IOエンドポイント - GET/POSTで初期化
export async function GET(_request: NextRequest) {
  try {
    // Next.js環境では外部WebSocketサーバーの利用を推奨
    return NextResponse.json({
      success: true,
      message: 'WebSocketサーバーは外部で動作中です',
      websocketUrl: 'http://localhost:3002',
      path: '/api/socket',
      note: 'Next.js App Routerでは外部Socket.IOサーバーを推奨'
    })
  } catch (error) {
    componentLogger.error('Socket.IO情報取得エラー', error as Error)
    return NextResponse.json({
      success: false,
      error: 'Socket.IO情報の取得に失敗しました'
    }, { status: 500 })
  }
}

export async function POST(_request: NextRequest) {
  return GET(request)
}