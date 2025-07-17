#!/usr/bin/env tsx

/**
 * 緊急マーケットアラートシステム起動スクリプト
 * 
 * このスクリプトは以下を実行します：
 * 1. WebSocketサーバーの起動
 * 2. 定期データ収集の開始
 * 3. アラート検出の開始
 * 4. システム統計の送信
 */

import { alertIntegrationService } from '../lib/alert-integration-service'
import { createComponentLogger } from '../lib/simple-logger'

const componentLogger = createComponentLogger('AlertSystemStarter')

async function startAlertSystem() {
  try {
    componentLogger.info('緊急マーケットアラートシステムを起動します...')
    
    // アラートシステムを開始
    await alertIntegrationService.startSystem()
    
    componentLogger.info('✅ アラートシステムが正常に起動しました')
    componentLogger.info('🌐 WebSocketサーバー: http://localhost:3002')
    componentLogger.info('📊 データ収集間隔: 5分')
    componentLogger.info('🚨 アラート検出間隔: 1分')
    componentLogger.info('📈 システム統計送信間隔: 30秒')
    
    // Graceful shutdown の設定
    process.on('SIGINT', () => {
      componentLogger.info('システム終了シグナルを受信しました...')
      alertIntegrationService.stopSystem()
      process.exit(0)
    })
    
    process.on('SIGTERM', () => {
      componentLogger.info('システム終了シグナルを受信しました...')
      alertIntegrationService.stopSystem()
      process.exit(0)
    })
    
    // システム状態の定期ログ出力
    setInterval(() => {
      const status = alertIntegrationService.getSystemStatus()
      componentLogger.info('システム状態', status)
    }, 60000) // 1分間隔
    
  } catch (error) {
    componentLogger.error('アラートシステムの起動に失敗しました', error as Error)
    process.exit(1)
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  startAlertSystem()
}

export { startAlertSystem }