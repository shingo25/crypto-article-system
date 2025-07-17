const http = require('http');

const hostname = '127.0.0.1';
const port = 8080;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World\n');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
  console.log('Check if this process is listening on the port.');
});

server.on('error', (e) => {
  console.error(`Server error: ${e.message}`);
});

// 強制的に5秒後に終了
setTimeout(() => {
  console.log('Closing server...');
  server.close();
  process.exit(0);
}, 5000);