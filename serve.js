// Keysong · tiny zero-dependency static server.  Usage: node serve.js [port]
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = __dirname;
const port = Number(process.argv[2] || process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.md': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end('bad request'); }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('nope'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
});

server.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? `Port ${port} is busy. Try: node serve.js ${port + 1}` : e.message);
  process.exit(1);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`\n  🌷 Keysong is singing at http://localhost:${port}`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log(`     on your network:   http://${a.address}:${port}`);
  }
  console.log('');
});
