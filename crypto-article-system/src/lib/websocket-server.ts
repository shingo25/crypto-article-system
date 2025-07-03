import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { createComponentLogger } from './simple-logger'
import { DetectedAlert } from './alert-detection-service'

const componentLogger = createComponentLogger('WebSocketServer')

// WebSocketサーバークラス
export class AlertWebSocketServer {
  private static instance: AlertWebSocketServer
  private io: SocketServer | null = null
  private server: any = null
  private connectedClients: Set<string> = new Set()

  private constructor() {}

  public static getInstance(): AlertWebSocketServer {
    if (!AlertWebSocketServer.instance) {
      AlertWebSocketServer.instance = new AlertWebSocketServer()
    }
    return AlertWebSocketServer.instance
  }

  // WebSocketサーバーを開始
  public startServer(port: number = 3001): void {
    try {
      // HTTPサーバーを作成
      this.server = createServer()
      
      // Socket.IOサーバーを作成
      this.io = new SocketServer(this.server, {
        cors: {
          origin: "*", // 開発環境では全てのオリジンを許可
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true // Engine.IO v3との互換性
      })

      // 接続イベントのハンドリング
      this.io.on('connection', (socket) => {
        const clientId = socket.id
        this.connectedClients.add(clientId)
        
        componentLogger.info('クライアントが接続', { 
          clientId, 
          totalClients: this.connectedClients.size 
        })

        // クライアントにウェルカムメッセージを送信
        socket.emit('connected', {
          message: 'アラートサーバーに接続しました',
          clientId,
          timestamp: new Date().toISOString()
        })

        // 切断イベントのハンドリング
        socket.on('disconnect', (reason) => {
          this.connectedClients.delete(clientId)
          componentLogger.info('クライアントが切断', { 
            clientId, 
            reason, 
            totalClients: this.connectedClients.size 
          })
        })

        // エラーハンドリング
        socket.on('error', (error) => {
          componentLogger.error('WebSocketエラー', error as Error)
        })

        // ピング/ポン for connection health check
        socket.on('ping', () => {
          socket.emit('pong', { timestamp: new Date().toISOString() })
        })
      })

      // サーバーを起動
      this.server.listen(port, '0.0.0.0', () => {
        componentLogger.info(`WebSocketサーバーが起動`, { port, host: '0.0.0.0' })
      })

      // エラーハンドリング
      this.server.on('error', (error) => {
        componentLogger.error('HTTPサーバーエラー', error as Error)
      })

    } catch (error) {
      componentLogger.error('WebSocketサーバー起動に失敗', error as Error)
      throw error
    }
  }

  // アラートを全クライアントにブロードキャスト
  public broadcastAlert(alert: DetectedAlert): void {
    if (!this.io) {
      componentLogger.warn('WebSocketサーバーが未初期化')
      return
    }

    try {
      const alertMessage = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...alert,
        timestamp: alert.timestamp.toISOString()
      }

      this.io.emit('market_alert', alertMessage)
      
      componentLogger.info('アラートをブロードキャスト', {
        alertId: alertMessage.id,
        symbol: alert.symbol,
        level: alert.level,
        clients: this.connectedClients.size
      })
    } catch (error) {
      componentLogger.error('アラートブロードキャストに失敗', error as Error)
    }
  }

  // 複数のアラートを一括ブロードキャスト
  public broadcastAlerts(alerts: DetectedAlert[]): void {
    if (alerts.length === 0) return

    alerts.forEach(alert => {
      this.broadcastAlert(alert)
    })

    componentLogger.info('複数アラートをブロードキャスト', { 
      count: alerts.length,
      clients: this.connectedClients.size 
    })
  }

  // 市場データ更新をブロードキャスト
  public broadcastMarketUpdate(data: {
    totalMarketCap: number
    btcDominance: number
    fearGreedIndex: number | null
    topCoins: any[]
    lastUpdate: string
  }): void {
    if (!this.io) return

    try {
      this.io.emit('market_update', data)
      componentLogger.info('市場データ更新をブロードキャスト', {
        clients: this.connectedClients.size
      })
    } catch (error) {
      componentLogger.error('市場データブロードキャストに失敗', error as Error)
    }
  }

  // システム統計を送信
  public broadcastSystemStats(stats: {
    alertsToday: number
    dataCollectionStatus: 'active' | 'error' | 'stopped'
    lastCollection: string
    connectedClients: number
  }): void {
    if (!this.io) return

    try {
      const systemStats = {
        ...stats,
        connectedClients: this.connectedClients.size,
        timestamp: new Date().toISOString()
      }

      this.io.emit('system_stats', systemStats)
    } catch (error) {
      componentLogger.error('システム統計ブロードキャストに失敗', error as Error)
    }
  }

  // 接続中のクライアント数を取得
  public getConnectedClientsCount(): number {
    return this.connectedClients.size
  }

  // サーバーを停止
  public stopServer(): void {
    try {
      if (this.io) {
        this.io.close()
        this.io = null
      }
      
      if (this.server) {
        this.server.close()
        this.server = null
      }

      this.connectedClients.clear()
      componentLogger.info('WebSocketサーバーを停止')
    } catch (error) {
      componentLogger.error('WebSocketサーバー停止に失敗', error as Error)
    }
  }
}

// シングルトンインスタンス
export const alertWebSocketServer = AlertWebSocketServer.getInstance()