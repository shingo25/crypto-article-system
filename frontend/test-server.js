const http = require('http');

const hostname = '0.0.0.0';  // 全インターフェースでバインド
const port = 8080;

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`
    <\!DOCTYPE html>
    <html>
    <head>
        <title>Node.js Test Server</title>
        <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>🎉 Node.js Test Server</h1>
        <p><strong>接続成功！</strong></p>
        <p>時刻: ${new Date().toLocaleString('ja-JP')}</p>
        <p>URL: ${req.url}</p>
        <p>User-Agent: ${req.headers['user-agent']}</p>
        <hr>
        <p>このページが表示されれば、Node.jsサーバーは正常に動作しています。</p>
    </body>
    </html>
  `);
});

server.listen(port, hostname, () => {
  console.log(`Test server running at http://${hostname}:${port}/`);
  console.log('ブラウザで以下のURLにアクセスしてテストしてください:');
  console.log(`  http://localhost:${port}`);
  console.log(`  http://127.0.0.1:${port}`);
});

server.on('error', (e) => {
  console.error(`Server error: ${e.message}`);
});
