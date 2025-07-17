const { io } = require('socket.io-client');

console.log('Socket.IOクライアントテストを開始...');

const socket = io('http://localhost:3002', {
  transports: ['polling', 'websocket'],
  timeout: 10000,
  forceNew: true,
  autoConnect: true
});

socket.on('connect', () => {
  console.log('✅ WebSocketサーバーに接続成功:', socket.id);
});

socket.on('connected', (data) => {
  console.log('📩 サーバーからのメッセージ:', data);
});

socket.on('market_alert', (alert) => {
  console.log('🚨 アラート受信:', alert);
});

socket.on('connect_error', (error) => {
  console.error('❌ 接続エラー:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('👋 切断:', reason);
});

// 10秒後に切断
setTimeout(() => {
  socket.disconnect();
  console.log('テスト完了');
  process.exit(0);
}, 10000);