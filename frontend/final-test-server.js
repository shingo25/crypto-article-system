const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(`
    <\!DOCTYPE html>
    <html>
    <head>
        <title>FINAL TEST - 接続成功！</title>
        <meta charset="utf-8">
        <meta http-equiv="cache-control" content="no-cache">
    </head>
    <body style="font-family: Arial, sans-serif; padding: 20px; background: #f0f8ff;">
        <h1 style="color: #006400;">🎉 接続成功！</h1>
        <p><strong>おめでとうございます！ブラウザからNode.jsサーバーに正常に接続できました。</strong></p>
        <p>時刻: ${new Date().toLocaleString('ja-JP')}</p>
        <p>アクセスURL: ${req.url}</p>
        <hr>
        <h2>Next.js テストリンク:</h2>
        <p><a href="http://localhost:3000" style="color: blue; text-decoration: underline;">Next.js アプリケーション (Port 3000)</a></p>
        <p><a href="http://127.0.0.1:3000" style="color: blue; text-decoration: underline;">Next.js アプリケーション (IP直指定)</a></p>
    </body>
    </html>
  `);
});

server.listen(8888, '0.0.0.0', () => {
  console.log('Final test server running on port 8888');
});
