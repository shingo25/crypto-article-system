const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(`
    <\!DOCTYPE html>
    <html><head><title>Test Server Port 8080</title></head>
    <body style="font-family: Arial; padding: 20px;">
      <h1>🚀 Port 8080 Test Server</h1>
      <p><strong>接続成功！</strong> ポート8080は正常に動作しています。</p>
      <p>時刻: ${new Date().toLocaleString('ja-JP')}</p>
      <hr>
      <p><a href="http://localhost:3000">Next.js (Port 3000) へのリンク</a></p>
    </body></html>
  `);
});

server.listen(8080, '0.0.0.0', () => {
  console.log(`Server running on port 8080`);
});
