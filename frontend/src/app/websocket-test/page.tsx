'use client'

// 動的レンダリングを強制（プリレンダリングエラー回避）
export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'

export default function WebSocketTestPage() {
  const { 
    isConnected, 
    alerts, 
    marketData, 
    systemStats,
    connectionError,
    dismissAlert,
    reconnect 
  } = useWebSocket()

  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: 接続状態 = ${isConnected}`])
  }, [isConnected])

  useEffect(() => {
    if (connectionError) {
      setLogs(prev => [...prev, `${new Date().toISOString()}: エラー = ${connectionError}`])
    }
  }, [connectionError])

  useEffect(() => {
    if (alerts.length > 0) {
      setLogs(prev => [...prev, `${new Date().toISOString()}: アラート受信 = ${alerts[0].title}`])
    }
  }, [alerts])

  useEffect(() => {
    if (marketData) {
      setLogs(prev => [...prev, `${new Date().toISOString()}: 市場データ受信 = ${marketData.topCoins.length}件のコイン`])
    }
  }, [marketData])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-blue-400">WebSocket接続テスト</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 接続状態 */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">接続状態</h2>
            <div className="space-y-2">
              <div className={`p-2 rounded ${isConnected ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                接続: {isConnected ? '✅ 接続済み' : '❌ 未接続'}
              </div>
              {connectionError && (
                <div className="p-2 rounded bg-red-900/50 text-red-400">
                  エラー: {connectionError}
                </div>
              )}
              <button 
                onClick={reconnect}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
              >
                再接続
              </button>
            </div>
          </div>

          {/* アラート */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">アラート ({alerts.length})</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {alerts.map(alert => (
                <div key={alert.id} className="p-2 bg-gray-800 rounded">
                  <div className="text-sm text-blue-400">{alert.symbol}</div>
                  <div className="text-white">{alert.title}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 市場データ */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">市場データ</h2>
            {marketData ? (
              <div className="space-y-2">
                <div>時価総額: ${marketData.totalMarketCap}T</div>
                <div>BTC優勢度: {marketData.btcDominance}%</div>
                <div>Fear & Greed: {marketData.fearGreedIndex}</div>
                <div>TOP暗号通貨: {marketData.topCoins.length}件</div>
                <div className="text-xs text-gray-400">
                  最終更新: {new Date(marketData.lastUpdate).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <div className="text-gray-400">データなし</div>
            )}
          </div>

          {/* システム統計 */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">システム統計</h2>
            {systemStats ? (
              <div className="space-y-2">
                <div>今日のアラート: {systemStats.alertsToday}</div>
                <div>データ収集: {systemStats.dataCollectionStatus}</div>
                <div>接続クライアント: {systemStats.connectedClients}</div>
                <div className="text-xs text-gray-400">
                  最終収集: {new Date(systemStats.lastCollection).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <div className="text-gray-400">統計なし</div>
            )}
          </div>
        </div>

        {/* ログ */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">接続ログ</h2>
          <div className="bg-black rounded p-4 max-h-60 overflow-y-auto font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="text-green-400">
                {log}
              </div>
            ))}
          </div>
          <button 
            onClick={() => setLogs([])}
            className="mt-2 bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-white text-sm"
          >
            ログクリア
          </button>
        </div>
      </div>
    </div>
  )
}