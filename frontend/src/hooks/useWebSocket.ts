import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { createComponentLogger } from '@/lib/simple-logger'

const componentLogger = createComponentLogger('WebSocketHook')

// WebSocketイベントの型定義
export interface MarketAlert {
  id: string
  symbol: string
  alertType: string
  level: 'high' | 'medium' | 'low'
  title: string
  description: string
  changePercent?: number
  timeframe?: string
  volume?: number
  details: Record<string, any>
  timestamp: string
}

export interface MarketUpdate {
  totalMarketCap: number
  btcDominance: number
  fearGreedIndex: number | null
  topCoins: Array<{
    symbol: string
    name: string
    price: number
    change24h: number
    volume: number
    image?: string
    trend: 'bullish' | 'bearish' | 'neutral'
  }>
  lastUpdate: string
}

export interface SystemStats {
  alertsToday: number
  dataCollectionStatus: 'active' | 'error' | 'stopped'
  lastCollection: string
  connectedClients: number
  timestamp: string
}

// WebSocketフック
export function useWebSocket(url: string = 'http://localhost:3002') {
  const [isConnected, setIsConnected] = useState(false)
  const [alerts, setAlerts] = useState<MarketAlert[]>([])
  const [marketData, setMarketData] = useState<MarketUpdate | null>(null)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  const socketRef = useRef<Socket | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 2 // 接続試行回数を減らす

  useEffect(() => {
    // WebSocket接続を初期化（開発環境では無効化可能）
    const initializeSocket = () => {
      try {
        // 環境変数でWebSocketを無効化できる（コメントアウトして強制的に接続を試行）
        // if (process.env.NEXT_PUBLIC_DISABLE_WEBSOCKET === 'true') {
        //   componentLogger.info('WebSocketが無効化されています（環境変数による）')
        //   setConnectionError('WebSocket接続が無効化されています')
        //   return
        // }
        
        componentLogger.info('WebSocket接続を初期化', { url })
        
        socketRef.current = io(url, {
          transports: ['polling', 'websocket'], // pollingを先に試行
          timeout: 10000, // タイムアウトを延長
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5, // 試行回数を増やす
          forceNew: true,
          autoConnect: true,
          upgrade: true, // アップグレードを有効化
          rememberUpgrade: false
        })

        const socket = socketRef.current

        // 接続成功
        socket.on('connect', () => {
          setIsConnected(true)
          setConnectionError(null)
          reconnectAttempts.current = 0
          componentLogger.info('WebSocketに接続しました', { socketId: socket.id })
        })

        // 接続確認
        socket.on('connected', (data) => {
          componentLogger.info('サーバーから接続確認', data)
        })

        // アラート受信
        socket.on('market_alert', (alert: MarketAlert) => {
          componentLogger.info('新しいアラートを受信', { 
            alertId: alert.id, 
            symbol: alert.symbol, 
            level: alert.level 
          })
          
          setAlerts(prev => {
            // 最新のアラートを先頭に追加、20件まで保持
            const newAlerts = [alert, ...prev].slice(0, 20)
            return newAlerts
          })
        })

        // 市場データ更新受信
        socket.on('market_update', (data: MarketUpdate) => {
          componentLogger.info('市場データ更新を受信')
          setMarketData(data)
        })

        // システム統計受信
        socket.on('system_stats', (stats: SystemStats) => {
          setSystemStats(stats)
        })

        // 切断
        socket.on('disconnect', (reason) => {
          setIsConnected(false)
          componentLogger.warn('WebSocketが切断されました', { reason })
          
          if (reason === 'io server disconnect') {
            // サーバーから切断された場合は手動で再接続
            socket.connect()
          }
        })

        // エラー処理
        socket.on('connect_error', (error) => {
          setConnectionError(error.message)
          reconnectAttempts.current++
          
          // WebSocketサーバーが利用できない場合は警告レベルに下げる
          if (error.message.includes('xhr poll error') || error.message.includes('timeout')) {
            componentLogger.warn('WebSocketサーバーに接続できません（オフラインモードで継続）', {
              attempt: reconnectAttempts.current,
              maxAttempts: maxReconnectAttempts,
              error: error.message
            })
          } else {
            componentLogger.error('WebSocket接続エラー', error, {
              attempt: reconnectAttempts.current,
              maxAttempts: maxReconnectAttempts
            })
          }

          if (reconnectAttempts.current >= maxReconnectAttempts) {
            setConnectionError('WebSocketサーバーに接続できません。オフラインモードで動作中です。')
            // 最大試行回数に達したら自動接続を停止
            socket.disconnect()
          }
        })

        // Ping/Pongでヘルスチェック
        const pingInterval = setInterval(() => {
          if (socket.connected) {
            socket.emit('ping')
          }
        }, 30000) // 30秒間隔

        socket.on('pong', (data) => {
          // Pongを受信したらサーバーは正常
        })

        return () => {
          clearInterval(pingInterval)
        }

      } catch (error) {
        componentLogger.error('WebSocket初期化に失敗', error as Error)
        setConnectionError('WebSocket接続の初期化に失敗しました')
      }
    }

    const cleanup = initializeSocket()

    return () => {
      if (cleanup) cleanup()
      if (socketRef.current) {
        componentLogger.info('WebSocket接続をクリーンアップ')
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [url])

  // アラートを既読にする
  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  // 手動でWebSocket再接続
  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.connect()
      reconnectAttempts.current = 0
      setConnectionError(null)
    }
  }

  // WebSocketでメッセージを送信
  const sendMessage = (event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    } else {
      componentLogger.warn('WebSocketが接続されていません', { event, data })
    }
  }

  return {
    isConnected,
    alerts,
    marketData,
    systemStats,
    connectionError,
    dismissAlert,
    reconnect,
    sendMessage
  }
}